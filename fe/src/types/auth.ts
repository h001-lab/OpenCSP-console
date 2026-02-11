export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
