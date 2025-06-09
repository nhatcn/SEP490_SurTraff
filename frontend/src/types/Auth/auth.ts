export interface LoginFormData {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  username: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  role: string;
}

export interface AuthError {
  error?: string;
  detail?: string;
}

export interface AuthState {
  isLoading: boolean;
  error: string;
  isSubmitted?: boolean; // For forgot password
}