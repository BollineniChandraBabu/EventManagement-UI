import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatConversation,
  ChatDeleteEvent,
  ChatEditEvent,
  ChatMessage,
  ChatPresenceEvent,
  ChatMessagePage,
  ChatMessageReaction,
  ChatSocketEvent,
  ChatUser
} from '../models/chat.models';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api.models';

interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly socketEventsSubject = new Subject<ChatSocketEvent>();
  readonly socketEvents$ = this.socketEventsSubject.asObservable();

  private socket: WebSocket | null = null;
  private subscribedTopics = new Set<string>();
  private stompConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly currentUserIdSubject = new BehaviorSubject<number | null>(null);
  readonly currentUserId$ = this.currentUserIdSubject.asObservable();

  ensureCurrentUser(): Observable<number | null> {
    if (this.currentUserIdSubject.value) {
      return of(this.currentUserIdSubject.value);
    }

    return this.auth.getProfile().pipe(
      map((profile) => profile.id ?? null),
      tap((id) => this.currentUserIdSubject.next(id)),
      catchError(() => of(null))
    );
  }

  listUsers(): Observable<ChatUser[]> {
    return this.http.get<ApiResponse<ChatUser[] | { content: ChatUser[] }>>(`${environment.apiUrl}/chat/users`).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  listActiveUsers(): Observable<ChatUser[]> {
    return this.http.get<ApiResponse<ChatUser[] | { content: ChatUser[] }>>(`${environment.apiUrl}/chat/users/active`).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  listConversations(): Observable<ChatConversation[]> {
    return this.http.get<ApiResponse<ChatConversation[] | { content: ChatConversation[] }>>(`${environment.apiUrl}/chat/conversations`).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  conversationMessages(otherUserId: number, page = 0, size = 30, markSeen = true): Observable<ChatMessagePage> {
    return this.http.get<ApiResponse<ChatMessagePage | { content: ChatMessage[]; page?: number; size?: number; hasNext?: boolean }>>(`${environment.apiUrl}/chat/messages/${otherUserId}`, {
      params: new HttpParams().set('page', page).set('size', size).set('markSeen', markSeen)
    }).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeMessagePage(payload, page, size))
    );
  }

  sendMessage(
    receiverId: number,
    messageText: string,
    attachment?: File | null,
    replyToMessageId?: number | null,
    reactionEmoji?: string | null
  ): Observable<ChatMessage> {
    const payload: {
      receiverId: number;
      messageText: string;
      replyToMessageId?: number;
      reactionEmoji?: string;
    } = { receiverId, messageText };

    if (replyToMessageId) {
      payload.replyToMessageId = replyToMessageId;
    }

    if (reactionEmoji) {
      payload.reactionEmoji = reactionEmoji;
    }

    const form = new FormData();
    form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (attachment) {
      form.append('attachment', attachment, attachment.name);
    }
    return this.http.post<ChatMessage>(`${environment.apiUrl}/chat`, form);
  }

  deleteLastSentMessage(otherUserId: number): Observable<{ messageId: number; conversationId: number; deletedAt: string }> {
    return this.http.delete<{ messageId: number; conversationId: number; deletedAt: string }>(
      `${environment.apiUrl}/chat/messages/last/${otherUserId}`
    );
  }

  editMessage(messageId: number, messageText: string): Observable<ChatMessage> {
    return this.http.patch<ChatMessage>(`${environment.apiUrl}/chat/messages/${messageId}`, { messageText });
  }

  listMessageReactions(messageId: number): Observable<ChatMessageReaction[]> {
    return this.http.get<{ messageId: number; reactions: ChatMessageReaction[] }>(`${environment.apiUrl}/chat/messages/${messageId}/reactions`).pipe(
      map((response) => response.reactions ?? [])
    );
  }

  reactToMessage(messageId: number, emoji: string): Observable<ChatMessageReaction[]> {
    return this.http.post<{ messageId: number; reactions: ChatMessageReaction[] }>(
      `${environment.apiUrl}/chat/messages/${messageId}/reactions`,
      { emoji }
    ).pipe(map((response) => response.reactions ?? []));
  }

  removeReaction(messageId: number, emoji: string): Observable<ChatMessageReaction[]> {
    return this.http.request<{ messageId: number; reactions: ChatMessageReaction[] }>(
      'delete',
      `${environment.apiUrl}/chat/messages/${messageId}/like`,
      { body: { emoji } }
    ).pipe(map((response) => response.reactions ?? []));
  }

  downloadAttachment(messageId: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/chat/messages/${messageId}/attachment`, { responseType: 'blob' });
  }

  heartbeat(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/chat/presence/heartbeat`, {});
  }

  markOffline(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/chat/presence/offline`, {});
  }

  subscribePresence(): void {
    const topic = '/topic/presence';
    const alreadySubscribed = this.subscribedTopics.has(topic);
    this.subscribedTopics.add(topic);
    if (!this.stompConnected || alreadySubscribed) {
      return;
    }

    this.sendFrame('SUBSCRIBE', {
      id: 'sub-presence',
      destination: topic
    });
  }

  connectSocket(): void {
    if (this.stompConnected || this.socket) {
      return;
    }

    const wsBase = environment.apiUrl.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
    this.socket = new WebSocket(`${wsBase}/ws-chat/websocket`);

    this.socket.onopen = () => {
      this.sendFrame('CONNECT', {
        'accept-version': '1.2,1.1,1.0',
        'heart-beat': '10000,10000'
      });
    };

    this.socket.onmessage = (event) => this.processFrame(String(event.data));
    this.socket.onclose = () => this.handleDisconnect();
    this.socket.onerror = () => this.handleDisconnect();
  }

  disconnectSocket(): void {
    this.subscribedTopics.clear();
    this.stompConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribeToConversation(conversationId: number): void {
    const topic = `/topic/chat/${conversationId}`;
    const alreadySubscribed = this.subscribedTopics.has(topic);
    this.subscribedTopics.add(topic);

    if (!this.stompConnected || alreadySubscribed) {
      return;
    }

    this.sendFrame('SUBSCRIBE', {
      id: `sub-chat-${conversationId}`,
      destination: topic
    });
  }

  publishTyping(conversationId: number, userId: number, typing: boolean): void {
    if (!this.stompConnected) {
      return;
    }

    this.publish('/app/chat.typing', { conversationId, userId, typing });
  }

  publishSeen(conversationId: number, viewerId: number, otherUserId: number): void {
    if (!this.stompConnected) {
      return;
    }

    this.publish('/app/chat.seen', { conversationId, viewerId, otherUserId });
  }

  sendRealtimeMessage(senderId: number, receiverId: number, messageText: string): boolean {
    if (!this.stompConnected) {
      return false;
    }

    this.publish('/app/chat.send', { senderId, receiverId, messageText });
    return true;
  }

  publishPresence(userId: number, online: boolean): void {
    if (!this.stompConnected) {
      return;
    }

    this.publish('/app/chat.presence', { userId, online });
  }

  private publish(destination: string, body: unknown): void {
    this.sendFrame('SEND', {
      destination,
      'content-type': 'application/json'
    }, JSON.stringify(body));
  }

  private sendFrame(command: string, headers: Record<string, string>, body = ''): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    let frame = `${command}\n`;
    Object.entries(headers).forEach(([key, value]) => {
      frame += `${key}:${value}\n`;
    });
    frame += `\n${body}\u0000`;
    this.socket.send(frame);
  }

  private processFrame(data: string): void {
    const frames = data.split('\u0000').filter((part) => part.trim().length > 0);
    frames.forEach((raw) => {
      const parsed = this.parseFrame(raw);
      if (!parsed) {
        return;
      }

      if (parsed.command === 'CONNECTED') {
        this.stompConnected = true;
        this.subscribedTopics.forEach((topic) => {
          const subId = topic === '/topic/presence' ? 'sub-presence' : `sub-chat-${topic.split('/').pop()}`;
          this.sendFrame('SUBSCRIBE', { id: subId, destination: topic });
        });
        return;
      }

      if (parsed.command === 'MESSAGE') {
        try {
          const body = JSON.parse(parsed.body || '{}') as ChatSocketEvent | { type?: string; message?: ChatMessage };
          if ((body as { type?: string }).type === 'SEEN' || (body as { type?: string }).type === 'TYPING') {
            this.socketEventsSubject.next(body as ChatSocketEvent);
            return;
          }

          if ((body as ChatDeleteEvent).type === 'MESSAGE_DELETED') {
            this.socketEventsSubject.next(body as ChatDeleteEvent);
            return;
          }

          if ((body as ChatEditEvent).type === 'MESSAGE_EDITED') {
            this.socketEventsSubject.next(body as ChatEditEvent);
            return;
          }

          if ('userId' in (body as Record<string, unknown>) && 'online' in (body as Record<string, unknown>)) {
            const presence = body as { userId: number; online: boolean; lastSeenAt?: string | null };
            this.socketEventsSubject.next({
              type: 'PRESENCE',
              userId: presence.userId,
              online: presence.online,
              lastSeenAt: presence.lastSeenAt ?? null
            } as ChatPresenceEvent);
            return;
          }

          this.socketEventsSubject.next(body as ChatMessage);
        } catch {
          // Ignore malformed payloads
        }
      }
    });
  }

  private parseFrame(rawFrame: string): StompFrame | null {
    const [headerBlock, ...bodyParts] = rawFrame.split('\n\n');
    const headerLines = headerBlock.split('\n').filter(Boolean);
    if (!headerLines.length) {
      return null;
    }

    const command = headerLines[0].trim();
    const headers: Record<string, string> = {};
    headerLines.slice(1).forEach((line) => {
      const separator = line.indexOf(':');
      if (separator < 0) {
        return;
      }
      headers[line.slice(0, separator)] = line.slice(separator + 1);
    });

    return {
      command,
      headers,
      body: bodyParts.join('\n\n').trim()
    };
  }

  private handleDisconnect(): void {
    this.stompConnected = false;
    this.socket = null;
    this.subscribedTopics.clear();

    if (!this.auth.authenticated()) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => this.connectSocket(), 3000);
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (typeof response === 'object' && response !== null && 'data' in response) {
      return response.data;
    }
    return response as T;
  }

  private normalizeCollection<T>(payload: T[] | { content?: T[] } | unknown): T[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'content' in payload && Array.isArray(payload.content)) {
      return payload.content;
    }

    return [];
  }

  private normalizeMessagePage(
    payload: ChatMessagePage | { content?: ChatMessage[]; page?: number; size?: number; hasNext?: boolean } | unknown,
    page: number,
    size: number
  ): ChatMessagePage {
    if (payload && typeof payload === 'object' && 'items' in payload && Array.isArray(payload.items)) {
      return payload as ChatMessagePage;
    }

    if (payload && typeof payload === 'object' && 'content' in payload && Array.isArray(payload.content)) {
      const typedPayload = payload as { content: ChatMessage[]; page?: number; size?: number; hasNext?: boolean };
      return {
        items: typedPayload.content,
        page: typedPayload.page ?? page,
        size: typedPayload.size ?? size,
        hasNext: typedPayload.hasNext ?? false
      };
    }

    return { items: [], page, size, hasNext: false };
  }
}
