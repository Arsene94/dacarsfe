import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult } from '@/types/api';
import type { Role, RolePermissionGroup } from '@/types/roles';

describe('ApiClient admin role management', () => {
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

  it('lists roles with pagination and permission includes', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<Role> = {
      data: [
        {
          id: 1,
          slug: 'admin',
          name: 'Administrator',
          description: 'Acces complet',
          is_default: true,
          created_by: 10,
          updated_by: 10,
          created_at: '2024-01-01T08:00:00Z',
          updated_at: '2024-03-01T09:30:00Z',
          permissions: [
            {
              id: 101,
              name: 'manage_users',
              group: 'utilizatori',
            },
          ],
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getRoles({
      page: 2,
      perPage: 25,
      includePermissions: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles?page=2&per_page=25&include=permissions`,
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

  it('lists roles without permission includes when not requested', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<Role> = {
      data: [],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getRoles();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles`,
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

  it('retrieves a single role with permissions include when requested', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Role> = {
      data: {
        id: 7,
        slug: 'fleet-manager',
        name: 'Fleet Manager',
        description: 'Gestionează flota',
        is_default: false,
        created_by: 3,
        updated_by: 5,
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-03-10T10:00:00Z',
        permissions: [
          {
            id: 205,
            name: 'manage_cars',
            group: 'flota',
          },
        ],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getRole(7, { includePermissions: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles/7?include=permissions`,
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

  it('retrieves a single role without includes when not provided', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Role> = {
      data: {
        id: 8,
        slug: 'support',
        name: 'Suport clienți',
        description: null,
        is_default: false,
        permissions: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getRole(8);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles/8`,
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

  it('creates a new role with sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Role> = {
      data: {
        id: 11,
        slug: 'marketing',
        name: 'Marketing',
        description: 'Campanii și promoții',
        is_default: false,
        permissions: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createRole({
      slug: 'marketing',
      name: 'Marketing',
      description: undefined,
      is_default: false,
      permissions: ['manage_campaigns'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        body: JSON.stringify({
          slug: 'marketing',
          name: 'Marketing',
          is_default: false,
          permissions: ['manage_campaigns'],
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('updates an existing role while stripping undefined fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<Role> = {
      data: {
        id: 11,
        slug: 'marketing',
        name: 'Marketing & Sales',
        description: 'Campanii și oferte',
        is_default: false,
        permissions: [
          {
            id: 307,
            name: 'manage_campaigns',
            group: 'marketing',
          },
        ],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateRole(11, {
      name: 'Marketing & Sales',
      description: 'Campanii și oferte',
      permissions: ['manage_campaigns', 'view_reports'],
      is_default: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles/11`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        body: JSON.stringify({
          name: 'Marketing & Sales',
          description: 'Campanii și oferte',
          permissions: ['manage_campaigns', 'view_reports'],
        }),
      }),
    );

    expect(result).toEqual(apiResponse);
  });

  it('deletes a role with admin authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      success: true,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteRole(9);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/roles/9`,
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

  it('fetches grouped permissions for role assignment', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: RolePermissionGroup[] = [
      {
        group: 'flota',
        permissions: [
          {
            id: 410,
            name: 'manage_cars',
            group: 'flota',
          },
        ],
      },
    ];

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getPermissionGroups();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/permissions/grouped`,
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
});
