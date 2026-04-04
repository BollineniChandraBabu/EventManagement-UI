export interface ChatUser {
  userId: number;
  name: string;
  email: string;
  online: boolean;
  lastSeenAt: string | null;
  active?: boolean;
}

export interface ChatConversation {
  conversationId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserEmail: string;
  otherUserOnline: boolean;
  otherUserLastSeenAt: string | null;
  otherUserActive?: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  messageText: string | null;
  attachmentKey: string | null;
  attachmentFileName: string | null;
  attachmentContentType: string | null;
  sentAt: string;
  seenAt: string | null;
  mine: boolean;
  replyToMessageId?: number | null;
  replyToMessageText?: string | null;
  reactionEmoji?: string | null;
}

export interface ChatMessagePage {
  items: ChatMessage[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface ChatSeenOrTypingEvent {
  type: 'SEEN' | 'TYPING';
  conversationId: number;
  viewerId?: number;
  userId?: number;
  typing?: boolean;
}

export interface ChatDeleteEvent {
  type: 'MESSAGE_DELETED';
  conversationId: number;
  messageId: number;
  deletedByUserId: number;
}

export interface ChatEditEvent {
  type: 'MESSAGE_EDITED';
  message: ChatMessage;
  editedByUserId: number;
}

export interface ChatPresenceEvent {
  type: 'PRESENCE';
  userId: number;
  online: boolean;
  lastSeenAt: string | null;
}

export type ChatSocketEvent = ChatMessage | ChatSeenOrTypingEvent | ChatDeleteEvent | ChatEditEvent | ChatPresenceEvent;
