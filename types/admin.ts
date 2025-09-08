export interface AdminReservation {
  id: string;
  customerName: string;
  phone: string;
  carId: number;
  carName: string;
  startDate: string;
  endDate: string;
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

export interface ActivityCar {
  id: number;
  name: string;
  license_plate: string;
}

export interface ActivityItem {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  note: string | null;
  status: string;
  car_id: number;
  customer_id: number | null;
  rental_start_date: string;
  rental_end_date: string;
  extension_date?: string | null;
  start_hour_group: string;
  end_hour_group: string;
  child_seat_service_name: string | null;
  car: ActivityCar;
  customer: unknown;
  services: unknown[];
}

export interface WidgetActivityResponse {
  day: string;
  period: string;
  hours: string[];
  data: ActivityItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}
