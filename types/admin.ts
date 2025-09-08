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
}

export interface ActivityItem {
  id: number;
  booking_id: number;
  car_id: number;
  rental_start_date: string;
  rental_end_date: string;
  extension_date?: string | null;
  start_hour_group: string;
  end_hour_group: string;
  car: ActivityCar;
}

export interface WidgetActivityResponse {
  day: string;
  period: string;
  hours: string[];
  data: ActivityItem[];
}
