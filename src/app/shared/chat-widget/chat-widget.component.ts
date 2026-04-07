import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  NgZone,
} from '@angular/core';
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
  ChatUser,
} from '../../core/models/chat.models';
import { ChatService } from '../../core/services/chat.service';

interface ChatTimelineEntry {
  kind: 'day' | 'message';
  dayKey?: string;
  dayLabel?: string;
  message?: ChatMessage;
}

/** Pixel threshold from bottom before we show the scroll-to-bottom button */
const SCROLL_THRESHOLD = 120;

/** Image MIME types / extensions we can preview inline */
const IMAGE_MIME_PREFIXES = ['image/'];
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i;

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent {
  private readonly chat = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ngZone = inject(NgZone);

  @ViewChild('messageScroller') messageScroller?: ElementRef<HTMLDivElement>;
  @ViewChild('attachmentInput') attachmentInput?: ElementRef<HTMLInputElement>;

  // ── State ─────────────────────────────────────────────────────────────────
  isOpen = false;
  isLoading = false;
  isSending = false;
  composer = '';
  currentUserId: number | null = null;

  hoveredMessageId: number | null = null;
  activeMessageId: number | null = null;
  swipeMessageId: number | null = null;
  swipeTranslateX = 0;

  editingMessageId: number | null = null;
  editDraft = '';
  selectedAttachment: File | null = null;
  typingUserId: number | null = null;
  replyingToMessage: ChatMessage | null = null;

  readonly quickReactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];
  messageReactions: Record<number, ChatMessageReaction[]> = {};

  // Attachment preview
  attachmentPreviewUrl: string | null = null;
  attachmentPreviewSafeUrl: SafeResourceUrl | null = null;
  attachmentPreviewType: 'image' | 'pdf' | null = null;
  attachmentPreviewName = '';
  attachmentPreviewLoading = false;
  attachmentPreviewOpen = false;
  highlightedMessageId: number | null = null;

  // Scroll tracking
  showScrollButton = false;
  newMessagesWhileScrolled = 0;
  private isNearBottom = true;

  // New chat picker
  showNewChatPicker = false;
  newChatSearch = '';

  // Data
  conversations: ChatConversation[] = [];
  users: ChatUser[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];

  // Timers
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private typingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private messageUiHideTimer: ReturnType<typeof setTimeout> | null = null;

  // Gesture tracking
  private lastTapTimeByMessage = new Map<number, number>();
  private gestureStartX = 0;
  private gestureStartY = 0;
  private gesturePointerId: number | null = null;
  private gestureMessageId: number | null = null;
  private isSwiping = false;
  private cancelTap = false;

  // ── Timeline ──────────────────────────────────────────────────────────────
  get timelineEntries(): ChatTimelineEntry[] {
    const timeline: ChatTimelineEntry[] = [];
    let previousDayKey: string | null = null;

    this.messages.forEach((message) => {
      const dayKey = this.dayKey(message.sentAt);
      if (dayKey && dayKey !== previousDayKey) {
        timeline.push({ kind: 'day', dayKey, dayLabel: this.formatDayLabel(message.sentAt) });
        previousDayKey = dayKey;
      }
      timeline.push({ kind: 'message', message });
    });

    return timeline;
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  get unreadCount(): number {
    return this.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }

  get mobileConversationView(): boolean {
    return !!this.activeConversation;
  }

  get canSend(): boolean {
    return (
        !!this.activeConversation &&
        this.canSendToActiveUser &&
        (!!this.composer.trim() || !!this.selectedAttachment) &&
        !this.isSending
    );
  }

  get canSendToActiveUser(): boolean {
    return !!this.activeConversation && this.activeConversation.otherUserActive !== false;
  }

  get filteredNewChatUsers(): ChatUser[] {
    const query = this.newChatSearch.trim().toLowerCase();
    return this.users
        .filter((u) => u.active !== false)
        .filter(
            (u) =>
                !query ||
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
        )
        .slice(0, 8);
  }

  isTyping(): boolean {
    return !!this.typingUserId && this.typingUserId === this.activeConversation?.otherUserId;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopHeartbeat();
      if (this.typingTimer) clearTimeout(this.typingTimer);
      if (this.typingTimeoutTimer) clearTimeout(this.typingTimeoutTimer);
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      if (this.messageUiHideTimer) clearTimeout(this.messageUiHideTimer);
      this.clearAttachmentPreviewState();
    });

    this.chat.currentUserId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.currentUserId = id;
    });

    this.chat.socketEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if ('type' in event) {
        if (event.type === 'SEEN' || event.type === 'TYPING') {
          this.applySeenOrTypingEvent(event as ChatSeenOrTypingEvent);
          return;
        }
        if (event.type === 'PRESENCE') {
          this.applyPresenceEvent(event as ChatPresenceEvent);
          return;
        }
        if (event.type === 'MESSAGE_DELETED') {
          this.applyDeleteEvent(event as ChatDeleteEvent);
          return;
        }
        if (event.type === 'MESSAGE_EDITED') {
          this.applyEditEvent(event as ChatEditEvent);
          return;
        }
      }

      if (!('messageId' in event)) return;

      const msg = event as ChatMessage;
      this.upsertConversationFromMessage(msg);
      if (this.activeConversation?.conversationId === msg.conversationId) {
        this.loadReactionsForMessages([msg]);
        this.mergeIncomingMessage(msg);
        if (this.isNearBottom) {
          this.scrollToBottom();
        } else if (!msg.mine) {
          // New message arrived while user has scrolled up
          this.newMessagesWhileScrolled++;
        }
      }
    });
  }

  // ── Toggle / Open ─────────────────────────────────────────────────────────
  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.bootstrapChat();
    } else {
      this.chat.publishPresence(this.currentUserId ?? 0, false);
      this.chat.markOffline().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      this.stopHeartbeat();
    }
  }

  // ── Scroll tracking ───────────────────────────────────────────────────────
  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.isNearBottom = distanceFromBottom < SCROLL_THRESHOLD;

    if (this.isNearBottom) {
      this.showScrollButton = false;
      this.newMessagesWhileScrolled = 0;
    } else {
      this.showScrollButton = true;
    }
  }

  scrollToBottomSmooth(): void {
    this.showScrollButton = false;
    this.newMessagesWhileScrolled = 0;
    const el = this.messageScroller?.nativeElement;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }

  // ── Hover / Tap handling ──────────────────────────────────────────────────
  onMessageMouseEnter(messageId: number): void {
    if (!this.prefersHover()) return;
    this.hoveredMessageId = messageId;
    this.activeMessageId = messageId;
  }

  onMessageMouseLeave(event: MouseEvent, messageId: number): void {
    if (!this.prefersHover()) return;
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (nextTarget?.closest('.msg-actions, .reactions-bar')) return;
    this.scheduleClearActiveMessage(messageId);
  }

  onFloatingUiEnter(messageId: number): void {
    if (!this.prefersHover()) return;
    this.cancelMessageUiHide();
    this.hoveredMessageId = messageId;
    this.activeMessageId = messageId;
  }

  onFloatingUiLeave(messageId: number): void {
    if (!this.prefersHover()) return;
    this.scheduleClearActiveMessage(messageId);
  }

  // ── Conversations ─────────────────────────────────────────────────────────
  closeConversation(): void {
    this.activeConversation = null;
    this.messages = [];
    this.showNewChatPicker = false;
    this.replyingToMessage = null;
    this.hoveredMessageId = null;
    this.activeMessageId = null;
    this.showScrollButton = false;
    this.newMessagesWhileScrolled = 0;
  }

  chooseConversation(conversation: ChatConversation): void {
    this.activeConversation = conversation;
    this.showNewChatPicker = false;
    this.replyingToMessage = null;
    this.hoveredMessageId = null;
    this.activeMessageId = null;
    this.showScrollButton = false;
    this.newMessagesWhileScrolled = 0;
    this.chat.subscribeToConversation(conversation.conversationId);
    this.typingUserId = null;
    this.loadMessages(conversation.otherUserId);
  }

  startConversation(user: ChatUser): void {
    const existing = this.conversations.find((c) => c.otherUserId === user.userId);
    if (existing) {
      this.chooseConversation(existing);
      return;
    }
    const draft: ChatConversation = {
      conversationId: Date.now() * -1,
      otherUserId: user.userId,
      otherUserName: user.name,
      otherUserEmail: user.email,
      otherUserOnline: user.online,
      otherUserLastSeenAt: user.lastSeenAt,
      otherUserActive: user.active !== false,
      lastMessage: '',
      lastMessageAt: null,
      unreadCount: 0,
    };
    this.activeConversation = draft;
    this.messages = [];
    this.showNewChatPicker = false;
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  send(): void {
    const text = this.composer.trim();
    if (
        (!text && !this.selectedAttachment) ||
        !this.activeConversation ||
        !this.currentUserId ||
        this.isSending ||
        !this.canSendToActiveUser
    ) return;

    this.isSending = true;
    const receiverId = this.activeConversation.otherUserId;

    this.chat
        .sendMessage(
            receiverId,
            text,
            this.selectedAttachment,
            this.replyingToMessage?.messageId ?? null,
            null
        )
        .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => (this.isSending = false))
        )
        .subscribe((msg) => {
          this.mergeIncomingMessage(msg);
          this.upsertConversationFromMessage(msg);
          this.reloadConversationsOnly();
          this.scrollToBottom();
          this.composer = '';
          this.clearAttachment();
          this.replyingToMessage = null;
          if (this.activeConversation && this.currentUserId) {
            this.chat.publishTyping(
                this.activeConversation.conversationId,
                this.currentUserId,
                false
            );
          }
        });
  }

  /** Enter = send; Shift+Enter = newline */
  onEnterKey(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  onComposerInput(): void {
    if (!this.activeConversation || !this.currentUserId || !this.canSendToActiveUser) return;
    this.chat.publishTyping(this.activeConversation.conversationId, this.currentUserId, true);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      if (this.activeConversation && this.currentUserId) {
        this.chat.publishTyping(
            this.activeConversation.conversationId,
            this.currentUserId,
            false
        );
      }
    }, 1500);
  }

  // ── Reply ─────────────────────────────────────────────────────────────────
  startReply(message: ChatMessage): void {
    this.replyingToMessage = message;
    this.clearActiveMessageState();
  }

  cancelReply(): void {
    this.replyingToMessage = null;
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  startEdit(message: ChatMessage): void {
    if (!this.canEdit(message)) return;
    // Close reply if editing to avoid UI clutter
    if (this.replyingToMessage?.messageId === message.messageId) {
      this.replyingToMessage = null;
    }
    this.editingMessageId = message.messageId;
    this.editDraft = message.messageText ?? '';
    this.clearActiveMessageState();
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.editDraft = '';
  }

  saveEdit(message: ChatMessage): void {
    const next = this.editDraft.trim();
    if (!next || next === (message.messageText ?? '').trim()) {
      this.cancelEdit();
      return;
    }
    this.chat
        .editMessage(message.messageId, next)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((updated) => {
          this.messages = this.messages.map((m) =>
              m.messageId === updated.messageId ? updated : m
          );
          this.reloadConversationsOnly();
          this.cancelEdit();
        });
  }

  onEditEnter(event: Event, message: ChatMessage): void {
    const e = event as KeyboardEvent;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      this.saveEdit(message);
    }
  }

  canEdit(message: ChatMessage): boolean {
    return this.isWithinEditWindow(message) && message.mine;
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteLatestIfEligible(message: ChatMessage): void {
    if (!this.canDelete(message) || !this.activeConversation) return;
    this.clearActiveMessageState();
    this.chat
        .deleteLastSentMessage(this.activeConversation.otherUserId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          this.messages = this.messages.filter((m) => m.messageId !== res.messageId);
          this.reloadConversationsOnly();
        });
  }

  canDelete(message: ChatMessage): boolean {
    return (
        this.isWithinEditWindow(message) &&
        message.mine
    );
  }

  isWithinEditWindow(message: ChatMessage): boolean {
    const sent = new Date(message.sentAt).getTime();
    // Extend window to 24 hours for better UX
    return !Number.isNaN(sent) && (Date.now() - sent) <= (24 * 60 * 60 * 1000);
  }

  // ── Reactions ─────────────────────────────────────────────────────────────
  reactToMessage(message: ChatMessage, emoji: string): void {
    // If we are currently editing this message, cancel edit to show the reaction
    if (this.editingMessageId === message.messageId) {
      this.cancelEdit();
    }
    this.toggleReaction(message, emoji);
  }

  removeReaction(message: ChatMessage, emoji: string): void {
    this.chat
        .removeReaction(message.messageId, emoji)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((reactions) => {
          this.messageReactions = { ...this.messageReactions, [message.messageId]: reactions };
        });
  }

  reactionsForMessage(messageId: number): ChatMessageReaction[] {
    return this.messageReactions[messageId] ?? [];
  }

  toggleReaction(message: ChatMessage, emoji: string): void {
    this.clearActiveMessageState();
    this.vibrateLight();
    const mine = this.reactionsForMessage(message.messageId).find(
        (r) => r.emoji === emoji && r.mine
    );
    const request$ = mine
        ? this.chat.removeReaction(message.messageId, emoji)
        : this.chat.reactToMessage(message.messageId, emoji);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reactions) => {
      this.messageReactions = { ...this.messageReactions, [message.messageId]: reactions };
    });
  }

  isMessageActive(messageId: number): boolean {
    return this.hoveredMessageId === messageId || this.activeMessageId === messageId;
  }

  // ── Pointer / Gesture handling ─────────────────────────────────────────────
  onMessagePointerDown(event: PointerEvent, message: ChatMessage): void {
    if (!event.isPrimary || this.shouldIgnoreGesture(event)) return;
    this.gesturePointerId = event.pointerId;
    this.gestureMessageId = message.messageId;
    this.gestureStartX = event.clientX;
    this.gestureStartY = event.clientY;
    this.isSwiping = false;
    this.cancelTap = false;
    this.startLongPress(message.messageId);
  }

  onMessagePointerMove(event: PointerEvent, message: ChatMessage): void {
    if (
        this.gesturePointerId !== event.pointerId ||
        this.gestureMessageId !== message.messageId
    ) return;
    const dx = event.clientX - this.gestureStartX;
    const dy = event.clientY - this.gestureStartY;
    if (Math.abs(dy) > 12) {
      this.cancelLongPress();
      this.cancelTap = true;
    }
    if (dx > 10 && Math.abs(dx) > Math.abs(dy)) {
      this.cancelLongPress();
      this.isSwiping = true;
      this.cancelTap = true;
      this.swipeMessageId = message.messageId;
      this.swipeTranslateX = Math.min(dx, 70);
    } else if (dx < 0 && this.swipeMessageId === message.messageId) {
      this.resetSwipe();
    }
  }

  onMessagePointerUp(event: PointerEvent, message: ChatMessage): void {
    if (
        this.gesturePointerId !== event.pointerId ||
        this.gestureMessageId !== message.messageId
    ) return;
    this.cancelLongPress();
    const dx = event.clientX - this.gestureStartX;
    const dy = event.clientY - this.gestureStartY;

    if (this.isSwiping) {
      if (dx >= 50) {
        this.startReply(message);
        this.vibrateLight();
      }
      this.resetSwipe();
      this.resetGestureState();
      return;
    }

    if (!this.cancelTap && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      this.onMessageTap(message);
    }
    this.resetGestureState();
  }

  onMessagePointerCancel(): void {
    this.cancelLongPress();
    this.resetSwipe();
    this.resetGestureState();
  }

  onMessageTap(message: ChatMessage): void {
    const now = Date.now();
    const lastTap = this.lastTapTimeByMessage.get(message.messageId) ?? 0;
    // Double tap detected
    if (lastTap > 0 && now - lastTap < 300) {
      this.lastTapTimeByMessage.set(message.messageId, 0);
      this.toggleReaction(message, '❤️');
      return;
    }
    
    this.lastTapTimeByMessage.set(message.messageId, now);
    // On non-hover devices, single tap opens action toolbar
    if (!this.prefersHover()) {
      this.activeMessageId = message.messageId;
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.chat-message')) return;
    this.clearActiveMessageState();
  }

  messageTransform(messageId: number): string | null {
    if (this.swipeMessageId !== messageId) return null;
    return `translateX(${this.swipeTranslateX}px)`;
  }

  // ── Jump to message ───────────────────────────────────────────────────────
  jumpToMessage(messageId: number | null | undefined): void {
    if (!messageId) return;
    const el = this.messageScroller?.nativeElement.querySelector<HTMLElement>(
        `[data-message-id="${messageId}"]`
    );
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.highlightedMessageId = messageId;
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) this.highlightedMessageId = null;
    }, 1800);
  }

  // ── Attachment ────────────────────────────────────────────────────────────
  triggerAttachment(): void {
    this.attachmentInput?.nativeElement.click();
  }

  onAttachmentSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedAttachment = file;
  }

  clearAttachment(): void {
    this.selectedAttachment = null;
    if (this.attachmentInput) this.attachmentInput.nativeElement.value = '';
  }

  openAttachment(message: ChatMessage): void {
    if (!message.attachmentFileName) return;
    if (!this.isPreviewSupported(message)) {
      this.downloadAttachment(message);
      return;
    }
    this.attachmentPreviewLoading = true;
    this.attachmentPreviewOpen = true;
    this.attachmentPreviewName = message.attachmentFileName;
    this.chat
        .downloadAttachment(message.messageId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const normalized = this.normalizeAttachmentBlob(blob, message);
            const url = URL.createObjectURL(normalized);
            this.clearAttachmentPreviewState(false);
            this.attachmentPreviewOpen = true;
            this.attachmentPreviewName = message.attachmentFileName ?? 'attachment';
            this.attachmentPreviewUrl = url;
            this.attachmentPreviewSafeUrl =
                this.sanitizer.bypassSecurityTrustResourceUrl(url);
            this.attachmentPreviewType = this.resolveAttachmentPreviewType(message);
            this.attachmentPreviewLoading = false;
          },
          error: () => {
            this.attachmentPreviewLoading = false;
            this.attachmentPreviewOpen = false;
            this.downloadAttachment(message);
          },
        });
  }

  closeAttachmentPreview(): void {
    this.clearAttachmentPreviewState();
  }

  downloadPreviewAttachment(): void {
    if (!this.attachmentPreviewUrl) return;
    const a = document.createElement('a');
    a.href = this.attachmentPreviewUrl;
    a.download = this.attachmentPreviewName || 'attachment';
    a.click();
  }

  downloadAttachment(message: ChatMessage): void {
    if (!message.attachmentFileName) return;
    this.chat
        .downloadAttachment(message.messageId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((blob) => {
          this.downloadBlob(
              this.normalizeAttachmentBlob(blob, message),
              message.attachmentFileName || 'attachment'
          );
        });
  }

  // ── Image helpers ─────────────────────────────────────────────────────────
  /**
   * Returns true if this message's attachment can be rendered as an inline image.
   */
  isImageAttachment(message: ChatMessage): boolean {
    if (!message.attachmentFileName) return false;
    const ct = (message.attachmentContentType || '').toLowerCase();
    const fn = message.attachmentFileName.toLowerCase();
    return (
        IMAGE_MIME_PREFIXES.some((p) => ct.startsWith(p)) || IMAGE_EXTENSIONS.test(fn)
    );
  }

  /**
   * Returns a URL for inline image thumbnails.
   * If a thumb endpoint exists (e.g. /api/chat/attachments/:id/thumb),
   * use that — otherwise fall back to the full download endpoint.
   */
  getAttachmentThumbUrl(message: ChatMessage): string {
    // TODO: replace with your real thumb endpoint if available
    // e.g. return `/api/chat/attachments/${message.messageId}/thumb`;
    // return this.chat.getAttachmentUrl
    //     ? this.chat.getAttachmentUrl(message.messageId)
    //     : `/api/chat/attachments/${message.messageId}`;
    return `/api/chat/attachments/${message.messageId}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none'; // hide broken image icon
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  displayConversationName(conversation: ChatConversation): string {
    return conversation.otherUserActive === false
        ? `${conversation.otherUserName} (Disabled)`
        : conversation.otherUserName;
  }

  displayUserName(user: ChatUser): string {
    return user.name;
  }

  getActiveConversationStatus(): string {
    if (!this.activeConversation) return '';
    if (this.activeConversation.otherUserOnline) return 'Active now';
    if (this.activeConversation.otherUserLastSeenAt) {
      return `Last seen ${this.formatLastSeen(this.activeConversation.otherUserLastSeenAt)}`;
    }
    return 'Offline';
  }

  formatMessageTime(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatMessageDisplayTime(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    if (now.toDateString() === d.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff < 7) {
      return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ── TrackBy helpers ───────────────────────────────────────────────────────
  trackByTimelineEntry(_: number, entry: ChatTimelineEntry): string | number {
    return entry.kind === 'message' && entry.message
        ? `msg-${entry.message.messageId}`
        : `day-${entry.dayKey}`;
  }

  trackByReaction(_: number, reaction: ChatMessageReaction): string {
    return reaction.emoji;
  }

  // ── Private: socket event handlers ───────────────────────────────────────
  private applySeenOrTypingEvent(event: ChatSeenOrTypingEvent): void {
    if (event.type === 'TYPING') {
      if (event.conversationId !== this.activeConversation?.conversationId) return;
      if (event.typing) {
        this.typingUserId = event.userId ?? null;
        if (this.typingTimeoutTimer) clearTimeout(this.typingTimeoutTimer);
        this.typingTimeoutTimer = setTimeout(() => {
          this.typingUserId = null;
        }, 4000);
      } else {
        this.typingUserId = null;
        if (this.typingTimeoutTimer) clearTimeout(this.typingTimeoutTimer);
      }
    }
  }

  private applyPresenceEvent(event: ChatPresenceEvent): void {
    this.users = this.users.map((u) =>
        u.userId === event.userId
            ? { ...u, online: event.online, lastSeenAt: event.lastSeenAt }
            : u
    );
    this.conversations = this.conversations.map((c) =>
        c.otherUserId === event.userId
            ? { ...c, otherUserOnline: event.online, otherUserLastSeenAt: event.lastSeenAt }
            : c
    );
    if (this.activeConversation?.otherUserId === event.userId) {
      this.activeConversation = {
        ...this.activeConversation,
        otherUserOnline: event.online,
        otherUserLastSeenAt: event.lastSeenAt,
      };
    }
  }

  private applyDeleteEvent(event: ChatDeleteEvent): void {
    if (this.activeConversation?.conversationId === event.conversationId) {
      this.messages = this.messages.filter((m) => m.messageId !== event.messageId);
    }
    this.reloadConversationsOnly();
  }

  private applyEditEvent(event: ChatEditEvent): void {
    if (this.activeConversation?.conversationId === event.message.conversationId) {
      this.messages = this.messages.map((m) =>
          m.messageId === event.message.messageId ? event.message : m
      );
    }
    this.reloadConversationsOnly();
  }

  // ── Private: data loading ─────────────────────────────────────────────────
  private bootstrapChat(): void {
    this.isLoading = true;
    this.chat
        .ensureCurrentUser()
        .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => (this.isLoading = false))
        )
        .subscribe(() => {
          this.chat.connectSocket();
          this.chat.subscribePresence();
          if (this.currentUserId) this.chat.publishPresence(this.currentUserId, true);
          this.chat.heartbeat().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          this.startHeartbeat();
          this.reloadLists();
        });
  }

  private reloadLists(): void {
    this.reloadConversationsOnly();
    forkJoin({ all: this.chat.listUsers(), active: this.chat.listActiveUsers() })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ all, active }) => {
          const activeMap = new Map(active.map((u) => [u.userId, u]));
          this.users = all.map((u) => {
            const a = activeMap.get(u.userId);
            return a ? { ...u, online: a.online, lastSeenAt: a.lastSeenAt } : u;
          });
          this.applyActiveFlagsToConversations();
        });
  }

  private reloadConversationsOnly(): void {
    this.chat
        .listConversations()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((items) => {
          const userMap = new Map(this.users.map((u) => [u.userId, u.active]));
          this.conversations = items.map((c) => ({
            ...c,
            otherUserActive: c.otherUserActive ?? userMap.get(c.otherUserId) ?? true,
          }));
          if (items.length && !this.activeConversation) {
            this.chooseConversation(this.conversations[0]);
          }
          if (this.activeConversation) {
            const matched = this.conversations.find(
                (c) => c.conversationId === this.activeConversation?.conversationId
            );
            if (matched) this.activeConversation = matched;
          }
        });
  }

  private loadMessages(otherUserId: number): void {
    this.chat
        .conversationMessages(otherUserId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          this.messages = [...res.items].reverse();
          this.loadReactionsForMessages(this.messages);
          this.markConversationRead(otherUserId);
          this.scrollToBottom();
        });
  }

  private markConversationRead(otherUserId: number): void {
    this.conversations = this.conversations.map((c) =>
        c.otherUserId === otherUserId ? { ...c, unreadCount: 0 } : c
    );
    if (this.activeConversation?.conversationId && this.currentUserId) {
      this.chat.publishSeen(
          this.activeConversation.conversationId,
          this.currentUserId,
          otherUserId
      );
    }
  }

  private mergeIncomingMessage(message: ChatMessage): void {
    const idx = this.messages.findIndex((m) => m.messageId === message.messageId);
    if (idx >= 0) {
      const updated = [...this.messages];
      updated[idx] = message;
      this.messages = updated;
    } else {
      this.messages = [...this.messages, message];
    }
  }

  private upsertConversationFromMessage(message: ChatMessage): void {
    const existing = this.conversations.find(
        (c) => c.conversationId === message.conversationId
    );
    if (existing) {
      const shouldIncrement =
          !message.mine &&
          this.activeConversation?.conversationId !== message.conversationId;
      this.conversations = this.conversations.map((c) =>
          c.conversationId === message.conversationId
              ? {
                ...c,
                lastMessage:
                    message.messageText ||
                    (message.attachmentFileName ? `📎 ${message.attachmentFileName}` : ''),
                lastMessageAt: message.sentAt,
                unreadCount: shouldIncrement ? c.unreadCount + 1 : c.unreadCount,
              }
              : c
      );
    } else {
      this.reloadConversationsOnly();
    }
  }

  private applyActiveFlagsToConversations(): void {
    const activeByUser = new Map(this.users.map((u) => [u.userId, u.active !== false]));
    this.conversations = this.conversations.map((c) => ({
      ...c,
      otherUserActive: activeByUser.get(c.otherUserId) ?? c.otherUserActive ?? true,
    }));
    if (this.activeConversation) {
      this.activeConversation = {
        ...this.activeConversation,
        otherUserActive:
            activeByUser.get(this.activeConversation.otherUserId) ??
            this.activeConversation.otherUserActive ??
            true,
      };
    }
  }

  private isLatestMineMessage(messageId: number): boolean {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].mine) return this.messages[i].messageId === messageId;
    }
    return false;
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
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

  // ── Utility helpers ───────────────────────────────────────────────────────
  private prefersHover(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
  }

  /** Trigger a light haptic on supported mobile browsers */
  private vibrateLight(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
  }

  private clearActiveMessageState(): void {
    this.cancelMessageUiHide();
    this.activeMessageId = null;
    this.hoveredMessageId = null;
  }

  private scheduleClearActiveMessage(messageId: number): void {
    this.cancelMessageUiHide();
    this.messageUiHideTimer = setTimeout(() => {
      if (this.activeMessageId === messageId) this.activeMessageId = null;
      if (this.hoveredMessageId === messageId) this.hoveredMessageId = null;
    }, 220);
  }

  private cancelMessageUiHide(): void {
    if (this.messageUiHideTimer) {
      clearTimeout(this.messageUiHideTimer);
      this.messageUiHideTimer = null;
    }
  }

  private startLongPress(messageId: number): void {
    this.cancelLongPress();
    this.longPressTimer = setTimeout(() => {
      this.activeMessageId = messageId;
      this.cancelTap = true;
      this.vibrateLight();
    }, 340);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private resetSwipe(): void {
    this.swipeMessageId = null;
    this.swipeTranslateX = 0;
  }

  private resetGestureState(): void {
    this.gesturePointerId = null;
    this.gestureMessageId = null;
    this.isSwiping = false;
    this.cancelTap = false;
  }

  private shouldIgnoreGesture(event: PointerEvent): boolean {
    const target = event.target as HTMLElement | null;
    return !!target?.closest('button, textarea, input, a, .msg-actions, .reactions-bar, .msg-reactions');
  }

  // ── Scroll ────────────────────────────────────────────────────────────────
  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messageScroller?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
        this.isNearBottom = true;
        this.showScrollButton = false;
        this.newMessagesWhileScrolled = 0;
      }
    }, 50);
  }

  // ── Day helpers ───────────────────────────────────────────────────────────
  private dayKey(value: string): string | null {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private formatDayLabel(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  private formatLastSeen(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'recently';
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  // ── Attachment helpers ────────────────────────────────────────────────────
  private resolveAttachmentPreviewType(message: ChatMessage): 'image' | 'pdf' | null {
    const ct = (message.attachmentContentType || '').toLowerCase();
    const fn = (message.attachmentFileName || '').toLowerCase();
    if (
        IMAGE_MIME_PREFIXES.some((p) => ct.startsWith(p)) ||
        IMAGE_EXTENSIONS.test(fn)
    )
      return 'image';
    if (ct === 'application/pdf' || fn.endsWith('.pdf')) return 'pdf';
    return null;
  }

  private isPreviewSupported(message: ChatMessage): boolean {
    return this.resolveAttachmentPreviewType(message) !== null;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private normalizeAttachmentBlob(blob: Blob, message: ChatMessage): Blob {
    const type = this.resolveAttachmentMimeType(message);
    if (!type || blob.type === type) return blob;
    return new Blob([blob], { type });
  }

  private resolveAttachmentMimeType(message: ChatMessage): string {
    const ct = (message.attachmentContentType || '').trim().toLowerCase();
    if (ct) return ct;
    const fn = (message.attachmentFileName || '').toLowerCase();
    if (fn.endsWith('.pdf')) return 'application/pdf';
    if (/\.png$/.test(fn)) return 'image/png';
    if (/\.jpe?g$/.test(fn)) return 'image/jpeg';
    if (fn.endsWith('.webp')) return 'image/webp';
    if (fn.endsWith('.gif')) return 'image/gif';
    return 'application/octet-stream';
  }

  private clearAttachmentPreviewState(close = true): void {
    if (this.attachmentPreviewUrl) URL.revokeObjectURL(this.attachmentPreviewUrl);
    this.attachmentPreviewUrl = null;
    this.attachmentPreviewSafeUrl = null;
    this.attachmentPreviewType = null;
    this.attachmentPreviewLoading = false;
    this.attachmentPreviewName = '';
    if (close) this.attachmentPreviewOpen = false;
  }

  private loadReactionsForMessages(messages: ChatMessage[]): void {
    messages.forEach((m) => {
      this.chat
          .listMessageReactions(m.messageId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((reactions) => {
            this.messageReactions = { ...this.messageReactions, [m.messageId]: reactions };
          });
    });
  }

  shouldShowAvatar(message: ChatMessage): boolean {
    const idx = this.messages.findIndex(m => m.messageId === message.messageId);
    if (idx === -1) return false;
    const next = this.messages[idx + 1];
    // Show avatar if next message is from a different sender or doesn't exist
    return !next || next.mine !== message.mine;
  }

  /**
   * Returns true when the message text is purely emoji character(s) (1-3 emoji).
   * These get a larger, bubbleless display like WhatsApp/Instagram.
   */
  isEmojiOnly(message: ChatMessage): boolean {
    const text = (message.messageText || '').trim();
    if (!text || message.attachmentFileName) return false;
    // Match 1-3 emoji code points only
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}){1,3}$/u;
    return emojiRegex.test(text);
  }
}