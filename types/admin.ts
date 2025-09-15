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
  image?: string;
  price: number;
  features?: {
    passengers: number;
    transmission: string;
    fuel: string;
    doors: number;
    luggage: number;
  };
  status: 'available' | 'maintenance' | 'out_of_service';
  rating?: number;
  description?: string;
  specs?: string[];
  licensePlate?: string;
  year?: number;
  mileage?: number;
  lastService?: string;
  nextService?: string;
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
