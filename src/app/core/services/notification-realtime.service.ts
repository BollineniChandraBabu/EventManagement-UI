import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/api.models';

interface NotificationSocketEvent { type?: string; notification?: NotificationItem; }

@Injectable({ providedIn: 'root' })
export class NotificationRealtimeService {
  private socket: WebSocket | null = null;
  private connected = false;
  private readonly subject = new Subject<NotificationItem | null>();
  readonly published$: Observable<NotificationItem | null> = this.subject.asObservable();

  connect(): void {
    if (this.socket) return;
    const wsBase = environment.apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
    this.socket = new WebSocket(`${wsBase}/ws-chat/websocket`);
    this.socket.onopen = () => this.send('CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\u0000');
    this.socket.onmessage = (event) => this.handleFrame(String(event.data));
    this.socket.onclose = () => { this.connected = false; this.socket = null; };
  }

  private handleFrame(frame: string): void {
    if (frame.startsWith('CONNECTED')) {
      this.connected = true;
      this.send('SUBSCRIBE\nid:sub-notifications\ndestination:/topic/notifications\n\n\u0000');
      return;
    }
    if (!frame.startsWith('MESSAGE')) return;
    const body = frame.split('\n\n')[1]?.replace(/\u0000/g, '').trim();
    if (!body) return;
    try {
      const parsed = JSON.parse(body) as NotificationSocketEvent;
      if (parsed.type === 'NOTIFICATION_PUBLISHED' && parsed.notification) this.subject.next(parsed.notification);
      if (parsed.type === 'NOTIFICATION_UNPUBLISHED') this.subject.next(null);
    } catch {}
  }

  private send(frame: string): void { if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.send(frame); }
}
