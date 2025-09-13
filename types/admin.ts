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
