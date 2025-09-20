export type CarCategory = {
    id: number;
    name: string;
    order?: number;
};

export type ApiCar = {
  id: number;
  name?: string;
  rental_rate?: number | string;
  rental_rate_casco?: number | string;
  price_text?: string;
  image_preview?: string | null;
  thumbnail?: string | null;
  images?: Record<string, string>;
  avg_review?: number;
  number_of_seats: number;
  license_plate?: string | null;
  licensePlate?: string | null;
  plate?: string | null;
  fuel?: { id?: number; name?: string | null } | null;
  type?: { id?: number; name?: string | null; image?: string | null } | null;
  transmission?: { id?: number; name?: string | null } | null;
  transmission_name?: string | null;
  transmissionName?: string | null;
  fuel_name?: string | null;
  fuelName?: string | null;
  categories?: CarCategory[];
  content?: string | null;
  days?: number;
  deposit?: number;
  total_deposit?: number | string;
  total_without_deposit?: number | string;
  available?: boolean;
  price?: number | string;
  pivot?: Record<string, unknown> | null;
  [key: string]: unknown;
};

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

export interface CarFilterParams {
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
