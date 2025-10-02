import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult } from '@/types/api';
import type { DynamicPrice } from '@/types/admin';

describe('ApiClient admin dynamic prices management', () => {
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

  it('creates a dynamic price with the expected payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      start_from: '2024-07-01',
      end_to: '2024-07-31',
      enabled: true,
      percentages: [
        {
          percentage_start: 1,
          percentage_end: 3,
          percentage_amount: 5,
        },
        {
          percentage_start: 4,
          percentage_end: 7,
          percentage_amount: 12,
        },
      ],
    } satisfies Parameters<ApiClient['createDynamicPrice']>[0];

    const apiResponse: ApiItemResult<DynamicPrice> = {
      data: {
        id: 9,
        start_from: '2024-07-01',
        end_to: '2024-07-31',
        enabled: true,
        percentages: payload.percentages,
      } as DynamicPrice,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createDynamicPrice(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/dynamic-prices`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
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

  it('updates a dynamic price keeping provided percentages and propagating auth headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      start_from: '2024-08-01',
      end_to: '2024-08-31',
      enabled: false,
      percentages: [
        {
          id: 1,
          dynamic_price_id: 3,
          percentage_start: 1,
          percentage_end: 5,
          percentage_amount: 8,
        },
        {
          percentage_start: 6,
          percentage_end: 10,
          percentage_amount: 15,
        },
      ],
    } satisfies Parameters<ApiClient['updateDynamicPrice']>[1];

    const apiResponse: ApiItemResult<DynamicPrice> = {
      data: {
        id: 3,
        start_from: '2024-08-01',
        end_to: '2024-08-31',
        enabled: false,
        percentages: payload.percentages,
      } as DynamicPrice,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateDynamicPrice(3, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/dynamic-prices/3`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
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
