import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type { ServiceReport } from '@/types/service-report';

describe('ApiClient admin service reports', () => {
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

  it('lists service reports applying sanitized query params and includes', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const params = {
      page: 2,
      perPage: 25,
      limit: 10,
      car_id: ' 42 ',
      mechanic_name: '  Ion  ',
      include: [' car ', ' mechanic ', 'car'],
    } as const;

    const apiResponse: ApiListResult<ServiceReport> = {
      data: [
        {
          id: 9,
          mechanic_name: 'Ion',
          serviced_at: '2024-05-10',
          car_id: 42,
        } as ServiceReport,
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

    const result = await client.getServiceReports(params);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports?page=2&per_page=25&limit=10&car_id=42&mechanic_name=Ion&include=car%2Cmechanic`,
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

  it('supports per_page fallback when perPage is missing', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<ServiceReport> = {
      data: [],
      meta: {
        current_page: 1,
        per_page: 15,
        total: 0,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getServiceReports({ per_page: 15, car_id: 55 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports?per_page=15&car_id=55`,
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

  it('retrieves a specific service report while resolving include filters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<ServiceReport> = {
      data: {
        id: 77,
        mechanic_name: 'Maria',
        serviced_at: '2024-06-01',
      } as ServiceReport,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getServiceReport(77, { include: [' car ', 'car', ' mechanics '] });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports/77?include=car%2Cmechanics`,
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

  it('creates a service report omitting undefined fields in the payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      mechanic_name: 'Ionuț',
      serviced_at: '2024-07-15',
      car_id: 9,
      work_performed: 'Schimb ulei',
      extra: undefined,
    } as const;

    const apiResponse: ApiItemResult<ServiceReport> = {
      data: {
        id: 12,
        mechanic_name: 'Ionuț',
        serviced_at: '2024-07-15',
        car_id: 9,
        work_performed: 'Schimb ulei',
      } as ServiceReport,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createServiceReport(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          mechanic_name: 'Ionuț',
          serviced_at: '2024-07-15',
          car_id: 9,
          work_performed: 'Schimb ulei',
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

  it('updates a service report keeping only provided values', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      mechanic_name: 'Andrei',
      work_performed: null,
      observations: 'Verificat sistem de frânare',
    } as const;

    const apiResponse: ApiItemResult<ServiceReport> = {
      data: {
        id: 15,
        mechanic_name: 'Andrei',
        serviced_at: '2024-08-03',
        observations: 'Verificat sistem de frânare',
      } as ServiceReport,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateServiceReport(15, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports/15`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          mechanic_name: 'Andrei',
          work_performed: null,
          observations: 'Verificat sistem de frânare',
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

  it('deletes a service report with admin authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      message: 'Raport de service șters',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteServiceReport(19);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/service-reports/19`,
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
