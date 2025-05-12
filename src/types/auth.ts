export interface User {
  email: string;
  name: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
} 