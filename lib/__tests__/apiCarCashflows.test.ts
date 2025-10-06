import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult } from '@/types/api';
import type { CarCashflowRecord } from '@/types/car-cashflow';

describe('ApiClient admin car cashflows management', () => {
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

  it('creates a car cashflow sanitizing payload and applying admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      car_id: 42,
      direction: 'income',
      payment_method: 'card',
      total_amount: 1250,
      occurred_on: '2024-04-15',
      category: 'Încasări rezervări',
      description: 'Plată integrală pentru rezervarea DAC-2024-0415',
      cash_amount: undefined,
      card_amount: 1250,
      created_by: 7,
    } as const;

    const apiResponse: ApiItemResult<CarCashflowRecord> = {
      data: {
        id: 301,
        car_id: 42,
        direction: 'income',
        payment_method: 'card',
        total_amount: 1250,
        occurred_on: '2024-04-15',
      } as CarCashflowRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarCashflow(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-cashflows`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          car_id: 42,
          direction: 'income',
          payment_method: 'card',
          total_amount: 1250,
          occurred_on: '2024-04-15',
          category: 'Încasări rezervări',
          description: 'Plată integrală pentru rezervarea DAC-2024-0415',
          card_amount: 1250,
          created_by: 7,
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

  it('updates a car cashflow keeping provided fields and admin authentication', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      car_id: 12,
      direction: 'expense',
      category: 'Costuri service',
      description: 'Schimb plăcuțe frână și verificare suspensie',
      payment_method: 'cash_card',
      total_amount: 860,
      cash_amount: 200,
      card_amount: 660,
      occurred_on: '2024-05-02',
      created_by: undefined,
    } as const;

    const apiResponse: ApiItemResult<CarCashflowRecord> = {
      data: {
        id: 88,
        car_id: 12,
        direction: 'expense',
        payment_method: 'cash_card',
        total_amount: 860,
        occurred_on: '2024-05-02',
      } as CarCashflowRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarCashflow(88, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-cashflows/88`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          car_id: 12,
          direction: 'expense',
          category: 'Costuri service',
          description: 'Schimb plăcuțe frână și verificare suspensie',
          payment_method: 'cash_card',
          total_amount: 860,
          cash_amount: 200,
          card_amount: 660,
          occurred_on: '2024-05-02',
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
