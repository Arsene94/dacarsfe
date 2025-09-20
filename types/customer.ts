export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  dob?: string | null;
  status?: string | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface CustomerAuthResponse {
  token: string;
  customer: Customer;
}

export interface CustomerRegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  [key: string]: unknown;
}

export interface CustomerLoginPayload {
  email: string;
  password: string;
}

export interface CustomerForgotPasswordPayload {
  email: string;
}

export interface CustomerResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CustomerVerifyPayload {
  token: string;
}

export interface CustomerProfileResponse {
  data: Customer;
}
