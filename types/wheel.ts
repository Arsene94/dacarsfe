export interface Prize {
  id: number;
  name: string;
  description: string;
  discount_percentage: number;
  probability: number;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface SpinResult {
  success: boolean;
  prize: Prize;
  code?: string;
  message: string;
}

export const WHEEL_OF_FORTUNE_TYPES = [
  'percentage_discount',
  'fixed_discount',
  'extra_rental_day',
  'vehicle_upgrade',
  'try_again',
  'extra_service',
  'voucher',
  'other',
] as const;

export type WheelOfFortuneType =
  | (typeof WHEEL_OF_FORTUNE_TYPES)[number]
  | (string & {});

export interface WheelOfFortuneSlice {
  id: number;
  period_id: number;
  title: string;
  description?: string | null;
  color: string;
  probability: number;
  type: WheelOfFortuneType;
  created_at?: string | null;
  updated_at?: string | null;
}

export type WheelPrize = WheelOfFortuneSlice;

export interface WheelOfFortunePeriod {
  id: number;
  name: string;
  start_at?: string | null;
  end_at?: string | null;
  is_active?: boolean;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WheelOfFortunePrizePayload {
  wheel_of_fortune_id: number;
  name: string;
  phone: string;
  ip_address?: string;
}

export interface WheelOfFortunePrizeWinner {
  id: number;
  wheel_of_fortune_id: number;
  name: string;
  phone: string;
  ip_address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  wheel_of_fortune?: WheelOfFortuneSlice | null;
}

export interface WheelOfFortuneProps {
  isPopup?: boolean;
  onClose?: () => void;
}
