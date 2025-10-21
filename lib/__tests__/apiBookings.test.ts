import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult, UnknownRecord } from '@/types/api';

describe('ApiClient bookings management', () => {
  const baseURL = 'https://admin-api.dacars.test';
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a booking with the expected payload and headers', async () => {
    const client = new ApiClient(baseURL);
    const payload = {
      car_id: 42,
      customer_id: 7,
      start_date: '2024-05-01',
      end_date: '2024-05-05',
      status: 'draft',
    } satisfies Record<string, unknown>;
    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 101,
        status: 'draft',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createBooking(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('updates an existing booking using the admin token and JSON headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      status: 'confirmed',
      total_price: 259.99,
    } satisfies Record<string, unknown>;
    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 55,
        status: 'confirmed',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBooking(55, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/55`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
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

    expect(result).toEqual(apiResponse);
  });

  it('propagates backend validation errors when booking updates fail', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Date invalide pentru rezervare' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      client.updateBooking(13, { start_date: undefined }),
    ).rejects.toThrow('Date invalide pentru rezervare');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/13`,
      expect.objectContaining({
        method: 'PUT',
      }),
    );

    consoleErrorSpy.mockRestore();
  });

  it('checks car availability by POST-ing the payload as JSON', async () => {
    const client = new ApiClient(baseURL);

    const payload = {
      car_id: 77,
      start_date: '2024-06-10',
      end_date: '2024-06-15',
    };

    const apiResponse = {
      data: {
        available: true,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.checkCarAvailability(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/availability/check`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('quotes a booking price keeping the payload untouched', async () => {
    const client = new ApiClient(baseURL);

    const payload = {
      car_id: 99,
      pickup_location: 'OTP',
      dropoff_location: 'OTP',
      rental_start_date: '2024-07-01',
      rental_end_date: '2024-07-05',
      car_category_id: 5,
    };

    const apiResponse = {
      data: {
        total: '999.00',
        currency: 'EUR',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.quotePrice(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/quote`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('updates booking dates using the admin authorization headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('super-admin');

    const payload = {
      arrivalDate: '2024-08-01',
      arrivalTime: '10:00',
      returnDate: '2024-08-05',
      returnTime: '14:00',
    };

    const apiResponse = {
      data: {
        id: 301,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBookingDate(301, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/301/update-date`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer super-admin',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('extends a booking with custom pricing and payment flag', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('super-admin');

    const payload = {
      extended_until: '2025-02-22T10:00:00+02:00',
      price_per_day: 45,
      paid: false,
    };

    const apiResponse = {
      data: {
        id: 412,
      },
      message: 'Booking extended',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.extendBooking(412, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/412/extend`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer super-admin',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('retrieves booking info without include parameters when none are provided', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse = {
      data: { id: 501 },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBookingInfo(501);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseURL}/bookings/501`);
    expect(options).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer admin-token',
      }),
    }));

    expect(result).toEqual(apiResponse);
  });

  it('retrieves booking info with sanitized include parameters', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse = {
      data: { id: 77 },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.getBookingInfo(77, {
      include: ['customer ', '', ' car', 'customer'],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    const parsed = new URL(calledUrl);
    expect(parsed.pathname).toBe('/bookings/77');
    expect(parsed.searchParams.get('include')).toBe('customer,car');
    expect(options).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
      }),
    }));
  });

  it('lists bookings with normalized filters and pagination params', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse = {
      data: [],
      meta: {
        current_page: 1,
        per_page: 25,
        total: 0,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.getBookings({
      page: 2,
      perPage: 25,
      status: ' confirmed ',
      search: '  TesLa ',
      include: ['customer', 'car', 'customer'],
      customer_id: 9,
      car_id: 11,
      start_date: '2024-09-01',
      end_date: '',
      from: '2024-08-01',
      to: '2024-08-31',
      limit: 50,
    });

    const [calledUrl] = fetchMock.mock.calls[0];
    const parsed = new URL(calledUrl);

    expect(parsed.pathname).toBe('/bookings');
    expect(parsed.searchParams.get('include')).toBe('customer,car');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('per_page')).toBe('25');
    expect(parsed.searchParams.get('limit')).toBe('50');
    expect(parsed.searchParams.get('status')).toBe('confirmed');
    expect(parsed.searchParams.get('search')).toBe('TesLa');
    expect(parsed.searchParams.get('customer_id')).toBe('9');
    expect(parsed.searchParams.get('car_id')).toBe('11');
    expect(parsed.searchParams.get('start_date')).toBe('2024-09-01');
    expect(parsed.searchParams.get('from')).toBe('2024-08-01');
    expect(parsed.searchParams.get('to')).toBe('2024-08-31');
    expect(parsed.searchParams.has('end_date')).toBe(false);
  });

  it('deletes a booking by id using the DELETE verb', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse = { success: true };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.deleteBooking(88);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/88`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );
  });

  it('generates a booking contract as PDF with admin credentials', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('contract-admin');

    const payload = {
      booking_id: 912,
      with_signature: true,
    };

    const apiResponse = {
      data: { url: 'https://storage/contract.pdf' },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.generateContract(payload, 912);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/contract/912`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: 'Bearer contract-admin',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('avoids appending undefined booking ids when generating ad-hoc contracts', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('contract-admin');

    const payload = {
      customer_name: 'Popescu Ion',
      with_signature: true,
    } satisfies Record<string, unknown>;

    const apiResponse = {
      data: { url: 'https://storage/contract-adhoc.pdf' },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.generateContract(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/contract`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: 'Bearer contract-admin',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('stores and generates a new booking contract in a single call', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('contract-admin');

    const payload = {
      booking_id: 913,
      with_signature: false,
    };

    const apiResponse = {
      data: { url: 'https://storage/contract-913.pdf' },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.storeAndGenerateContract(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/bookings/store-contract`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-cache',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: 'Bearer contract-admin',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('lists customers with optional search filters for rentals', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse = {
      data: [],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.getCustomers({ search: '   Popescu   ', limit: 5 });

    const [calledUrl] = fetchMock.mock.calls[0];
    const parsed = new URL(calledUrl);

    expect(parsed.pathname).toBe('/customers');
    expect(parsed.searchParams.get('search')).toBe('   Popescu   ');
    expect(parsed.searchParams.get('limit')).toBe('5');
  });

  it('searches customers by phone when attaching them to bookings', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse = {
      data: [{ id: 1, phone: '+40700000000' }],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.searchCustomersByPhone('+40700000000');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/customers/get/byphone`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone: '+40700000000' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });
});
