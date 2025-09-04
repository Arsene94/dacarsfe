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

export interface WheelPrize {
  id: number;
  title: string;
  description: string;
  color: string;
  probability: number;
  type: 'discount' | 'upgrade' | 'free_days' | 'try_again' | 'bonus';
}

export interface WheelOfFortuneProps {
  isPopup?: boolean;
  onClose?: () => void;
}
