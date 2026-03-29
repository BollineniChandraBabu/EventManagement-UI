import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval, Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  ChatConversation,
  ChatMessage,
  ChatMessagePage,
  ChatUser,
  DeleteMessageResponse
} from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  conversations: ChatConversation[] = [];
  users: ChatUser[] = [];
  messages: ChatMessage[] = [];

  selectedConversation: ChatConversation | null = null;
  selectedUser: ChatUser | null = null;

  searchText = '';
  newChatUserId: number | null = null;
  newMessageText = '';
  editingMessageId: number | null = null;
  editDraft = '';
  pendingAttachment: File | null = null;

  loading = false;
  sending = false;

  readonly maxEditDeleteMinutes = 15;

  ngOnInit(): void {
    this.loadAll();

    interval(20_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadConversations(false));

    interval(60_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.sendHeartbeat());

    this.sendHeartbeat();
  }

  ngOnDestroy(): void {
    this.sendOffline();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.loading = true;
    this.api.chatUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: () => this.toast.error('Failed to load chat users')
    });

    this.loadConversations(true);
  }

  loadConversations(initial = false): void {
    this.api.chatConversations().subscribe({
      next: (items) => {
        this.conversations = items;

        if (initial && items.length > 0) {
          this.openConversation(items[0]);
        } else if (this.selectedConversation) {
          const refreshed = items.find((c) => c.conversationId === this.selectedConversation?.conversationId);
          if (refreshed) {
            this.selectedConversation = refreshed;
            this.selectedUser = this.toUser(refreshed);
          }
        }

        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load conversations');
        this.loading = false;
      }
    });
  }

  get filteredUsersForNewChat(): ChatUser[] {
    const used = new Set(this.conversations.map((c) => c.otherUserId));
    return this.users.filter((u) => !used.has(u.userId));
  }

  get visibleConversations(): ChatConversation[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) {
      return this.conversations;
    }

    return this.conversations.filter((c) =>
      [c.otherUserName, c.otherUserEmail, c.lastMessage]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }

  openConversation(conversation: ChatConversation): void {
    this.selectedConversation = conversation;
    this.selectedUser = this.toUser(conversation);
    this.editingMessageId = null;
    this.loadMessages(conversation.otherUserId);
  }

  startNewConversation(user: ChatUser): void {
    this.selectedUser = user;
    this.selectedConversation = null;
    this.messages = [];
    this.editingMessageId = null;
  }

  onNewChatSelect(userId: string | number | null): void {
    const id = Number(userId);
    if (!id) {
      return;
    }
    const user = this.filteredUsersForNewChat.find((u) => u.userId === id);
    if (user) {
      this.startNewConversation(user);
      this.newChatUserId = null;
    }
  }

  loadMessages(otherUserId: number): void {
    this.api.chatMessages(otherUserId, 0, 100, true).subscribe({
      next: (page: ChatMessagePage) => {
        this.messages = [...page.items].sort((a, b) => +new Date(a.sentAt) - +new Date(b.sentAt));
      },
      error: () => this.toast.error('Failed to load messages')
    });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pendingAttachment = input.files?.[0] ?? null;
  }

  clearAttachment(input: HTMLInputElement): void {
    this.pendingAttachment = null;
    input.value = '';
  }

  sendMessage(fileInput: HTMLInputElement): void {
    if (!this.selectedUser || this.sending) {
      return;
    }

    const text = this.newMessageText.trim();
    if (!text && !this.pendingAttachment) {
      return;
    }

    this.sending = true;
    this.api.sendChatMessage(this.selectedUser.userId, text, this.pendingAttachment ?? undefined).subscribe({
      next: () => {
        this.newMessageText = '';
        this.clearAttachment(fileInput);
        this.sending = false;
        this.loadConversations();
        this.loadMessages(this.selectedUser!.userId);
      },
      error: (err) => {
        this.sending = false;
        this.toast.error(err?.error?.message || 'Failed to send message');
      }
    });
  }

  canEditOrDelete(message: ChatMessage): boolean {
    if (!message.mine || !message.sentAt) {
      return false;
    }

    const sent = new Date(message.sentAt).getTime();
    const now = Date.now();
    const diffMins = (now - sent) / (1000 * 60);
    return diffMins <= this.maxEditDeleteMinutes;
  }

  beginEdit(message: ChatMessage): void {
    if (!this.canEditOrDelete(message)) {
      return;
    }

    this.editingMessageId = message.messageId;
    this.editDraft = message.messageText;
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
  }

  saveEdit(messageId: number): void {
    const text = this.editDraft.trim();
    if (!text) {
      this.toast.error('Message cannot be empty');
      return;
    }

    this.api.editChatMessage(messageId, text).subscribe({
      next: () => {
        this.cancelEdit();
        if (this.selectedUser) {
          this.loadMessages(this.selectedUser.userId);
        }
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to edit message')
    });
  }

  deleteLastSent(): void {
    if (!this.selectedUser) {
      return;
    }

    this.api.deleteLastChatMessage(this.selectedUser.userId).subscribe({
      next: (_res: DeleteMessageResponse) => {
        this.toast.success('Message deleted');
        this.loadMessages(this.selectedUser!.userId);
        this.loadConversations();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Unable to delete message')
    });
  }

  attachmentDownloadUrl(message: ChatMessage): string | null {
    if (!message.attachmentFileName) {
      return null;
    }
    return this.api.chatAttachmentUrl(message.messageId);
  }

  statusLabel(): string {
    if (!this.selectedUser) {
      return '';
    }
    if (this.selectedUser.online) {
      return 'Active now';
    }
    if (!this.selectedUser.lastSeenAt) {
      return 'Offline';
    }
    return `Last seen ${new Date(this.selectedUser.lastSeenAt).toLocaleString()}`;
  }

  private toUser(conversation: ChatConversation): ChatUser {
    return {
      userId: conversation.otherUserId,
      name: conversation.otherUserName,
      email: conversation.otherUserEmail,
      online: conversation.otherUserOnline,
      lastSeenAt: conversation.otherUserLastSeenAt
    };
  }

  private sendHeartbeat(): void {
    this.api.chatHeartbeat().subscribe({ error: () => {} });
  }

  private sendOffline(): void {
    this.api.chatOffline().subscribe({ error: () => {} });
  }
}
