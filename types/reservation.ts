import type { ApiCar, Car } from "@/types/car";
import type { OfferKind } from "@/types/offer";
import type { WheelOfFortuneType } from "@/types/wheel";

export type ServiceStatus =
  | "published"
  | "pending"
  | "unavailable"
  | (string & {});

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

export interface Service {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  content?: string | null;
  status?: ServiceStatus | null;
  image?: string | null;
  logo?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type ServicePayload = Partial<{
  name: string;
  description: string | null;
  content: string | null;
  price: number | string;
  status: ServiceStatus | null;
  image: string | null;
  logo: string | null;
}> & Record<string, unknown>;

export interface ServiceListParams {
  page?: number;
  perPage?: number;
  limit?: number;
  status?: string;
  name_like?: string;
  include?: string;
}

export interface ServiceTranslation {
  lang_code: string;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  [key: string]: unknown;
}

export interface ReservationWheelPrizeSummary {
  wheel_of_fortune_id: number | null;
  prize_id: number | null;
  wheel_of_fortune_prize_id?: number | null;
  title: string;
  type?: WheelOfFortuneType;
  type_label?: string | null;
  amount?: number | null;
  description?: string | null;
  amount_label?: string | null;
  expires_at?: string | null;
  eligible?: boolean | null;
  discount_value: number;
  discount_value_deposit?: number | null;
  discount_value_casco?: number | null;
}

export interface ReservationWheelPrizePayload {
  prize_id: number | string;
  wheel_of_fortune_id?: number | string | null;
  wheel_of_fortune_prize_id?: number | string | null;
  discount_value: number | string;
  eligible?: boolean | null;
  discount_value_deposit?: number | string | null;
  discount_value_casco?: number | string | null;
  [key: string]: unknown;
}

export interface ReservationAppliedOffer {
  id: number;
  title: string;
  offer_type?: OfferKind | null;
  offer_value?: string | null;
  discount_label?: string | null;
  percent_discount_deposit?: number | null;
  percent_discount_casco?: number | null;
  fixed_discount_deposit?: number | null;
  fixed_discount_casco?: number | null;
  fixed_discount_deposit_applied?: number | null;
  fixed_discount_casco_applied?: number | null;
  discount_amount_deposit?: number | null;
  discount_amount_casco?: number | null;
  discount_amount?: number | null;
}

export interface ReservationPayload extends ReservationFormData {
  services?: Service[];
  service_ids?: Array<number | string>;
  price_per_day: number;
  total_services?: number;
  coupon_amount?: number;
  coupon_type?: string | null;
  offers_discount?: number;
  deposit_waived?: boolean;
  total?: number;
  sub_total?: number;
  reservationId?: string;
  selectedCar?: Car;
  with_deposit?: boolean | null;
  total_before_wheel_prize?: number;
  wheel_prize_discount?: number;
  wheel_of_fortune_prize_id?: number | string | null;
  wheel_prize?: ReservationWheelPrizeSummary | ReservationWheelPrizePayload | null;
  applied_offers?: ReservationAppliedOffer[];
  note?: string;
  offer_fixed_discount?: number;
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
  customer_email?: string | null;
  [key: string]: unknown;
}

export interface DiscountCouponDetails {
  discount_deposit?: number | string | null;
  discount_casco?: number | string | null;
  discount_type?: string | null;
  type?: string | null;
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
  with_deposit?: boolean | null;
  customer_email?: string | null;
  coupon_type?: string | null;
  coupon_amount?: number | string;
  coupon_code?: string | null;
  service_ids?: Array<number | string>;
  total_services?: number | string;
  wheel_prize_discount?: number | string;
  wheel_of_fortune_prize_id?: number | string | null;
  wheel_prize?: ReservationWheelPrizePayload | null;
  total_before_wheel_prize?: number | string;
  offers_discount?: number | string;
  offer_fixed_discount?: number | string;
  deposit_waived?: boolean;
  applied_offers?: ReservationAppliedOffer[];
  [key: string]: unknown;
}

export interface QuotePriceResponse {
  price_per_day: number;
  base_price: number;
  base_price_casco?: number;
  sub_total: number;
  sub_total_casco?: number;
  total: number;
  total_casco?: number;
  days?: number;
  rental_rate?: number;
  rental_rate_casco?: number;
  discount?: number;
  coupon_amount?: number;
  coupon_code?: string | null;
  coupon_type?: string | null;
  offers_discount?: number;
  offer_fixed_discount?: number;
  deposit_waived?: boolean;
  total_services?: number;
  service_ids?: number[];
  total_before_wheel_prize?: number;
  wheel_prize_discount?: number;
  applied_offers?: ReservationAppliedOffer[];
  wheel_prize?: ReservationWheelPrizeSummary | null;
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
