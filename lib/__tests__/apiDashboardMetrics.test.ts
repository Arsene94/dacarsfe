import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { WidgetActivityResponse } from '@/types/activity';
import type {
  AdminBookingsTodayMetrics,
  AdminBookingsTotalMetrics,
  AdminCarsTotalMetrics,
} from '@/types/metrics';

describe('ApiClient admin dashboard metrics', () => {
  const baseURL = 'https://admin-api.dacars.test';
  let fetchMock: ReturnType<typeof vi.fn>;
  const widgetResponse: WidgetActivityResponse = {
    day: '2025-02-15',
    period: 'today',
    hours: ['09:00', '13:30', '19:00'],
    data: [
      {
        id: 412,
        booking_number: '#1058821',
        flight_number: 'RO317',
        customer_name: 'Maria Enache',
        customer_phone: '+40 723 555 111',
        note: 'Predare la terminal Plecări.',
        status: 'reserved',
        car_id: 17,
        customer_id: 88,
        rental_start_date: '2025-02-15T09:00:00+02:00',
        rental_end_date: '2025-02-20T09:00:00+02:00',
        total: 247,
        sub_total: 216,
        price_per_day: 36,
        total_services: 12,
        coupon_amount: 15,
        coupon_type: 'percentage',
        discount: 90,
        with_deposit: true,
        days: 6,
        child_seat_service_name: 'Scaun copil',
        car: {
          id: 17,
          name: 'Dacia Logan',
          license_plate: 'B-55-XYZ',
        },
        services: [
          { id: 1, name: 'Scaun copil' },
          { id: 3, name: 'Asigurare CASCO extinsă' },
        ],
        services_list: [
          { id: 1, name: 'Scaun copil', price: 10 },
          { id: 3, name: 'Asigurare CASCO extinsă', price: 12 },
        ],
        start_hour_group: '09:00',
        end_hour_group: '19:00',
      },
    ],
    pagination: {
      current_page: 1,
      per_page: 20,
      total: 6,
      last_page: 1,
      from: 1,
      to: 6,
    },
  };

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches widget activity with explicit pagination and auth headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(widgetResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.fetchWidgetActivity('today', 30);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/widgets/activity/today');
    expect(url.searchParams.get('paginate')).toBe('30');

    expect(requestInit).toEqual(
      expect.objectContaining({
        method: 'GET',
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(widgetResponse);
  });

  it('defaults the period and clamps the pagination value', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(widgetResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.fetchWidgetActivity('  ', 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/widgets/activity/azi');
    expect(url.searchParams.get('paginate')).toBe('1');
    expect(result).toEqual(widgetResponse);
  });

  it('fetches bookings today metrics with sanitized filters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const metricsResponse: AdminBookingsTodayMetrics = {
      date: '2025-02-15',
      by: 'start',
      statuses: ['reserved', 'completed'],
      count: 18,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(metricsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.fetchAdminBookingsToday({ by: 'start', statuses: ['reserved', 'completed'] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/admin/metrics/bookings-today');
    expect(url.searchParams.get('by')).toBe('start');
    expect(url.searchParams.get('statuses')).toBe('reserved,completed');
    expect(result).toEqual(metricsResponse);
  });

  it('fetches total cars metric trimming the status filter', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const carsResponse: AdminCarsTotalMetrics = {
      status: 'available',
      count: 142,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(carsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.fetchAdminCarsTotal({ status: ' available ' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/admin/metrics/cars-total');
    expect(url.searchParams.get('status')).toBe('available');
    expect(result).toEqual(carsResponse);
  });

  it('fetches total bookings metric accepting CSV filters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const totalResponse: AdminBookingsTotalMetrics = {
      statuses: 'all',
      count: 2284,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(totalResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.fetchAdminBookingsTotal({ statuses: ' all ' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/admin/metrics/bookings-total');
    expect(url.searchParams.get('statuses')).toBe('all');
    expect(result).toEqual(totalResponse);
  });
});
