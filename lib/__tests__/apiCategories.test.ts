import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult } from '@/types/api';
import type { CarCategory } from '@/types/car';

describe('ApiClient admin categories management', () => {
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

  it('creates a category using sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: { name: string; description?: string } = {
      name: 'SUV Premium',
      description: undefined,
    };

    const apiResponse: ApiItemResult<CarCategory> = {
      data: {
        id: 12,
        name: 'SUV Premium',
      } as CarCategory,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCategory(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-categories`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'SUV Premium',
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

  it('updates a category keeping only provided fields and propagating auth headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: { name: string; description?: string } = {
      name: 'SUV Business',
      description: 'Flotă business pentru parteneri',
    };

    const apiResponse: ApiItemResult<CarCategory> = {
      data: {
        id: 44,
        name: 'SUV Business',
        description: 'Flotă business pentru parteneri',
      } as CarCategory,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCategory(44, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-categories/44`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'SUV Business',
          description: 'Flotă business pentru parteneri',
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
});
