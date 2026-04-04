import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import {
  ChatConversation,
  ChatDeleteEvent,
  ChatEditEvent,
  ChatMessage,
  ChatMessageReaction,
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
  private readonly sanitizer = inject(DomSanitizer);

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
  replyingToMessage: ChatMessage | null = null;
  readonly quickReactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];
  messageReactions: Record<number, ChatMessageReaction[]> = {};
  attachmentPreviewUrl: string | null = null;
  attachmentPreviewSafeUrl: SafeResourceUrl | null = null;
  attachmentPreviewType: 'image' | 'pdf' | null = null;
  attachmentPreviewName = '';
  attachmentPreviewLoading = false;
  attachmentPreviewOpen = false;
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
      this.clearAttachmentPreviewState();
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
        this.mergeIncomingMessage(event);
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
    return !!this.activeConversation && this.canSendToActiveUser && (!!this.composer.trim() || !!this.selectedAttachment) && !this.isSending;
  }

  get canSendToActiveUser(): boolean {
    return !!this.activeConversation && this.activeConversation.otherUserActive !== false;
  }

  get filteredNewChatUsers(): ChatUser[] {
    const query = this.newChatSearch.trim().toLowerCase();

    return this.users
      .filter((user) => user.active !== false)
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
    this.replyingToMessage = null;
  }

  chooseConversation(conversation: ChatConversation): void {
    this.activeConversation = conversation;
    this.showNewChatPicker = false;
    this.replyingToMessage = null;
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
      otherUserActive: user.active !== false,
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
    if ((!text && !this.selectedAttachment) || !this.activeConversation || !this.currentUserId || this.isSending || !this.canSendToActiveUser) {
      return;
    }

    this.isSending = true;
    const receiverId = this.activeConversation.otherUserId;

    this.chat.sendMessage(
      receiverId,
      text,
      this.selectedAttachment,
      this.replyingToMessage?.messageId ?? null,
      null
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => (this.isSending = false))
).subscribe((message) => {
      this.mergeIncomingMessage(message);
      this.upsertConversationFromMessage(message);
      this.reloadConversationsOnly();
      this.scrollToBottom();
      this.composer = '';
      this.clearAttachment();
      this.replyingToMessage = null;
      if (this.activeConversation && this.currentUserId) {
        this.chat.publishTyping(this.activeConversation.conversationId, this.currentUserId, false);
      }
    });
  }

  onComposerInput(): void {
    if (!this.activeConversation || !this.currentUserId || !this.canSendToActiveUser) {
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


  formatMessageTime(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

  startReply(message: ChatMessage): void {
    this.replyingToMessage = message;
  }

  cancelReply(): void {
    this.replyingToMessage = null;
  }

  displayConversationName(conversation: ChatConversation): string {
    return conversation.otherUserActive === false
      ? `${conversation.otherUserName} (Disabled user)`
      : conversation.otherUserName;
  }

  displayUserName(user: ChatUser): string {
    return user.name;
  }

  reactToMessage(message: ChatMessage, emoji: string): void {
    this.chat.reactToMessage(message.messageId, emoji).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reactions) => {
      this.messageReactions = { ...this.messageReactions, [message.messageId]: reactions };
    });
  }

  removeReaction(message: ChatMessage, emoji: string): void {
    this.chat.removeReaction(message.messageId, emoji).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reactions) => {
      this.messageReactions = { ...this.messageReactions, [message.messageId]: reactions };
    });
  }

  reactionsForMessage(messageId: number): ChatMessageReaction[] {
    return this.messageReactions[messageId] ?? [];
  }

  openAttachment(message: ChatMessage): void {
    if (!message.attachmentFileName) {
      return;
    }

    if (!this.isPreviewSupported(message)) {
      this.downloadAttachment(message);
      return;
    }

    this.attachmentPreviewLoading = true;
    this.attachmentPreviewOpen = true;
    this.attachmentPreviewName = message.attachmentFileName;
    this.chat.downloadAttachment(message.messageId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const normalizedBlob = this.normalizeAttachmentBlob(blob, message);
        const url = URL.createObjectURL(normalizedBlob);
        this.clearAttachmentPreviewState(false);
        this.attachmentPreviewOpen = true;
        this.attachmentPreviewName = message.attachmentFileName ?? 'attachment';
        this.attachmentPreviewUrl = url;
        this.attachmentPreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.attachmentPreviewType = this.resolveAttachmentPreviewType(message);
        this.attachmentPreviewLoading = false;
      },
      error: () => {
        this.attachmentPreviewLoading = false;
        this.attachmentPreviewOpen = false;
        this.downloadAttachment(message);
      }
    });
  }

  closeAttachmentPreview(): void {
    this.clearAttachmentPreviewState();
  }

  downloadPreviewAttachment(): void {
    if (!this.attachmentPreviewUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = this.attachmentPreviewUrl;
    anchor.download = this.attachmentPreviewName || 'attachment';
    anchor.click();
  }

  downloadAttachment(message: ChatMessage): void {
    if (!message.attachmentFileName) {
      return;
    }

    this.chat.downloadAttachment(message.messageId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((blob) => {
      this.downloadBlob(this.normalizeAttachmentBlob(blob, message), message.attachmentFileName || 'attachment');
    });
  }


  private mergeIncomingMessage(message: ChatMessage): void {
    const index = this.messages.findIndex((item) => item.messageId === message.messageId);
    if (index >= 0) {
      const updated = [...this.messages];
      updated[index] = message;
      this.messages = updated;
      return;
    }

    this.messages = [...this.messages, message];
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
    forkJoin({
      all: this.chat.listUsers(),
      active: this.chat.listActiveUsers()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ all, active }) => {
      const activeMap = new Map(active.map((item) => [item.userId, item]));
      this.users = all.map((user) => {
        const activeState = activeMap.get(user.userId);
        return activeState
          ? { ...user, online: activeState.online, lastSeenAt: activeState.lastSeenAt }
          : user;
      });
      this.applyActiveFlagsToConversations();
    });
  }

  private reloadConversationsOnly(): void {
    this.chat.listConversations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      const userMap = new Map(this.users.map((user) => [user.userId, user.active]));
      this.conversations = items.map((conversation) => ({
        ...conversation,
        otherUserActive: conversation.otherUserActive ?? userMap.get(conversation.otherUserId) ?? true
      }));
      if (items.length && !this.activeConversation) {
        this.chooseConversation(this.conversations[0]);
      }

      if (this.activeConversation) {
        const matched = this.conversations.find((item) => item.conversationId === this.activeConversation?.conversationId);
        if (matched) {
          this.activeConversation = matched;
        }
      }
    });
  }

  private loadMessages(otherUserId: number): void {
    this.chat.conversationMessages(otherUserId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.messages = [...response.items].reverse();
      this.loadReactionsForMessages(this.messages);
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

    // Do not optimistically stamp seenAt client-side.
    // Backend may still report null, and synthetic timestamps cause flicker/wrong seen labels.
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

  private resolveAttachmentPreviewType(message: ChatMessage): 'image' | 'pdf' | null {
    const contentType = (message.attachmentContentType || '').toLowerCase();
    const fileName = (message.attachmentFileName || '').toLowerCase();

    if (contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName)) {
      return 'image';
    }

    if (contentType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }

    return null;
  }

  private isPreviewSupported(message: ChatMessage): boolean {
    return this.resolveAttachmentPreviewType(message) !== null;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private normalizeAttachmentBlob(blob: Blob, message: ChatMessage): Blob {
    const type = this.resolveAttachmentMimeType(message);
    if (!type || blob.type === type) {
      return blob;
    }
    return new Blob([blob], { type });
  }

  private resolveAttachmentMimeType(message: ChatMessage): string {
    const contentType = (message.attachmentContentType || '').trim().toLowerCase();
    if (contentType) {
      return contentType;
    }

    const fileName = (message.attachmentFileName || '').toLowerCase();
    if (fileName.endsWith('.pdf')) {
      return 'application/pdf';
    }
    if (/\.(png)$/.test(fileName)) {
      return 'image/png';
    }
    if (/\.(jpe?g)$/.test(fileName)) {
      return 'image/jpeg';
    }
    if (fileName.endsWith('.webp')) {
      return 'image/webp';
    }
    return 'application/octet-stream';
  }

  private clearAttachmentPreviewState(close = true): void {
    if (this.attachmentPreviewUrl) {
      URL.revokeObjectURL(this.attachmentPreviewUrl);
    }

    this.attachmentPreviewUrl = null;
    this.attachmentPreviewSafeUrl = null;
    this.attachmentPreviewType = null;
    this.attachmentPreviewLoading = false;
    this.attachmentPreviewName = '';
    if (close) {
      this.attachmentPreviewOpen = false;
    }
  }

  private loadReactionsForMessages(messages: ChatMessage[]): void {
    messages.forEach((message) => {
      this.chat.listMessageReactions(message.messageId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reactions) => {
        this.messageReactions = { ...this.messageReactions, [message.messageId]: reactions };
      });
    });
  }

  private applyActiveFlagsToConversations(): void {
    const activeByUser = new Map(this.users.map((user) => [user.userId, user.active !== false]));
    this.conversations = this.conversations.map((conversation) => ({
      ...conversation,
      otherUserActive: activeByUser.get(conversation.otherUserId) ?? conversation.otherUserActive ?? true
    }));

    if (this.activeConversation) {
      this.activeConversation = {
        ...this.activeConversation,
        otherUserActive: activeByUser.get(this.activeConversation.otherUserId) ?? this.activeConversation.otherUserActive ?? true
      };
    }
  }
}
