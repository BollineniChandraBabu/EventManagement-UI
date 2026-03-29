import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatConversation, ChatMessage, ChatMessagePage, ChatUser } from '../models/chat.models';
import { AuthService } from './auth.service';

interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly socketEventsSubject = new Subject<ChatMessage | { type: 'SEEN' | 'TYPING'; conversationId: number; viewerId?: number; userId?: number; typing?: boolean }>();
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
    return this.http.get<ChatUser[]>(`${environment.apiUrl}/chat/users`);
  }

  listConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${environment.apiUrl}/chat/conversations`);
  }

  conversationMessages(otherUserId: number, page = 0, size = 30, markSeen = true): Observable<ChatMessagePage> {
    return this.http.get<ChatMessagePage>(`${environment.apiUrl}/chat/messages/${otherUserId}`, {
      params: new HttpParams()
        .set('page', page)
        .set('size', size)
        .set('markSeen', markSeen)
    });
  }

  sendMessage(receiverId: number, messageText: string): Observable<ChatMessage> {
    const payload = { receiverId, messageText };
    const form = new FormData();
    form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    return this.http.post<ChatMessage>(`${environment.apiUrl}/chat`, form);
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
    if (!this.stompConnected || this.subscribedTopics.has(topic)) {
      return;
    }

    this.sendFrame('SUBSCRIBE', {
      id: `sub-${conversationId}`,
      destination: topic
    });
    this.subscribedTopics.add(topic);
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
        return;
      }

      if (parsed.command === 'MESSAGE') {
        try {
          const body = JSON.parse(parsed.body || '{}');
          if (body.type === 'SEEN' || body.type === 'TYPING') {
            this.socketEventsSubject.next(body);
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
}
