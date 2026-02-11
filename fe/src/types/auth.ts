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
