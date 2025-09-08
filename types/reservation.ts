import {Car} from "@/types/car";

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

export interface ReservationPayload extends ReservationFormData {
  services: Service[];
  price_per_day: number;
  total_services: number;
  coupon_amount: number;
  total: number;
  sub_total: number;
  reservationId: string;
  selectedCar: Car;
}
