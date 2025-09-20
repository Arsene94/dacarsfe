import type { ApiCar, Car } from "@/types/car";
import type { WheelOfFortuneType } from "@/types/wheel";

export interface ReservationFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  flight_number: string;
  rental_start_date: string;
  rental_start_time: string;
  rental_end_date: string;
  rental_end_time: string;
  location: string;
  car_id: number | null;
  coupon_code: string;
}

export type Service = {
  id: number;
  name: string;
  price: number;
};

export interface ReservationWheelPrizeSummary {
  wheel_of_fortune_id: number | null;
  prize_id: number | null;
  title: string;
  type?: WheelOfFortuneType;
  amount?: number | null;
  description?: string | null;
  amount_label?: string | null;
  expires_at?: string | null;
  discount_value: number;
}

export interface ReservationPayload extends ReservationFormData {
  services: Service[];
  price_per_day: number;
  total_services: number;
  coupon_amount: number;
  total: number;
  sub_total: number;
  reservationId: string;
  selectedCar: Car;
  total_before_wheel_prize?: number;
  wheel_prize_discount?: number;
  wheel_prize?: ReservationWheelPrizeSummary | null;
}

export interface DiscountValidationPayload {
  code: string;
  car_id: number | string;
  start_date: string | null | undefined;
  end_date: string | null | undefined;
  price: number | string;
  price_casco: number | string;
  total_price: number | string;
  total_price_casco: number | string;
  [key: string]: unknown;
}

export interface DiscountCouponDetails {
  discount_deposit?: number | string | null;
  discount_casco?: number | string | null;
  [key: string]: unknown;
}

export interface DiscountValidationData extends ApiCar {
  coupon?: DiscountCouponDetails;
  [key: string]: unknown;
}

export interface DiscountValidationResponse {
  valid?: boolean;
  data?: DiscountValidationData;
  message?: string;
  [key: string]: unknown;
}

export interface QuotePricePayload {
  car_id: number | string;
  rental_start_date: string;
  rental_end_date: string;
  base_price?: number | string;
  base_price_casco?: number | string;
  original_price_per_day?: number | string;
  coupon_type?: string | null;
  coupon_amount?: number | string;
  coupon_code?: string | null;
  service_ids?: Array<number | string>;
  with_deposit?: boolean;
  [key: string]: unknown;
}

export interface QuotePriceResponse {
  days: number;
  price_per_day: number;
  rental_rate: number;
  rental_rate_casco: number;
  sub_total: number;
  sub_total_casco?: number;
  total: number;
  total_casco?: number;
  discount?: number;
  total_services?: number;
  [key: string]: unknown;
}

export interface AvailabilityCheckPayload {
  car_id: number | string;
  start_date: string;
  end_date: string;
}

export interface AvailabilityCheckResponse {
  available?: boolean;
  message?: string;
  [key: string]: unknown;
}
