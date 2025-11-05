import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult, ApiListResult, UnknownRecord } from '@/types/api';
import type { ApiCar } from '@/types/car';

describe('ApiClient cars management', () => {
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

  it('creates a car with sanitized JSON payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Audi Q5',
      seats: 5,
      status: 'draft',
      vin: undefined,
    } satisfies Record<string, unknown>;

    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 77,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCar(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Audi Q5',
          seats: 5,
          status: 'draft',
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('sends FormData without overriding the content type when creating a car', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const formData = new FormData();
    formData.append('name', 'BMW X3');
    formData.append('status', 'draft');

    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 202,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCar(formData);

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars`,
      expect.objectContaining({
        method: 'POST',
        body: formData,
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers).not.toHaveProperty('Content-Type');
    expect(result).toEqual(apiResponse);
  });

  it('updates a car with sanitized payload and authorization token', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      status: 'active',
      price_per_day: 89.9,
      description: 'SUV de familie',
      image: undefined,
    } satisfies Record<string, unknown>;

    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 55,
        status: 'active',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCar(55, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars/55`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          status: 'active',
          price_per_day: 89.9,
          description: 'SUV de familie',
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('updates a car via PATCH when requested', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      status: 'maintenance',
    } satisfies Record<string, unknown>;

    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 12,
        status: 'maintenance',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCar(12, payload, { method: 'PATCH' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars/12`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'maintenance',
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('sends FormData without overriding the content type when updating a car', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const formData = new FormData();
    formData.append('status', 'available');

    const apiResponse: ApiItemResult<UnknownRecord> = {
      data: {
        id: 35,
        status: 'available',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCar(35, formData);

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars/35`,
      expect.objectContaining({
        method: 'PUT',
        body: formData,
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers).not.toHaveProperty('Content-Type');
    expect(result).toEqual(apiResponse);
  });

  it('filters cars using the provided listing query parameters', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse: ApiListResult<ApiCar> = {
      data: [
        {
          id: 1,
          name: 'Tesla Model 3',
        } as ApiCar,
      ],
      meta: {
        current_page: 2,
        per_page: 10,
        total: 32,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getCars({
      search: 'Tesla',
      page: 2,
      perPage: 10,
      language: 'en',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/cars/en?search=Tesla&page=2&perPage=10`,
      expect.objectContaining({
        credentials: 'omit',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('maps UI filters when searching cars by availability window', async () => {
    const client = new ApiClient(baseURL);

    const apiResponse: ApiListResult<ApiCar> = {
      data: [
        {
          id: 9,
          name: 'BMW X5',
        } as ApiCar,
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getCarsByDateCriteria({
      start_date: '2024-07-01',
      end_date: '2024-07-05',
      make_id: 7,
      limit: 12,
      search: 'BMW',
    });

    const [url, options] = fetchMock.mock.calls.at(-1) ?? [];

    expect(typeof url).toBe('string');
    expect(url).toContain('/cars/ro?');

    const query = (url as string).split('?')[1];
    const params = new URLSearchParams(query);

    expect(params.get('start_date')).toBe('2024-07-01');
    expect(params.get('end_date')).toBe('2024-07-05');
    expect(params.get('make_id')).toBe('7');
    expect(params.get('limit')).toBe('12');
    expect(params.get('name_like')).toBe('BMW');
    expect(params.get('include')).toBe('make,type,transmission,fuel,categories,colors');

    expect(options).toEqual(
      expect.objectContaining({
        credentials: 'omit',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });
});
