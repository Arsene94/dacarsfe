export interface AdminReservation {
  id: string;
  customerName: string;
  phone: string;
  carId: number;
  carName: string;
  startDate: string;
  endDate: string;
  plan: number,
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
