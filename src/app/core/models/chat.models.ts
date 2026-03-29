export interface ChatUser {
  userId: number;
  name: string;
  email: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface ChatConversation {
  conversationId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserEmail: string;
  otherUserOnline: boolean;
  otherUserLastSeenAt: string | null;
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
}

export interface ChatMessagePage {
  items: ChatMessage[];
  page: number;
  size: number;
  hasNext: boolean;
}
