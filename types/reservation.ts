export interface ReservationFormData {
  name: string;
  email: string;
  phone: string;
  flight: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  location: string;
  car_id: number | null;
  discountCode: string;
}

export type Service = {
  id: number;
  name: string;
  price: number;
};
