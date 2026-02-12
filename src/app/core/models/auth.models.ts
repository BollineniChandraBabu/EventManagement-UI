export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: 'ADMIN' | 'USER';
}

export interface OtpRequest {
  email: string;
}

export interface OtpVerifyRequest {
  email: string;
  otp: string;
}
