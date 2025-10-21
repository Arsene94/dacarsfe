import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiListResult } from '@/types/api';
import type { ActivityLog, ActivityLogListParams } from '@/types/activity-log';

describe('ApiClient activity logs', () => {
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

  it('lists activity logs with sanitized filters and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const filters: ActivityLogListParams = {
      page: 2,
      perPage: 10,
      search: ' booking ',
      userId: 7,
      action: ' booking.updated ',
      from: ' 2025-05-01 ',
      to: '2025-05-31 ',
      sort: 'oldest',
    };

    const apiResponse: ApiListResult<ActivityLog> = {
      data: [
        {
          id: 4821,
          action: 'booking.updated',
          message: 'Booking a fost actualizat (BK-24091)',
          user: {
            id: 7,
            name: 'Ana Ionescu',
            email: 'ana.ionescu@dacars.ro',
          },
          subject: {
            type: 'App\\Models\\Booking',
            id: '24091',
            label: 'BK-24091',
          },
          context: {
            changes: {
              status: 'confirmed',
              total_price: 1899,
            },
            original: {
              status: 'pending',
              total_price: 1799,
            },
          },
          ip_address: '10.0.12.4',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0)',
          created_at: '2025-05-12T09:21:32+03:00',
          updated_at: '2025-05-12T09:21:32+03:00',
        },
      ],
      links: {
        first: 'https://api.dacars.ro/api/activity-logs?page=1',
        last: 'https://api.dacars.ro/api/activity-logs?page=5',
        prev: null,
        next: 'https://api.dacars.ro/api/activity-logs?page=2',
      },
      meta: {
        current_page: 1,
        per_page: 10,
        total: 42,
        last_page: 5,
        from: 1,
        to: 10,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getActivityLogs(filters);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/activity-logs');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('per_page')).toBe('10');
    expect(url.searchParams.get('search')).toBe('booking');
    expect(url.searchParams.get('user_id')).toBe('7');
    expect(url.searchParams.get('action')).toBe('booking.updated');
    expect(url.searchParams.get('from')).toBe('2025-05-01');
    expect(url.searchParams.get('to')).toBe('2025-05-31');
    expect(url.searchParams.get('sort')).toBe('oldest');

    expect(requestInit).toEqual(
      expect.objectContaining({
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

  it('omits empty filters when fetching activity logs', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<ActivityLog> = {
      data: [],
      links: {
        first: 'https://api.dacars.ro/api/activity-logs?page=1',
        last: 'https://api.dacars.ro/api/activity-logs?page=1',
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        per_page: 25,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const filters: ActivityLogListParams = {
      page: 0,
      perPage: Number.NaN,
      search: '   ',
      userId: null,
      action: '',
      from: ' ',
      to: '',
    };

    const result = await client.getActivityLogs(filters);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);

    expect(url.pathname).toBe('/activity-logs');
    expect(url.search).toBe('');
    expect(result).toEqual(apiResponse);
  });
});
