import {Car} from "@/types/car";
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
