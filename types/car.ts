export type CarCategory = {
    id: number;
    name: string;
    order?: number
}

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
  fuel?: { id?: number; name?: string | null } | null;
  type?: { id?: number; name?: string | null; image?: string | null } | null;
  transmission?: { id?: number; name?: string | null } | null;
  categories?: CarCategory[];
  content?: string | null;
  days?: number;
  deposit?: number;
  total_deposit?: number | string;
  total_without_deposit?: number | string;
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
