import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { AppUser, PagedResponse } from '../../core/models/api.models';
import { CircleMember, CircleRequest } from '../../core/models/circle.models';
import { ApiService } from '../../core/services/api.service';
import { CircleService } from '../../core/services/circle.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { apiErrorMessage } from '../../core/utils/api-error';

/**
 * Family & friends circles. A circle is mutual: a request is sent to a user and only becomes a
 * circle once the other person accepts. Messaging between circle members can be restricted by the
 * backend, so this page is where those links are made and broken.
 */
@Component({
  selector: 'app-circles',
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe],
  templateUrl: './circles.component.html',
  styleUrl: './circles.component.css'
})
export class CirclesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly circles = inject(CircleService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  members: CircleMember[] = [];
  incoming: CircleRequest[] = [];
  outgoing: CircleRequest[] = [];

  loading = false;
  loadFailed = false;
  busyIds = new Set<number>();

  searchTerm = '';
  searching = false;
  searchResults: AppUser[] = [];
  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.load();

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (trimmed.length < 2) {
            this.searching = false;
            return of<PagedResponse<AppUser> | AppUser[]>([]);
          }
          this.searching = true;
          return this.api.users(0, 20, trimmed, 'name', 'asc').pipe(
            catchError(() => of<PagedResponse<AppUser> | AppUser[]>([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.searchResults = Array.isArray(result) ? result : result.content;
        this.searching = false;
      });
  }

  load(): void {
    this.loading = true;
    this.loadFailed = false;
    this.circles.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.members = response?.circles ?? [];
        this.incoming = response?.incomingRequests ?? [];
        this.outgoing = response?.outgoingRequests ?? [];
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.loadFailed = true;
        this.toast.error(apiErrorMessage(error, 'Unable to load your circle right now.'));
      }
    });
  }

  onSearchChange(term: string): void {
    this.search$.next(term);
  }

  /** True when the user is already a member or has a request in either direction. */
  relationFor(userId: number): 'member' | 'incoming' | 'outgoing' | 'none' {
    if (this.members.some((member) => member.userId === userId)) return 'member';
    if (this.incoming.some((request) => request.userId === userId)) return 'incoming';
    if (this.outgoing.some((request) => request.userId === userId)) return 'outgoing';
    return 'none';
  }

  sendRequest(user: AppUser): void {
    if (this.busyIds.has(user.id)) return;
    this.busyIds.add(user.id);
    this.circles.sendRequest(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyIds.delete(user.id);
        this.toast.success(`Request sent to ${user.name}.`);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.busyIds.delete(user.id);
        this.toast.error(apiErrorMessage(error, 'Unable to send the request right now.'));
      }
    });
  }

  accept(request: CircleRequest): void {
    if (this.busyIds.has(request.circleId)) return;
    this.busyIds.add(request.circleId);
    this.circles.accept(request.circleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyIds.delete(request.circleId);
        this.toast.success(`${request.name} is now in your circle.`);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.busyIds.delete(request.circleId);
        this.toast.error(apiErrorMessage(error, 'Unable to accept the request right now.'));
      }
    });
  }

  reject(request: CircleRequest): void {
    this.confirmDialog
      .confirm({
        title: 'Reject request',
        message: `Reject the circle request from ${request.name}?`,
        confirmText: 'Reject',
        tone: 'danger',
        icon: 'fa-user-xmark'
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performReject(request));
  }

  private performReject(request: CircleRequest): void {
    this.busyIds.add(request.circleId);
    this.circles.reject(request.circleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyIds.delete(request.circleId);
        this.toast.success('Request rejected.');
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.busyIds.delete(request.circleId);
        this.toast.error(apiErrorMessage(error, 'Unable to reject the request right now.'));
      }
    });
  }

  /** Withdraws a request the user sent before the other person responds. */
  cancelRequest(request: CircleRequest): void {
    this.confirmDialog
      .confirm({
        title: 'Cancel request',
        message: `Withdraw your circle request to ${request.name}?`,
        confirmText: 'Cancel request',
        tone: 'danger',
        icon: 'fa-xmark'
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performCancel(request));
  }

  private performCancel(request: CircleRequest): void {
    this.busyIds.add(request.circleId);
    this.circles.remove(request.circleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyIds.delete(request.circleId);
        this.toast.success(`Request to ${request.name} was withdrawn.`);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.busyIds.delete(request.circleId);
        this.toast.error(apiErrorMessage(error, 'Unable to cancel the request right now.'));
      }
    });
  }

  remove(member: CircleMember): void {
    this.confirmDialog
      .confirm({
        title: 'Remove from circle',
        message: `Remove ${member.name} from your circle? You will need a new request to add them again.`,
        confirmText: 'Remove',
        tone: 'danger',
        icon: 'fa-user-minus'
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performRemove(member));
  }

  private performRemove(member: CircleMember): void {
    this.busyIds.add(member.circleId);
    this.circles.remove(member.circleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyIds.delete(member.circleId);
        this.toast.success(`${member.name} was removed from your circle.`);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.busyIds.delete(member.circleId);
        this.toast.error(apiErrorMessage(error, 'Unable to remove this member right now.'));
      }
    });
  }

  trackByCircleId(_index: number, item: { circleId: number }): number {
    return item.circleId;
  }

  lastSeenText(member: CircleMember): string {
    if (member.online) return 'Online now';
    if (!member.lastSeenAt) return 'Offline';
    return `Last seen ${new Date(member.lastSeenAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
  }
}
