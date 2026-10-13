import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AgentStatus, DeliveryOpsRunResult } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CopilotChatComponent } from './copilot-chat.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, CopilotChatComponent],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.css'
})
export class AgentsComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  status: AgentStatus | null = null;
  statusLoading = false;
  statusError = false;

  running = false;
  lastRun: DeliveryOpsRunResult | null = null;
  lastRunAt: Date | null = null;
  runError = '';

  constructor() {
    this.loadStatus();
  }

  loadStatus(): void {
    this.statusLoading = true;
    this.statusError = false;
    this.api.agentStatus().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (status) => {
        this.status = status;
        this.statusLoading = false;
      },
      error: () => {
        this.statusLoading = false;
        this.statusError = true;
      }
    });
  }

  get canRunTriage(): boolean {
    return !!this.status?.deliveryOps.enabled && !this.running;
  }

  runTriage(): void {
    if (!this.canRunTriage) {
      return;
    }
    this.running = true;
    this.runError = '';
    this.api.runDeliveryOpsAgent().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.lastRun = result;
        this.lastRunAt = new Date();
        this.running = false;
        this.loadStatus();
        if (result.ran) {
          this.toast.success(result.dryRun ? 'Triage finished (dry run - nothing was changed).' : 'Triage finished.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.running = false;
        this.lastRun = null;
        this.runError =
          err.error?.report ||
          (err.status === 409 ? 'A triage run is already in progress.' : 'Triage could not be run right now.');
        this.toast.error(this.runError);
      }
    });
  }
}
