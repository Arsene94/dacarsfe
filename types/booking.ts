import { Car } from './car';
import type { OfferKind } from './offer';

export type BookingAppliedOffer = {
  id: number;
  title: string;
  kind?: OfferKind | null;
  value?: string | null;
  badge?: string | null;
};

export type BookingData = {
  startDate: string | null;
  endDate: string | null;
  withDeposit: boolean | null;
  selectedCar: Car | null;
  appliedOffers: BookingAppliedOffer[];
};

export type BookingContextType = {
  booking: BookingData;
  setBooking: (data: BookingData) => void;
};
