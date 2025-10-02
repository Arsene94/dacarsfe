import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type {
  ActivityMarkPaidResponse,
  ActivityRecord,
  ActivityWeeklySummary,
  ActivityWeeklySummaryDispatchResponse,
} from '@/types/activity-tracking';

describe('ApiClient admin operational activities', () => {
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

  it('lists activities with sanitized filters and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const params = {
      week: ' 2024-W21 ',
      from: ' 2024-05-20 ',
      to: '   ',
      car_id: 42,
      type: ' cleaning ',
      created_by: 9,
      is_paid: true,
      page: 2,
      per_page: 25,
    } as const;

    const apiResponse: ApiListResult<ActivityRecord> = {
      data: [
        {
          id: 1,
          car_id: 42,
          car_plate: 'B-101-XYZ',
          performed_at: '2024-05-21T08:00:00Z',
          type: 'cleaning',
          amount: 150,
          notes: null,
          is_paid: true,
          paid_at: '2024-05-22T10:00:00Z',
          paid_by: 12,
          paid_by_name: 'Ana',
          created_by: 3,
          created_by_name: 'Vlad',
          created_at: '2024-05-21T08:05:00Z',
          updated_at: '2024-05-21T08:05:00Z',
        } as ActivityRecord,
      ],
      meta: {
        current_page: 2,
        per_page: 25,
        total: 1,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getActivities(params);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities?week=2024-W21&from=2024-05-20&car_id=42&type=cleaning&created_by=9&is_paid=true&page=2&per_page=25`,
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

  it('retrieves a single activity with admin authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<ActivityRecord> = {
      data: {
        id: 7,
        car_id: 55,
        car_plate: 'CJ-22-ABC',
        performed_at: '2024-05-18T09:00:00Z',
        type: 'delivery',
        amount: 220,
        notes: 'Livrare aeroport',
        is_paid: false,
        paid_at: null,
        paid_by: null,
        paid_by_name: null,
        created_by: 4,
        created_by_name: 'Maria',
        created_at: '2024-05-18T09:05:00Z',
        updated_at: '2024-05-18T09:05:00Z',
      } as ActivityRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getActivity(7);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/7`,
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

  it('creates an activity removing undefined fields before sending the payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      car_id: 10,
      performed_at: '2024-05-19T10:00:00Z',
      type: 'cleaning' as const,
      notes: null,
      extra: undefined,
    };

    const apiResponse: ApiItemResult<ActivityRecord> = {
      data: {
        id: 11,
        car_id: 10,
        car_plate: 'TM-08-DCR',
        performed_at: '2024-05-19T10:00:00Z',
        type: 'cleaning',
        amount: 180,
        notes: null,
        is_paid: false,
        paid_at: null,
        paid_by: null,
        paid_by_name: null,
        created_by: 2,
        created_by_name: 'George',
        created_at: '2024-05-19T10:05:00Z',
        updated_at: '2024-05-19T10:05:00Z',
      } as ActivityRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createActivity(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          car_id: 10,
          performed_at: '2024-05-19T10:00:00Z',
          type: 'cleaning',
          notes: null,
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

  it('updates an activity keeping only provided fields in the payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      performed_at: '2024-05-20T11:00:00Z',
      notes: 'Curățare interior',
      ignored: undefined,
    };

    const apiResponse: ApiItemResult<ActivityRecord> = {
      data: {
        id: 11,
        car_id: 10,
        car_plate: 'TM-08-DCR',
        performed_at: '2024-05-20T11:00:00Z',
        type: 'cleaning',
        amount: 180,
        notes: 'Curățare interior',
        is_paid: false,
        paid_at: null,
        paid_by: null,
        paid_by_name: null,
        created_by: 2,
        created_by_name: 'George',
        created_at: '2024-05-19T10:05:00Z',
        updated_at: '2024-05-20T11:05:00Z',
      } as ActivityRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateActivity(11, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/11`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          performed_at: '2024-05-20T11:00:00Z',
          notes: 'Curățare interior',
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

  it('deletes an activity while preserving admin authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = { success: true };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteActivity(15);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/15`,
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

  it('retrieves weekly summaries using sanitized query parameters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const params = {
      week: ' 2024-W22 ',
      car_id: 33,
    } as const;

    const apiResponse: ApiItemResult<ActivityWeeklySummary> = {
      data: {
        week: '2024-W22',
        start_date: '2024-05-27',
        end_date: '2024-06-02',
        activities_count: 5,
        amount_per_activity: 120,
        total_amount: 600,
        breakdown_by_type: {
          cleaning: { count: 3, amount: 300 },
          delivery: { count: 2, amount: 300 },
        },
        breakdown_by_day: [
          { date: '2024-05-27', count: 2, amount: 240 },
          { date: '2024-05-28', count: 3, amount: 360 },
        ],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getActivityWeeklySummary(params);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/weekly-summary?week=2024-W22&car_id=33`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse.data);
  });

  it('returns null when the weekly summary response has no data', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<ActivityWeeklySummary> = { data: null };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getActivityWeeklySummary({ week: '2024-W23' });

    expect(result).toBeNull();
  });

  it('dispatches the weekly summary removing undefined fields and returning the payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      week: '2024-W24',
      channel: 'email' as const,
      recipients: ['ops@dacars.ro'],
      include_breakdown: undefined,
    };

    const apiResponse: ApiItemResult<ActivityWeeklySummaryDispatchResponse> = {
      data: {
        week: '2024-W24',
        channel: 'email',
        recipients: ['ops@dacars.ro'],
        queued_job_id: 'job-123',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.dispatchActivityWeeklySummary(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/weekly-summary/dispatch`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          week: '2024-W24',
          channel: 'email',
          recipients: ['ops@dacars.ro'],
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse.data);
  });

  it('throws when the weekly summary dispatch response lacks a payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      week: '2024-W24',
      channel: 'email' as const,
    };

    const apiResponse: ApiItemResult<ActivityWeeklySummaryDispatchResponse> = {
      data: null,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(client.dispatchActivityWeeklySummary(payload)).rejects.toThrow(
      'Răspuns invalid pentru dispatch-ul sumarului săptămânal.',
    );
  });

  it('marks activities as paid sanitizing payloads and returning the confirmation', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      week: '2024-W25',
      car_id: 18,
      extra: undefined,
    };

    const apiResponse: ApiItemResult<ActivityMarkPaidResponse> = {
      data: {
        mode: 'week',
        marked_count: 4,
        paid_at: '2024-06-10T12:00:00Z',
        range: {
          start_date: '2024-06-17',
          end_date: '2024-06-23',
          week: '2024-W25',
        },
        car_id: 18,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.markActivitiesPaid(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/activities/mark-paid`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          week: '2024-W25',
          car_id: 18,
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(result).toEqual(apiResponse.data);
  });

  it('throws when marking activities paid returns no payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<ActivityMarkPaidResponse> = {
      data: null,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      client.markActivitiesPaid({ week: '2024-W25' }),
    ).rejects.toThrow('Răspuns invalid pentru marcarea activităților ca achitate.');
  });
});

