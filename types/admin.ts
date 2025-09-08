export interface AdminReservation {
  id: string;
  customerName: string;
  phone: string;
  carId: number;
  carName: string;
  startDate: string;
  endDate: string;
  plan: number,
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  total: number;
  email?: string;
  pickupTime?: string;
  dropoffTime?: string;
  location?: string;
  discountCode?: string;
  notes?: string;
  createdAt?: string;
}

export interface AdminBooking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  car_name: string;
  rental_start_date: string;
  rental_end_date: string;
  price_per_day: number;
  total_services: number;
  coupon_amount: number;
  sub_total: number;
  total: number;
  status: string;
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
  status: 'available' | 'rented' | 'maintenance';
  rating?: number;
  description?: string;
  specs?: string[];
  licensePlate?: string;
  year?: number;
  mileage?: number;
  lastService?: string;
  nextService?: string;
}
