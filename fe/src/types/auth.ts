// NextAuth 세션 사용자 타입 (AuthProvider, API route 등에서 공유)
export interface SessionUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles?: string[];
  accessToken?: string;
  idToken?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
