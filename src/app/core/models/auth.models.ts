import { UserRole } from '../constants/roles.constants';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  loginLocation?: string;
  forceMfa?: boolean;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: UserRole;
  unreadChatMessagesCount?: number;
}

export interface OtpRequest {
  email: string;
}

export interface OtpVerifyRequest {
  email: string;
  otp: string;
}

export interface LoginOtpVerifyRequest {
  email: string;
  otp: string;
  rememberMe?: boolean;
  loginLocation?: string;
  provider?: "PASSWORD" | "GOOGLE";
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * One-click sign-in from an emailed link (circle requests). The token comes from
 * `POST /api/auth/direct-login`'s `token`; `email` must match the token's owner.
 */
export interface DirectLoginRequest {
  token: string;
  email?: string;
  loginLocation?: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
}


export interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber?: string;
}

export interface UpdateUserProfileRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
}
