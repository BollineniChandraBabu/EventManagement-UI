import { ChatConversation, ChatUser } from '../models/chat.models';
import {
  canMessage,
  filterCircleConversations,
  filterCircleUsers,
  isInCircle,
  messageLockReason,
} from './circle-chat';

describe('circle-chat', () => {
  const circle = new Set<number>([2, 3]);

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

  describe('isInCircle', () => {
    it('is true for an accepted member and false otherwise', () => {
      expect(isInCircle(circle, 2)).toBeTrue();
      expect(isInCircle(circle, 9)).toBeFalse();
    });

    it('is false when the circle is empty', () => {
      expect(isInCircle(new Set<number>(), 2)).toBeFalse();
    });
  });

  describe('canMessage', () => {
    it('allows messaging an active circle member', () => {
      expect(canMessage({ userId: 2, active: true }, circle)).toBeTrue();
    });

    it('blocks a user who is not in the circle', () => {
      expect(canMessage({ userId: 9, active: true }, circle)).toBeFalse();
    });

    it('blocks a disabled circle member', () => {
      expect(canMessage({ userId: 2, active: false }, circle)).toBeFalse();
    });

    it('blocks when there is no target', () => {
      expect(canMessage(null, circle)).toBeFalse();
    });
  });

  describe('messageLockReason', () => {
    it('returns the circle note for a user outside the circle', () => {
      expect(messageLockReason({ userId: 9 }, circle)).toContain('circle');
    });

    it('returns the disabled note for a disabled member', () => {
      expect(messageLockReason({ userId: 2, active: false }, circle)).toContain('disabled');
    });

    it('returns empty when messaging is allowed', () => {
      expect(messageLockReason({ userId: 2, active: true }, circle)).toBe('');
    });

    it('returns empty when there is no target', () => {
      expect(messageLockReason(null, circle)).toBe('');
    });
  });

  describe('filterCircleUsers', () => {
    const users = [
      user({ userId: 1, name: 'Alice', email: 'alice@example.com' }),
      user({ userId: 2, name: 'Bob', email: 'bob@example.com' }),
      user({ userId: 3, name: 'Carol', email: 'carol@example.com', active: false }),
      user({ userId: 9, name: 'Dave', email: 'dave@example.com' }),
    ];

    it('keeps only active members of the circle', () => {
      const ids = filterCircleUsers(users, circle, '').map((u) => u.userId);
      expect(ids).toEqual([2]);
    });

    it('applies the search term within the circle', () => {
      const ids = filterCircleUsers(users, circle, 'bob').map((u) => u.userId);
      expect(ids).toEqual([2]);
      expect(filterCircleUsers(users, circle, 'zzz')).toEqual([]);
    });

    it('caps the number of results', () => {
      const many = Array.from({ length: 20 }, (_, i) =>
        user({ userId: 100 + i, name: `U${i}`, email: `u${i}@example.com` })
      );
      const bigCircle = new Set(many.map((u) => u.userId));
      expect(filterCircleUsers(many, bigCircle, '').length).toBe(8);
      expect(filterCircleUsers(many, bigCircle, '', 3).length).toBe(3);
    });
  });

  describe('filterCircleConversations', () => {
    it('keeps only conversations with circle members', () => {
      const conversations = [
        conversation({ conversationId: 1, otherUserId: 2 }),
        conversation({ conversationId: 2, otherUserId: 9 }),
      ];
      const kept = filterCircleConversations(conversations, circle);
      expect(kept.map((c) => c.conversationId)).toEqual([1]);
    });

    it('returns nothing when the circle is empty', () => {
      const conversations = [conversation({ otherUserId: 2 })];
      expect(filterCircleConversations(conversations, new Set<number>())).toEqual([]);
    });
  });
});
