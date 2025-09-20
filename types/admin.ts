import type { ApiCar } from "@/types/car";
import type { ReservationWheelPrizeSummary, ServiceStatus } from "@/types/reservation";

export interface AdminReservation {
  id: string;
  bookingNumber?: number | string;
  customerName: string;
  phone: string;
  carId: number;
  carName: string;
  carLicensePlate?: string;
  startDate: string;
  endDate: string;
  plan: number;
  status:
    | 'pending'
    | 'no_answer'
    | 'waiting_advance_payment'
    | 'reserved'
    | 'completed'
    | 'cancelled';
  total: number;
  pricePerDay?: number;
  servicesPrice?: number;
  discount?: number;
  totalBeforeWheelPrize?: number | null;
  wheelPrizeDiscount?: number | null;
  wheelPrize?: ReservationWheelPrizeSummary | null;
  email?: string;
  days?: number;
  pickupTime?: string;
  dropoffTime?: string;
  location?: string;
  discountCode?: string;
  notes?: string;
  createdAt?: string;
  couponAmount: number;
  subTotal: number;
  taxAmount: number;
}

export interface AdminCar {
  id: number;
  name: string;
  type: string;
  typeId?: number | null;
  vehicleTypeId?: number | null;
  vehicleTypeName?: string;
  image?: string;
  images?: string[];
  price: number;
  features?: {
    passengers: number;
    transmission: string;
    fuel: string;
    doors: number;
    luggage: number;
    transmissionId?: number | null;
    fuelId?: number | null;
  };
  makeId?: number | null;
  makeName?: string;
  transmissionId?: number | null;
  transmissionName?: string;
  fuelTypeId?: number | null;
  fuelTypeName?: string;
  status: 'available' | 'maintenance' | 'out_of_service';
  rating?: number;
  description?: string;
  content?: string;
  specs?: string[];
  licensePlate?: string;
  year?: number;
  mileage?: number;
  lastService?: string;
  nextService?: string;
  numberOfSeats?: number | null;
  numberOfDoors?: number | null;
  vin?: string;
  deposit?: number | null;
  weight?: number | null;
  weightFront?: number | null;
  isPartner?: boolean;
  partnerId?: number | null;
  partnerPercentage?: number | null;
}

export interface AdminCategory {
  id: number;
  name: string;
  description?: string;
}

export type CategoryPriceCalendarMonthKey =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

export interface CategoryPriceCalendar {
  id?: number;
  category_id: number;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryPrice {
  id?: number;
  category_id: number;
  days: number;
  days_end: number;
  price: string;
  created_at?: string;
  updated_at?: string;
  tempId?: string;
  price_calendar?: CategoryPriceCalendar;
}

export interface DynamicPricePercentage {
  id?: number;
  dynamic_price_id?: number;
  percentage_start: number;
  percentage_end: number;
  percentage_amount: number;
}

export interface DynamicPrice {
  id: number;
  start_from: string;
  end_to: string;
  enabled: boolean;
  author_id?: number;
  created_at?: string;
  updated_at?: string;
  percentages: DynamicPricePercentage[];
}

export interface AdminService {
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

export interface AdminBookingLinkedService {
  id?: number | string;
  name?: string | null;
  price?: number | string | null;
  pivot?: {
    price?: number | string | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface AdminBookingResource {
  id?: number | string;
  booking_number?: number | string;
  bookingNumber?: number | string;
  car_id?: number | string | null;
  car_name?: string | null;
  car_license_plate?: string | null;
  car_transmission?: string | null;
  car_fuel?: string | null;
  car_deposit?: number | string | null;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  with_deposit?: boolean | number | string | null;
  coupon_type?: string | null;
  coupon_amount?: number | string | null;
  coupon_code?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_age?: number | string | null;
  customer_id?: number | string | null;
  price_per_day?: number | string | null;
  original_price_per_day?: number | string | null;
  base_price?: number | string | null;
  base_price_casco?: number | string | null;
  total_services?: number | string | null;
  services?: AdminBookingLinkedService[] | null;
  service_ids?: Array<number | string>;
  sub_total?: number | string | null;
  subTotal?: number | string | null;
  total?: number | string | null;
  total_price?: number | string | null;
  tax_amount?: number | string | null;
  days?: number | string | null;
  advance_payment?: number | string | null;
  keep_old_price?: boolean | number | string | null;
  send_email?: boolean | number | string | null;
  status?: string | null;
  note?: string | null;
  notes?: string | null;
  currency_id?: number | string | null;
  currencyId?: number | string | null;
  total_before_wheel_prize?: number | string | null;
  wheel_prize_discount?: number | string | null;
  wheel_prize?: ReservationWheelPrizeSummary | null;
  discount?: number | string | null;
  discount_type?: string | null;
  location?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  image_preview?: string | null;
  customer?: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    age?: number | string | null;
    [key: string]: unknown;
  } | null;
  car?: (ApiCar & { deposit?: number | string | null }) | null;
  [key: string]: unknown;
}

export interface AdminBookingCustomerSummary {
  id?: number | string | null;
  name: string;
  phone: string;
  email: string;
}

export interface AdminBookingCarOption extends ApiCar {
  license_plate: string;
  transmission: { name: string | null } | null;
  fuel: { name: string | null } | null;
}

export interface AdminBookingFormValues {
  id: number | string | null;
  booking_number: number | string | null;
  rental_start_date: string;
  rental_end_date: string;
  with_deposit: boolean;
  service_ids: number[];
  services: AdminBookingLinkedService[];
  total_services: number;
  coupon_type: string;
  coupon_amount: number;
  coupon_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_id: number | string | null;
  customer_age: number | string | null;
  car_id: number | null;
  car_name: string;
  car_image: string;
  car_license_plate: string;
  car_transmission: string;
  car_fuel: string;
  car_deposit: number | null;
  sub_total: number;
  total: number;
  price_per_day: number;
  original_price_per_day: number | null;
  base_price: number | null;
  base_price_casco: number | null;
  days: number;
  keep_old_price: boolean;
  send_email: boolean;
  advance_payment: number;
  status: string;
  note: string;
  currency_id: number | string | null;
  total_before_wheel_prize: number | null;
  wheel_prize_discount: number;
  wheel_prize: ReservationWheelPrizeSummary | null;
  discount_applied?: number | null;
  location?: string;
  tax_amount?: number;
}

export const createEmptyBookingForm = (): AdminBookingFormValues => ({
  id: null,
  booking_number: null,
  rental_start_date: "",
  rental_end_date: "",
  with_deposit: true,
  service_ids: [],
  services: [],
  total_services: 0,
  coupon_type: "",
  coupon_amount: 0,
  coupon_code: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_id: null,
  customer_age: null,
  car_id: null,
  car_name: "",
  car_image: "",
  car_license_plate: "",
  car_transmission: "",
  car_fuel: "",
  car_deposit: null,
  sub_total: 0,
  total: 0,
  price_per_day: 0,
  original_price_per_day: null,
  base_price: null,
  base_price_casco: null,
  days: 0,
  keep_old_price: true,
  send_email: true,
  advance_payment: 0,
  status: "",
  note: "",
  currency_id: null,
  total_before_wheel_prize: null,
  wheel_prize_discount: 0,
  wheel_prize: null,
  discount_applied: null,
  location: "",
  tax_amount: 0,
});

export interface BookingContractFormState {
  cnp: string;
  license: string;
  bookingNumber: string;
  name: string;
  phone: string;
  email: string;
  start: string;
  end: string;
  car: AdminBookingCarOption | null;
  deposit: string;
  pricePerDay: string;
  advance: string;
  services: string;
  withDeposit: boolean;
}

export interface CustomerPhoneSearchResult {
  id?: number | string | null;
  email?: string | null;
  phones?: string[] | null;
  latest?: { name?: string | null } | null;
  names?: string[] | null;
  [key: string]: unknown;
}

export interface BookingContractResponse {
  url?: string | null;
  contract_url?: string | null;
  [key: string]: unknown;
}
