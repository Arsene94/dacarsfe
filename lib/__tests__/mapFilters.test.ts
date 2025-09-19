import { describe, expect, it } from 'vitest';

import { mapCarSearchFilters } from '@/lib/mapFilters';

describe('mapCarSearchFilters', () => {
  it('maps UI payload keys to API filters with fallbacks and defaults', () => {
    const result = mapCarSearchFilters({
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      car_type: 3,
      transmission: 2,
      fuel: 1,
      seats: 5,
      year: 2022,
      search: 'SUV',
    });

    expect(result).toStrictEqual({
      start_date: '2024-01-01',
      end_date: '2024-01-10',
      page: undefined,
      per_page: undefined,
      limit: undefined,
      sort_by: undefined,
      make_id: undefined,
      vehicle_type_id: 3,
      transmission_id: 2,
      fuel_type_id: 1,
      number_of_seats: 5,
      year: 2022,
      name_like: 'SUV',
      include: 'make,type,transmission,fuel,categories,colors',
    });
  });

  it('uses explicitly provided values over defaults', () => {
    const result = mapCarSearchFilters({
      start_date: '2024-02-01',
      end_date: '2024-02-15',
      page: 4,
      per_page: 20,
      limit: 8,
      sort_by: '-year',
      make_id: 12,
      vehicle_type: 7,
      include: 'make',
    });

    expect(result).toStrictEqual({
      start_date: '2024-02-01',
      end_date: '2024-02-15',
      page: 4,
      per_page: 20,
      limit: 8,
      sort_by: '-year',
      make_id: 12,
      vehicle_type_id: 7,
      transmission_id: undefined,
      fuel_type_id: undefined,
      number_of_seats: undefined,
      year: undefined,
      name_like: undefined,
      include: 'make',
    });
  });
});
