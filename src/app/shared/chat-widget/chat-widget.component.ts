import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  ChatConversation,
  ChatDeleteEvent,
  ChatEditEvent,
  ChatMessage,
  ChatPresenceEvent,
  ChatSeenOrTypingEvent,
  ChatUser
} from '../../core/models/chat.models';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css'
})
export class ChatWidgetComponent {
  private readonly chat = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('messageScroller') messageScroller?: ElementRef<HTMLDivElement>;
  @ViewChild('attachmentInput') attachmentInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  isLoading = false;
  isSending = false;
  composer = '';
  currentUserId: number | null = null;
  hoveredMessageId: number | null = null;
  editingMessageId: number | null = null;
  editDraft = '';
  selectedAttachment: File | null = null;
  typingUserId: number | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  showNewChatPicker = false;
  newChatSearch = '';

  conversations: ChatConversation[] = [];
  users: ChatUser[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopHeartbeat();
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
      }
    });

    this.chat.currentUserId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.currentUserId = id;
    });

    this.chat.socketEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if ('type' in event && (event.type === 'SEEN' || event.type === 'TYPING')) {
        this.applySeenOrTypingEvent(event);
        return;
      }

      if ('type' in event && event.type === 'PRESENCE') {
        this.applyPresenceEvent(event);
        return;
      }

      if ('type' in event && event.type === 'MESSAGE_DELETED') {
        this.applyDeleteEvent(event);
        return;
      }

      if ('type' in event && event.type === 'MESSAGE_EDITED') {
        this.applyEditEvent(event);
        return;
      }

      if (!('messageId' in event)) {
        return;
      }

      this.upsertConversationFromMessage(event);
      if (this.activeConversation?.conversationId === event.conversationId) {
        this.messages = [...this.messages, event];
        this.scrollToBottom();
      }
    });
  }

  get unreadCount(): number {
    return this.conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
  }

  get mobileConversationView(): boolean {
    return !!this.activeConversation;
  }

  get canSend(): boolean {
    return !!this.activeConversation && (!!this.composer.trim() || !!this.selectedAttachment) && !this.isSending;
  }

  get filteredNewChatUsers(): ChatUser[] {
    const existingIds = new Set(this.conversations.map((item) => item.otherUserId));
    const query = this.newChatSearch.trim().toLowerCase();

    return this.users
      .filter((user) => !existingIds.has(user.userId))
      .filter((user) => !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .slice(0, 8);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.bootstrapChat();
      return;
    }

    this.chat.publishPresence(this.currentUserId ?? 0, false);
    this.chat.markOffline().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.stopHeartbeat();
  }

  closeConversation(): void {
    this.activeConversation = null;
    this.messages = [];
    this.showNewChatPicker = false;
  }

  chooseConversation(conversation: ChatConversation): void {
    this.activeConversation = conversation;
    this.showNewChatPicker = false;
    this.chat.subscribeToConversation(conversation.conversationId);
    this.typingUserId = null;
    this.loadMessages(conversation.otherUserId);
  }

  startConversation(user: ChatUser): void {
    const existing = this.conversations.find((item) => item.otherUserId === user.userId);
    if (existing) {
      this.chooseConversation(existing);
      return;
    }

    const draftConversation: ChatConversation = {
      conversationId: Date.now() * -1,
      otherUserId: user.userId,
      otherUserName: user.name,
      otherUserEmail: user.email,
      otherUserOnline: user.online,
      otherUserLastSeenAt: user.lastSeenAt,
      lastMessage: '',
      lastMessageAt: null,
      unreadCount: 0
    };

    this.activeConversation = draftConversation;
    this.messages = [];
    this.showNewChatPicker = false;
  }

  send(): void {
    const text = this.composer.trim();
    if ((!text && !this.selectedAttachment) || !this.activeConversation || !this.currentUserId || this.isSending) {
      return;
    }

    this.isSending = true;
    const receiverId = this.activeConversation.otherUserId;

    this.chat.sendMessage(receiverId, text, this.selectedAttachment).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => (this.isSending = false))
    ).subscribe((message) => {
      this.messages = [...this.messages, message];
      this.upsertConversationFromMessage(message);
      this.reloadConversationsOnly();
      this.scrollToBottom();
      this.composer = '';
      this.clearAttachment();
      if (this.activeConversation && this.currentUserId) {
        this.chat.publishTyping(this.activeConversation.conversationId, this.currentUserId, false);
      }
    });
  }


  onComposerInput(): void {
    if (!this.activeConversation || !this.currentUserId) {
      return;
    }

    this.chat.publishTyping(this.activeConversation.conversationId, this.currentUserId, true);
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      if (this.activeConversation && this.currentUserId) {
        this.chat.publishTyping(this.activeConversation.conversationId, this.currentUserId, false);
      }
    }, 900);
  }

  getActiveConversationStatus(): string {
    if (!this.activeConversation) {
      return '';
    }

    if (this.typingUserId && this.typingUserId === this.activeConversation.otherUserId) {
      return 'Typing…';
    }

    if (this.activeConversation.otherUserOnline) {
      return 'Active now';
    }

    if (this.activeConversation.otherUserLastSeenAt) {
      return `Last seen ${this.formatLastSeen(this.activeConversation.otherUserLastSeenAt)}`;
    }

    return 'Offline';
  }

  startEdit(message: ChatMessage): void {
    if (!this.canEdit(message)) {
      return;
    }

    this.editingMessageId = message.messageId;
    this.editDraft = message.messageText ?? '';
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
  }

  saveEdit(message: ChatMessage): void {
    const nextText = this.editDraft.trim();
    if (!nextText || nextText === (message.messageText ?? '').trim()) {
      this.cancelEdit();
      return;
    }

    this.chat.editMessage(message.messageId, nextText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((updated) => {
      this.messages = this.messages.map((item) => (item.messageId === updated.messageId ? updated : item));
      this.reloadConversationsOnly();
      this.cancelEdit();
    });
  }

  deleteLatestIfEligible(message: ChatMessage): void {
    if (!this.canDelete(message) || !this.activeConversation) {
      return;
    }

    this.chat.deleteLastSentMessage(this.activeConversation.otherUserId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.messages = this.messages.filter((item) => item.messageId !== response.messageId);
        this.reloadConversationsOnly();
      });
  }

  triggerAttachment(): void {
    this.attachmentInput?.nativeElement.click();
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedAttachment = file;
  }

  clearAttachment(): void {
    this.selectedAttachment = null;
    if (this.attachmentInput) {
      this.attachmentInput.nativeElement.value = '';
    }
  }

  downloadAttachment(message: ChatMessage): void {
    if (!message.attachmentFileName) {
      return;
    }

    this.chat.downloadAttachment(message.messageId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = message.attachmentFileName || 'attachment';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  canEdit(message: ChatMessage): boolean {
    return this.isWithinEditWindow(message) && message.mine;
  }

  canDelete(message: ChatMessage): boolean {
    return this.isWithinEditWindow(message) && message.mine && this.isLatestMineMessage(message.messageId);
  }

  isWithinEditWindow(message: ChatMessage): boolean {
    const sentAt = new Date(message.sentAt).getTime();
    if (Number.isNaN(sentAt)) {
      return false;
    }

    return Date.now() - sentAt <= 15 * 60 * 1000;
  }

  private isLatestMineMessage(messageId: number): boolean {
    for (let index = this.messages.length - 1; index >= 0; index--) {
      if (this.messages[index].mine) {
        return this.messages[index].messageId === messageId;
      }
    }
    return false;
  }

  private bootstrapChat(): void {
    this.isLoading = true;
    this.chat.ensureCurrentUser().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => (this.isLoading = false))
    ).subscribe(() => {
      this.chat.connectSocket();
      this.chat.subscribePresence();
      if (this.currentUserId) {
        this.chat.publishPresence(this.currentUserId, true);
      }
      this.chat.heartbeat().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      this.startHeartbeat();
      this.reloadLists();
    });
  }

  private reloadLists(): void {
    this.reloadConversationsOnly();
    this.chat.listActiveUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.users = items;
    });
  }

  private reloadConversationsOnly(): void {
    this.chat.listConversations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.conversations = items;
      if (items.length && !this.activeConversation) {
        this.chooseConversation(items[0]);
      }
    });
  }

  private loadMessages(otherUserId: number): void {
    this.chat.conversationMessages(otherUserId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.messages = [...response.items].reverse();
      this.markConversationRead(otherUserId);
      this.scrollToBottom();
    });
  }

  private markConversationRead(otherUserId: number): void {
    this.conversations = this.conversations.map((item) => item.otherUserId === otherUserId ? { ...item, unreadCount: 0 } : item);

    if (this.activeConversation?.conversationId && this.currentUserId) {
      this.chat.publishSeen(this.activeConversation.conversationId, this.currentUserId, otherUserId);
    }
  }

  private upsertConversationFromMessage(message: ChatMessage): void {
    const existing = this.conversations.find((item) => item.conversationId === message.conversationId);

    if (existing) {
      const shouldIncreaseUnread = !message.mine && this.activeConversation?.conversationId !== message.conversationId;
      this.conversations = this.conversations.map((item) => item.conversationId === message.conversationId ? {
        ...item,
        lastMessage: message.messageText || (message.attachmentFileName ? `📎 ${message.attachmentFileName}` : ''),
        lastMessageAt: message.sentAt,
        unreadCount: shouldIncreaseUnread ? item.unreadCount + 1 : item.unreadCount
      } : item);
      return;
    }

    this.reloadConversationsOnly();
  }

  private applySeenOrTypingEvent(event: ChatSeenOrTypingEvent): void {
    if (event.type === 'TYPING') {
      if (event.conversationId !== this.activeConversation?.conversationId) {
        return;
      }

      this.typingUserId = event.typing ? (event.userId ?? null) : null;
      return;
    }

    this.messages = this.messages.map((msg) =>
      msg.conversationId === event.conversationId && msg.mine ? { ...msg, seenAt: new Date().toISOString() } : msg
    );
  }

  private applyPresenceEvent(event: ChatPresenceEvent): void {
    this.users = this.users.map((item) => item.userId === event.userId ? {
      ...item,
      online: event.online,
      lastSeenAt: event.lastSeenAt
    } : item);

    this.conversations = this.conversations.map((item) => item.otherUserId === event.userId ? {
      ...item,
      otherUserOnline: event.online,
      otherUserLastSeenAt: event.lastSeenAt
    } : item);

    if (this.activeConversation?.otherUserId === event.userId) {
      this.activeConversation = {
        ...this.activeConversation,
        otherUserOnline: event.online,
        otherUserLastSeenAt: event.lastSeenAt
      };
    }
  }

  private formatLastSeen(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'recently';
    }

    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  private applyDeleteEvent(event: ChatDeleteEvent): void {
    if (this.activeConversation?.conversationId === event.conversationId) {
      this.messages = this.messages.filter((message) => message.messageId !== event.messageId);
    }

    this.reloadConversationsOnly();
  }

  private applyEditEvent(event: ChatEditEvent): void {
    if (this.activeConversation?.conversationId === event.message.conversationId) {
      this.messages = this.messages.map((item) => item.messageId === event.message.messageId ? event.message : item);
    }

    this.reloadConversationsOnly();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.chat.heartbeat().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }, 60000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageScroller) {
        this.messageScroller.nativeElement.scrollTop = this.messageScroller.nativeElement.scrollHeight;
      }
    });
  }
}
