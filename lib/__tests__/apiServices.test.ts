import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type { Service, ServiceTranslation } from '@/types/reservation';

describe('ApiClient admin services management', () => {
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

  it('lists services with filters, sanitized query params and language', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const params = {
      language: 'ro',
      page: 2,
      perPage: 30,
      limit: 10,
      status: ' pending ',
      name_like: ' Transfer VIP ',
      include: ' translations ',
    } as const;

    const apiResponse: ApiListResult<Service> = {
      data: [
        {
          id: 1,
          name: 'Transfer VIP',
          price: 99,
          status: 'pending',
        } as Service,
      ],
      meta: {
        current_page: 2,
        per_page: 30,
        total: 1,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getServices(params);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/ro?page=2&per_page=30&limit=10&status=pending&name_like=Transfer+VIP&include=translations`,
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

  it('uses stored language and per_page fallback when listing services', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');
    client.setLanguage('en');

    const apiResponse: ApiListResult<Service> = {
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

    const result = await client.getServices({ per_page: 15 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/en?per_page=15`,
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

  it('retrieves a specific service including optional language', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Service> = {
      data: {
        id: 12,
        name: 'Asigurare CASCO',
        price: 15,
      } as Service,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getService(12, 'de-DE');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/12/de-DE`,
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

  it('retrieves a service using the stored admin language when not provided', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');
    client.setLanguage('es');

    const apiResponse: ApiItemResult<Service> = {
      data: {
        id: 4,
        name: 'Conductor privado',
      } as Service,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getService(4);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/4/es`,
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

  it('creates a service using sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Șofer personal',
      price: 49,
      status: 'published',
      description: undefined,
      content: undefined,
    } as const;

    const apiResponse: ApiItemResult<Service> = {
      data: {
        id: 7,
        name: 'Șofer personal',
        price: 49,
        status: 'published',
      } as Service,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createService(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Șofer personal',
          price: 49,
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

  it('updates an existing service keeping only provided fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      description: 'Serviciu cu șofer 24/7',
      content: '<p>Transfer privat cu șofer dedicat.</p>',
      price: '79',
    } as const;

    const apiResponse: ApiItemResult<Service> = {
      data: {
        id: 7,
        name: 'Șofer personal',
        description: 'Serviciu cu șofer 24/7',
        content: '<p>Transfer privat cu șofer dedicat.</p>',
        price: 79,
      } as Service,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateService(7, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/7`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          description: 'Serviciu cu șofer 24/7',
          content: '<p>Transfer privat cu șofer dedicat.</p>',
          price: '79',
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

  it('deletes a service using the admin context', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      message: 'Serviciu șters',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteService(9);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/9`,
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

  it('returns normalized translations list for a service', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse = {
      data: [
        {
          lang_code: 'ro',
          name: 'Transfer aeroport',
        },
        {
          lang_code: 'en',
          name: 'Airport transfer',
        },
      ],
      meta: { total: 2 },
    } satisfies ApiListResult<ServiceTranslation>;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getServiceTranslations(4);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/4/translations`,
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

  it('returns translations directly when API already sends an array', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ServiceTranslation[] = [
      {
        lang_code: 'ro',
        name: 'Transfer aeroport',
      },
    ];

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getServiceTranslations(9);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/9/translations`,
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

  it('upserts a translation stripping lang_code and undefined fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: Partial<ServiceTranslation> = {
      lang_code: 'fr',
      name: 'Transfert aéroport',
      description: undefined,
      content: '<p>Navetă privată cu șofer.</p>',
    };

    const apiResponse: ServiceTranslation = {
      lang_code: 'fr',
      name: 'Transfert aéroport',
      content: '<p>Navetă privată cu șofer.</p>',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.upsertServiceTranslation(3, ' fr-FR ', payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/3/translations/fr-FR`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          name: 'Transfert aéroport',
          content: '<p>Navetă privată cu șofer.</p>',
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

  it('deletes a specific translation keeping admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      message: 'Traducere eliminată',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteServiceTranslation(5, ' it-IT ');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/services/5/translations/it-IT`,
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
