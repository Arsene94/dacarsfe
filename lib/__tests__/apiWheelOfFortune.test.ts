import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult } from '@/types/api';
import type { WheelPrize } from '@/types/wheel';

describe('ApiClient admin wheel of fortune management', () => {
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

  it('creates a wheel prize using sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      period_id: 4,
      title: 'Voucher cadou 10%',
      description: undefined,
      amount: null,
      color: '#1fb58f',
      probability: 12,
      type: 'discount',
    } as const;

    const apiResponse: ApiItemResult<WheelPrize> = {
      data: {
        id: 42,
        period_id: 4,
        title: 'Voucher cadou 10%',
        color: '#1fb58f',
        probability: 12,
        type: 'discount',
      } as WheelPrize,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createWheelOfFortune(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/wheel-of-fortunes`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          period_id: 4,
          title: 'Voucher cadou 10%',
          amount: null,
          color: '#1fb58f',
          probability: 12,
          type: 'discount',
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

  it('updates a wheel prize keeping only provided fields and admin auth headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      period_id: 6,
      title: 'Voucher weekend gratuit',
      description: 'Oferta disponibilă doar în luna decembrie.',
      amount: 150,
      color: '#1f3fb5',
      probability: 5,
    } as const;

    const apiResponse: ApiItemResult<WheelPrize> = {
      data: {
        id: 42,
        period_id: 6,
        title: 'Voucher weekend gratuit',
        description: 'Oferta disponibilă doar în luna decembrie.',
        amount: 150,
      } as WheelPrize,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateWheelOfFortune(42, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/wheel-of-fortunes/42`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          period_id: 6,
          title: 'Voucher weekend gratuit',
          description: 'Oferta disponibilă doar în luna decembrie.',
          amount: 150,
          color: '#1f3fb5',
          probability: 5,
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

