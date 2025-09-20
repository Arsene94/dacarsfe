export interface CarLookup {
  id: number;
  name: string;
  status?: string | null;
  logo?: string | null;
  image?: string | null;
  icon?: string | null;
  [key: string]: unknown;
}

export interface CarCategory extends CarLookup {
  order?: number | null;
  is_featured?: boolean | number | null;
  is_default?: boolean | number | null;
}

export interface CarCouponSummary {
  code?: string | null;
  discount_deposit?: number | string | null;
  discount_casco?: number | string | null;
  [key: string]: unknown;
}

export type CarImageCollection =
  | string[]
  | Record<string, string>
  | null
  | undefined;

export interface ApiCar {
  id: number;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  images?: CarImageCollection;
  image_preview?: string | null;
  image?: string | null;
  thumbnail?: string | null;
  cover_image?: string | null;
  price_text?: string | null;
  license_plate?: string | null;
  licensePlate?: string | null;
  plate?: string | null;
  make_id?: number | string | null;
  status?: string | null;
  year?: number | string | null;
  mileage?: number | string | null;
  vehicle_type_id?: number | string | null;
  transmission_id?: number | string | null;
  fuel_type_id?: number | string | null;
  number_of_seats?: number | string | null;
  number_of_doors?: number | string | null;
  vin?: string | null;
  deposit?: number | string | null;
  weight?: number | string | null;
  weight_front?: number | string | null;
  available?: boolean;
  base_price?: number | string | null;
  price_per_day?: number | string | null;
  rental_rate?: number | string | null;
  rental_rate_casco?: number | string | null;
  days?: number | string | null;
  total_deposit?: number | string | null;
  total_without_deposit?: number | string | null;
  total_services?: number | string | null;
  avg_review?: number | string | null;
  is_partner?: boolean | number | string | null;
  partner_id?: number | string | null;
  partner_percentage?: number | string | null;
  itp_expires_at?: string | null;
  rovinieta_expires_at?: string | null;
  insurance_expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  make?: CarLookup | null;
  type?: CarLookup | null;
  transmission?: CarLookup | string | null;
  transmission_name?: string | null;
  transmissionName?: string | null;
  fuel?: CarLookup | string | null;
  fuel_name?: string | null;
  fuelName?: string | null;
  categories?: CarCategory[] | null;
  category?: CarCategory | null;
  coupon?: CarCouponSummary | null;
  services?: Array<{ id?: number | string; name?: string | null; price?: number | string | null }> | null;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  pivot?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export type Car = {
  id: number;
  name: string;
  type: string;
  typeId: number | null;
  image: string;
  price: number;
  rental_rate: string;
  rental_rate_casco: string;
  days: number;
  deposit: number;
  total_deposit: number | string;
  total_without_deposit: number | string;
  available?: boolean;
  features: {
    passengers: number;
    transmission: string;
    transmissionId: number | null;
    fuel: string;
    fuelId: number | null;
    doors: number;
    luggage: number;
  };
  rating: number;
  description: string;
  specs: string[];
};

export type FleetCar = {
  id: number;
  name: string;
  type: string;
  icon: string;
  price?: number;
  number_of_seats: number;
  transmission: { name: string };
  fuel: { name: string };
  categories: { id: number; name: string };
  rating?: number;
};

export interface CarAvailabilityResponse {
  data: ApiCar;
  available?: boolean;
  message?: string | null;
  [key: string]: unknown;
}

export interface CarSearchUiPayload {
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  page?: number;
  per_page?: number;
  perPage?: number;
  limit?: number;
  sort_by?: string;
  sortBy?: string;
  make_id?: number;
  vehicle_type?: number | string;
  vehicle_type_id?: number;
  car_type?: number | string;
  transmission?: number | string;
  fuel?: number | string;
  fuel_type?: number | string;
  seats?: number | string;
  number_of_seats?: number | string;
  year?: number | string;
  search?: string;
  include?: string;
  [key: string]: unknown;
}

export interface CarTranslation {
  lang_code: string;
  dacars_cars_id?: number;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  [key: string]: unknown;
}

export interface CarSyncCategoriesPayload {
  category_ids?: Array<number | string>;
  category_id?: number | string;
}

export interface CarSyncColorsPayload {
  color_ids?: Array<number | string>;
  color_id?: number | string;
}

export interface CarFilterParams extends Record<string, unknown> {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  limit?: number;
  sort_by?: string;
  make_id?: number;
  vehicle_type_id?: number;
  transmission_id?: number;
  fuel_type_id?: number;
  number_of_seats?: number;
  year?: number;
  name_like?: string;
  include?: string;
}
