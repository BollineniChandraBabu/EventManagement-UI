/** State of a circle request: sent, accepted or rejected (mirrors the backend `CircleStatus`). */
export type CircleStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** One accepted member of the signed-in user's circle. */
export interface CircleMember {
  circleId: number;
  userId: number;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
  online: boolean;
  lastSeenAt: string | null;
}

/** A pending request, together with which way it points. */
export interface CircleRequest {
  circleId: number;
  userId: number;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
  incoming: boolean;
  status: CircleStatus;
  createdAt: string;
}

export interface CircleListResponse {
  circles: CircleMember[];
  incomingRequests: CircleRequest[];
  outgoingRequests: CircleRequest[];
}

/** The relationship between the signed-in user and one other user. */
export interface CircleStatusResponse {
  userId: number;
  status: CircleStatus | null;
  inCircle: boolean;
  circleId: number | null;
}
