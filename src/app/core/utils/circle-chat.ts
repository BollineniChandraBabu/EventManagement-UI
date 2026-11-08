import { ChatConversation, ChatUser } from '../models/chat.models';

export interface MessageGateTarget {
  userId: number;
  active?: boolean;
}

/**
 * Pure helpers behind the chat circle gate. The backend can restrict messaging to accepted circle
 * members (`app.chat.circles-only`); the widget applies the same rule to what it shows and sends.
 */

/** True when the target user is an accepted member of the signed-in user's circle. */
export function isInCircle(circleUserIds: ReadonlySet<number>, userId: number): boolean {
  return circleUserIds.has(userId);
}

/** Whether a message may be sent: the user must be in the circle and not disabled. */
export function canMessage(target: MessageGateTarget | null, circleUserIds: ReadonlySet<number>): boolean {
  if (!target) return false;
  if (target.active === false) return false;
  return isInCircle(circleUserIds, target.userId);
}

/** Why the composer is locked, or '' when messaging is allowed. */
export function messageLockReason(
  target: MessageGateTarget | null,
  circleUserIds: ReadonlySet<number>
): string {
  if (!target) return '';
  if (target.active === false) return 'This user is disabled — read only.';
  if (!isInCircle(circleUserIds, target.userId)) {
    return 'Only people in your circle can be messaged. Add them from the Family & Friends page.';
  }
  return '';
}

/** Filters chat users down to accepted circle members, then by the given search term. */
export function filterCircleUsers(
  users: readonly ChatUser[],
  circleUserIds: ReadonlySet<number>,
  search: string,
  limit = 8
): ChatUser[] {
  const query = search.trim().toLowerCase();
  return users
    .filter((u) => u.active !== false)
    .filter((u) => isInCircle(circleUserIds, u.userId))
    .filter(
      (u) =>
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
    .slice(0, limit);
}

/** Keep only conversations whose other user is an accepted circle member. */
export function filterCircleConversations(
  conversations: readonly ChatConversation[],
  circleUserIds: ReadonlySet<number>
): ChatConversation[] {
  return conversations.filter((c) => isInCircle(circleUserIds, c.otherUserId));
}
