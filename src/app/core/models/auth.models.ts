import { UserRole } from '../constants/roles.constants';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  loginLocation?: string;
  forceMfa?: boolean;
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
