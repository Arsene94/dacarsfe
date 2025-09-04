import { Car } from './car';

export type BookingData = {
  startDate: string | null;
  endDate: string | null;
  withDeposit: boolean | null;
  selectedCar: Car | null;
};

export type BookingContextType = {
  booking: BookingData;
  setBooking: (data: BookingData) => void;
};
