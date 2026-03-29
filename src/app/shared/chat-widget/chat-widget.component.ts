import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ChatConversation, ChatMessage, ChatUser } from '../../core/models/chat.models';
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

  isOpen = false;
  isLoading = false;
  composer = '';
  currentUserId: number | null = null;

  conversations: ChatConversation[] = [];
  users: ChatUser[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];

  constructor() {
    this.chat.currentUserId$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.currentUserId = id;
    });

    this.chat.socketEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if ('type' in event) {
        if (event.type === 'SEEN') {
          this.messages = this.messages.map((msg) =>
            msg.conversationId === event.conversationId && msg.mine ? { ...msg, seenAt: new Date().toISOString() } : msg
          );
        }
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

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.bootstrapChat();
      return;
    }

    this.chat.publishPresence(this.currentUserId ?? 0, false);
  }

  closeConversation(): void {
    this.activeConversation = null;
    this.messages = [];
  }

  chooseConversation(conversation: ChatConversation): void {
    this.activeConversation = conversation;
    this.chat.subscribeToConversation(conversation.conversationId);
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
  }

  send(): void {
    const text = this.composer.trim();
    if (!text || !this.activeConversation || !this.currentUserId) {
      return;
    }

    const receiverId = this.activeConversation.otherUserId;
    const sentRealtime = this.chat.sendRealtimeMessage(this.currentUserId, receiverId, text);

    if (!sentRealtime) {
      this.chat.sendMessage(receiverId, text).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
        this.messages = [...this.messages, message];
        this.upsertConversationFromMessage(message);
        this.scrollToBottom();
      });
    }

    this.composer = '';
  }

  private bootstrapChat(): void {
    this.isLoading = true;
    this.chat.ensureCurrentUser().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => (this.isLoading = false))
    ).subscribe(() => {
      this.chat.connectSocket();
      if (this.currentUserId) {
        this.chat.publishPresence(this.currentUserId, true);
      }
      this.reloadLists();
    });
  }

  private reloadLists(): void {
    this.chat.listConversations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.conversations = items;
      if (items.length && !this.activeConversation) {
        this.chooseConversation(items[0]);
      }
    });

    this.chat.listUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.users = items;
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
        lastMessage: message.messageText,
        lastMessageAt: message.sentAt,
        unreadCount: shouldIncreaseUnread ? item.unreadCount + 1 : item.unreadCount
      } : item);
      return;
    }

    this.reloadLists();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageScroller) {
        this.messageScroller.nativeElement.scrollTop = this.messageScroller.nativeElement.scrollHeight;
      }
    });
  }
}
