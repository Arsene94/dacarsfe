import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult, LookupRecord } from '@/types/api';

describe('ApiClient admin car attribute management', () => {
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

  it('creates a car make with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Dacia',
      slug: 'dacia',
      status: 'published',
      country: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 11,
        name: 'Dacia',
        slug: 'dacia',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarMake(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-makes`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Dacia',
          slug: 'dacia',
          status: 'published',
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

  it('updates a car make keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Dacia Spring',
      status: undefined,
      slug: 'dacia-spring',
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 11,
        name: 'Dacia Spring',
        slug: 'dacia-spring',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarMake(11, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-makes/11`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Dacia Spring',
          slug: 'dacia-spring',
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

  it('creates a car type with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'SUV',
      slug: 'suv',
      status: 'draft',
      description: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 22,
        name: 'SUV',
        slug: 'suv',
        status: 'draft',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarType(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-types`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'SUV',
          slug: 'suv',
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

  it('updates a car type keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'SUV compact',
      status: 'published',
      slug: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 22,
        name: 'SUV compact',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarType(22, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-types/22`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'SUV compact',
          status: 'published',
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

  it('creates a car transmission with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Automată',
      slug: 'automata',
      status: 'published',
      gears: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 31,
        name: 'Automată',
        slug: 'automata',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarTransmission(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-transmissions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Automată',
          slug: 'automata',
          status: 'published',
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

  it('updates a car transmission keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Automată secvențială',
      status: 'draft',
      slug: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 31,
        name: 'Automată secvențială',
        status: 'draft',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarTransmission(31, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-transmissions/31`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Automată secvențială',
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

  it('creates a car fuel with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Electric',
      slug: 'electric',
      status: 'published',
      description: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 44,
        name: 'Electric',
        slug: 'electric',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarFuel(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-fuels`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Electric',
          slug: 'electric',
          status: 'published',
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

  it('updates a car fuel keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Hibrid plug-in',
      status: 'published',
      slug: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 44,
        name: 'Hibrid plug-in',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarFuel(44, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-fuels/44`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Hibrid plug-in',
          status: 'published',
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

  it('creates a car color with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Albastru safir',
      slug: 'albastru-safir',
      status: 'draft',
      hex: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 55,
        name: 'Albastru safir',
        slug: 'albastru-safir',
        status: 'draft',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createCarColor(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-colors`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Albastru safir',
          slug: 'albastru-safir',
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

  it('updates a car color keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Albastru safir perlat',
      status: 'published',
      slug: undefined,
    } as const;

    const apiResponse: ApiItemResult<LookupRecord> = {
      data: {
        id: 55,
        name: 'Albastru safir perlat',
        status: 'published',
      } satisfies LookupRecord,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateCarColor(55, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/car-colors/55`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Albastru safir perlat',
          status: 'published',
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
