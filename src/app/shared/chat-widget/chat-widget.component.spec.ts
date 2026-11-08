import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatConversation, ChatUser } from '../../core/models/chat.models';
import { ChatWidgetComponent } from './chat-widget.component';

describe('ChatWidgetComponent circle gate', () => {
  let component: ChatWidgetComponent;
  let httpMock: HttpTestingController;

  const user = (overrides: Partial<ChatUser>): ChatUser => ({
    userId: 0,
    name: 'User',
    email: 'user@example.com',
    online: false,
    lastSeenAt: null,
    profilePictureUrl: null,
    active: true,
    ...overrides,
  });

  const conversation = (overrides: Partial<ChatConversation>): ChatConversation => ({
    conversationId: 1,
    otherUserId: 2,
    otherUserName: 'Other',
    otherUserEmail: 'other@example.com',
    otherUserOnline: false,
    otherUserLastSeenAt: null,
    otherUserProfilePictureUrl: null,
    otherUserActive: true,
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(ChatWidgetComponent, { set: { template: '' } })
      .compileComponents();

    component = TestBed.createComponent(ChatWidgetComponent).componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function withCircle(ids: number[]): void {
    component.circleUserIds = new Set(ids);
    component.circleIds = new Map(ids.map((id, index) => [id, index + 1]));
  }

  it('creates the widget', () => {
    expect(component).toBeTruthy();
  });

  it('lists only conversations with circle members', () => {
    withCircle([2, 3]);
    component.conversations = [
      conversation({ conversationId: 1, otherUserId: 2 }),
      conversation({ conversationId: 2, otherUserId: 9 }),
    ];

    expect(component.visibleConversations.map((c) => c.conversationId)).toEqual([1]);
  });

  it('filters the new-chat picker to circle members', () => {
    withCircle([2, 3]);
    component.users = [
      user({ userId: 1, name: 'Alice' }),
      user({ userId: 2, name: 'Bob' }),
      user({ userId: 9, name: 'Dave' }),
    ];

    expect(component.filteredNewChatUsers.map((u) => u.userId)).toEqual([2]);
  });

  it('reports circle membership and locks non-member conversations', () => {
    withCircle([2]);
    expect(component.isInMyCircle(2)).toBeTrue();
    expect(component.isInMyCircle(9)).toBeFalse();
    expect(component.conversationLocked(conversation({ otherUserId: 9 }))).toBeTrue();
    expect(component.conversationLocked(conversation({ otherUserId: 2 }))).toBeFalse();
  });

  it('blocks sending and explains the lock for a non-member', () => {
    withCircle([2]);
    component.activeConversation = conversation({ otherUserId: 9 });

    expect(component.canSendToActiveUser).toBeFalse();
    expect(component.isChatLocked).toBeTrue();
    expect(component.chatLockedReason).toContain('circle');
  });

  it('allows sending to a circle member', () => {
    withCircle([2]);
    component.activeConversation = conversation({ otherUserId: 2 });

    expect(component.canSendToActiveUser).toBeTrue();
    expect(component.isChatLocked).toBeFalse();
    expect(component.chatLockedReason).toBe('');
  });

  it('reports when no circle members exist', () => {
    withCircle([]);
    expect(component.hasCircleMembers).toBeFalse();
    withCircle([2]);
    expect(component.hasCircleMembers).toBeTrue();
  });

  it('keeps the disabled note for a disabled circle member', () => {
    withCircle([2]);
    component.activeConversation = conversation({ otherUserId: 2, otherUserActive: false });
    expect(component.isChatLocked).toBeTrue();
    expect(component.chatLockedReason).toContain('disabled');
  });
});
