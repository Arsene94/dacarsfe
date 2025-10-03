import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type {
  Coupon,
  CouponPayload,
  CouponQuickValidationParams,
  CouponQuickValidationResponse,
} from '@/types/coupon';

describe('ApiClient coupons management', () => {
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

  it('builds the expected query string when listing coupons', async () => {
    const client = new ApiClient(baseURL);
    const apiResponse: ApiListResult<Coupon> = {
      data: [],
      meta: {
        current_page: 2,
        from: 1,
        last_page: 4,
        links: [],
        path: '/coupons',
        per_page: 25,
        to: 25,
        total: 80,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const params = {
      page: 2,
      perPage: 25,
      limit: 100,
      search: '  summer-sale ',
      code_like: ' SUMMER ',
      type: 'percent',
      is_unlimited: false,
      is_unlimited_expires: 1,
    } satisfies Record<string, unknown>;

    const result = await client.getCoupons(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseURL}/coupons?page=2&per_page=25&limit=100&search=summer-sale&code_like=SUMMER&type=percent&is_unlimited=false&is_unlimited_expires=1`);
    expect(requestInit?.method).toBeUndefined();
    expect(result).toEqual(apiResponse);
  });

  it('retrieves a coupon by id using a GET request', async () => {
    const client = new ApiClient(baseURL);
    const apiResponse: ApiItemResult<Coupon> = {
      data: {
        id: 99,
        code: 'BLACKFRIDAY',
        type: 'fixed',
        value: 25,
        is_unlimited: false,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getCoupon(99);

    expect(fetchMock).toHaveBeenCalledWith(`${baseURL}/coupons/99`, expect.any(Object));
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBeUndefined();
    expect(result).toEqual(apiResponse);
  });

  it('creates a coupon by POST-ing the sanitized payload', async () => {
    const client = new ApiClient(baseURL);
    const payload: CouponPayload = {
      code: 'SPRING2025',
      type: 'percent',
      value: 15,
      is_unlimited: false,
      expires_at: undefined,
      limit: null,
      is_date_valid: true,
      valid_start_date: '2025-05-01T00:00:00',
      valid_end_date: '2025-05-31T23:59:59',
    };

    const apiResponse: ApiItemResult<Coupon> = {
      data: {
        id: 101,
        code: 'SPRING2025',
        type: 'percent',
        value: 15,
        is_unlimited: false,
        limit: null,
        is_date_valid: true,
        valid_start_date: '2025-05-01T00:00:00',
        valid_end_date: '2025-05-31T23:59:59',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCoupon(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseURL}/coupons`);
    expect(init).toMatchObject({ method: 'POST' });

    const parsedBody = JSON.parse((init?.body as string) ?? '{}');
    expect(parsedBody).toEqual({
      code: 'SPRING2025',
      type: 'percent',
      value: 15,
      is_unlimited: false,
      limit: null,
      is_date_valid: true,
      valid_start_date: '2025-05-01T00:00:00',
      valid_end_date: '2025-05-31T23:59:59',
    });

    expect(result).toEqual(apiResponse);
  });

  it('updates a coupon and keeps the admin token in the headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: CouponPayload = {
      value: 35,
      is_unlimited: true,
      limit: undefined,
      is_date_valid: false,
      valid_start_date: undefined,
      valid_end_date: null,
    };

    const apiResponse: ApiItemResult<Coupon> = {
      data: {
        id: 77,
        code: 'LOYALTY35',
        type: 'percent',
        value: 35,
        is_unlimited: true,
        is_date_valid: false,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCoupon(77, payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseURL}/coupons/77`);
    expect(init).toMatchObject({ method: 'PUT' });
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer admin-token',
      'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
    });

    const parsedBody = JSON.parse((init?.body as string) ?? '{}');
    expect(parsedBody).toEqual({
      value: 35,
      is_unlimited: true,
      is_date_valid: false,
      valid_end_date: null,
    });

    expect(result).toEqual(apiResponse);
  });

  it('deletes a coupon using the DELETE verb', async () => {
    const client = new ApiClient(baseURL);
    const apiResponse: ApiDeleteResponse = { message: 'Coupon deleted' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteCoupon(15);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/coupons/15`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('validates a coupon quickly by encoding params into the query string', async () => {
    const client = new ApiClient(baseURL);
    const params: CouponQuickValidationParams = {
      code: 'SUMMER20',
      sub_total: 199.99,
      start_date: '2025-05-12T09:00',
      end_date: '2025-05-18T09:00',
      customer_email: 'vip@example.com',
      context: 'booking',
    };
    const apiResponse: CouponQuickValidationResponse = {
      valid: true,
      amount: 40,
      type: 'percent',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.validateCouponQuick(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const expectedParams = new URLSearchParams();
    expectedParams.append('code', 'SUMMER20');
    expectedParams.append('sub_total', '199.99');
    expectedParams.append('start_date', '2025-05-12T09:00');
    expectedParams.append('end_date', '2025-05-18T09:00');
    expectedParams.append('customer_email', 'vip@example.com');
    expectedParams.append('context', 'booking');

    expect(url).toBe(`${baseURL}/coupons/validate?${expectedParams.toString()}`);
    expect(init?.method).toBeUndefined();
    expect(result).toEqual(apiResponse);
  });

  it('validates a discount code by POST-ing the payload as JSON', async () => {
    const client = new ApiClient(baseURL);
    const payload = {
      code: 'NEWYEAR30',
      car_id: 17,
      start_date: '2025-03-12T09:00:00',
      end_date: '2025-03-18T09:00:00',
      price: 36,
      price_casco: 45,
      total_price: 216,
      total_price_casco: 270,
      customer_email: 'vip@example.com',
    };
    const apiResponse: CouponQuickValidationResponse = {
      valid: true,
      amount: 150,
      type: 'fixed',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.validateDiscountCode(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/coupons/validate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('surface validation errors when discount code validation fails', async () => {
    const client = new ApiClient(baseURL);
    const payload = {
      code: 'EXPIRED10',
      car_id: 19,
      start_date: '2025-04-01T09:00:00',
      end_date: '2025-04-05T09:00:00',
      price: 32,
      price_casco: 41,
      total_price: 160,
      total_price_casco: 205,
      customer_email: 'vip@example.com',
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Cod expirat' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(client.validateDiscountCode(payload)).rejects.toThrow('Cod expirat');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/coupons/validate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});
