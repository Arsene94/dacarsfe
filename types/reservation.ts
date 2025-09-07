export interface ReservationFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  flight_number: string;
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
