import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type { Expense } from '@/types/expense';

describe('ApiClient admin expenses management', () => {
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

  it('creates a fleet expense sanitizing payload and adding admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      type: 'service',
      description: 'Revizie completă pentru Dacia Jogger',
      amount: 1850.5,
      spent_at: '2024-06-12',
      car_id: 17,
      is_recurring: false,
      ends_on: undefined,
    } as const;

    const apiResponse: ApiItemResult<Expense> = {
      data: {
        id: 520,
        type: 'service',
        amount: 1850.5,
        spent_at: '2024-06-12',
      } as Expense,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createExpense(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/expenses`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'service',
          description: 'Revizie completă pentru Dacia Jogger',
          amount: 1850.5,
          spent_at: '2024-06-12',
          car_id: 17,
          is_recurring: false,
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

  it('lists fleet expenses applying filters, includes, and admin authentication', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const params = {
      page: 2,
      perPage: 25,
      per_page: 10,
      limit: 50,
      type: ' service ',
      car_id: ' 42 ',
      is_recurring: true,
      include: ['car', ' created_by_user ', 'car'],
    } as const;

    const apiResponse: ApiListResult<Expense> = {
      data: [],
      meta: { current_page: 2, per_page: 25 },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getExpenses(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, config] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(
      `${baseURL}/expenses?page=2&per_page=25&limit=50&type=service&car_id=42&is_recurring=1&include=car%2Ccreated_by_user`,
    );
    expect(config.credentials).toBe('omit');
    expect(config.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
        'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('retrieves a fleet expense with trimmed include parameters and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Expense> = {
      data: {
        id: 912,
        type: 'parcare',
        amount: 90,
        spent_at: '2024-07-01',
      } as Expense,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getExpense(912, {
      include: [' car ', 'created_by_user', 'car'],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, config] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(`${baseURL}/expenses/912?include=car%2Ccreated_by_user`);
    expect(config.credentials).toBe('omit');
    expect(config.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
        'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('updates a fleet expense keeping provided fields with admin authentication', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      description: 'Revizie completă și înlocuire plăcuțe',
      amount: 2120,
      is_recurring: 0,
      spent_at: '2024-06-20',
    } as const;

    const apiResponse: ApiItemResult<Expense> = {
      data: {
        id: 520,
        type: 'service',
        description: 'Revizie completă și înlocuire plăcuțe',
        amount: 2120,
        spent_at: '2024-06-20',
      } as Expense,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateExpense(520, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/expenses/520`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          description: 'Revizie completă și înlocuire plăcuțe',
          amount: 2120,
          is_recurring: 0,
          spent_at: '2024-06-20',
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

  it('deletes a fleet expense while preserving admin authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = { message: 'Expense deleted successfully' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteExpense(520);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/expenses/520`,
      expect.objectContaining({
        method: 'DELETE',
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
