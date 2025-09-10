export interface ActivityCar {
  id: number;
  name: string;
  license_plate: string;
}

export interface ActivityReservation {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  flight_number: string | null;
  note: string | null;
  status: string;
  car_id: number;
  days: number;
  price_per_day: number;
  sub_total: number;
  total: number;
  total_services: number;
  coupon_amount: number;
  coupon_type: string;
  with_deposit: boolean;
  customer_id: number | null;
  rental_start_date: string;
  rental_end_date: string;
  start_hour_group: string;
  end_hour_group: string;
  child_seat_service_name: string | null;
  car: ActivityCar;
  services: { id: number; name: string }[];
}

export interface WidgetActivityResponse {
  day: string;
  period: string;
  hours: string[];
  data: ActivityReservation[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}
