import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiDeleteResponse, ApiItemResult, ApiListResult, ApiMessageResponse } from '@/types/api';
import type { User } from '@/types/auth';


describe('ApiClient admin user management', () => {
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

  it('lists users with filters, role includes, and sorting', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<User> = {
      data: [
        {
          id: 1,
          first_name: 'Ana',
          last_name: 'Ionescu',
          email: 'ana@dacars.ro',
          username: 'ana.ionescu',
          avatar: null,
          super_user: true,
          manage_supers: true,
          roles: ['admin'],
          permissions: ['manage_users'],
          last_login: '2024-03-18T10:00:00Z',
          created_at: '2024-01-05T08:00:00Z',
          updated_at: '2024-03-18T10:00:00Z',
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getUsers({
      search: 'ana',
      page: 2,
      perPage: 15,
      limit: 0,
      roles: ['admin', 'manager'],
      includeRoles: true,
      sort: '-created_at',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users?search=ana&page=2&per_page=15&limit=0&roles%5B%5D=admin&roles%5B%5D=manager&include=roles&sort=-created_at`,
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

  it('lists users filtered by a single role without including relationships', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<User> = {
      data: [],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getUsers({
      roles: 'support',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users?roles=support`,
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

  it('fetches a single user with optional role include', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<User> = {
      data: {
        id: 7,
        first_name: 'Matei',
        last_name: 'Popescu',
        email: 'matei@dacars.ro',
        username: 'matei.popescu',
        avatar: null,
        super_user: false,
        manage_supers: false,
        roles: ['support'],
        permissions: [],
        last_login: null,
        created_at: '2024-02-01T08:00:00Z',
        updated_at: '2024-03-01T08:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getUser(7, { includeRoles: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/7?include=roles`,
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

  it('fetches a single user without includes when not requested', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<User> = {
      data: {
        id: 12,
        first_name: 'Irina',
        last_name: 'Stan',
        email: 'irina@dacars.ro',
        username: 'irina.stan',
        avatar: null,
        super_user: false,
        manage_supers: false,
        roles: [],
        permissions: [],
        last_login: null,
        created_at: '2024-02-14T08:00:00Z',
        updated_at: '2024-03-12T08:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getUser(12);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/12`,
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

  it('creates a user while stripping undefined fields from payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: Parameters<ApiClient['createUser']>[0] = {
      first_name: 'Cristina',
      last_name: 'Marin',
      email: 'cristina@dacars.ro',
      username: 'cristina.marin',
      password: 'SuperSecret123',
      roles: ['admin', 'support'],
      super_user: false,
      manage_supers: true,
      avatar: undefined,
      extra_field: undefined,
    };

    const apiResponse: ApiItemResult<User> = {
      data: {
        id: 25,
        first_name: 'Cristina',
        last_name: 'Marin',
        email: 'cristina@dacars.ro',
        username: 'cristina.marin',
        avatar: null,
        super_user: false,
        manage_supers: true,
        roles: ['admin', 'support'],
        permissions: ['manage_users'],
        last_login: null,
        created_at: '2024-03-20T09:00:00Z',
        updated_at: '2024-03-20T09:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createUser(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}');
    expect(body).toEqual({
      first_name: 'Cristina',
      last_name: 'Marin',
      email: 'cristina@dacars.ro',
      username: 'cristina.marin',
      password: 'SuperSecret123',
      roles: ['admin', 'support'],
      super_user: false,
      manage_supers: true,
    });

    expect(result).toEqual(apiResponse);
  });

  it('updates a user preserving provided fields and removing undefined ones', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: Parameters<ApiClient['updateUser']>[1] = {
      first_name: 'Matei',
      last_name: undefined,
      email: 'matei@dacars.ro',
      username: undefined,
      roles: ['support'],
      manage_supers: false,
      super_user: undefined,
      password: undefined,
    };

    const apiResponse: ApiItemResult<User> = {
      data: {
        id: 7,
        first_name: 'Matei',
        last_name: 'Popescu',
        email: 'matei@dacars.ro',
        username: 'matei.popescu',
        avatar: null,
        super_user: false,
        manage_supers: false,
        roles: ['support'],
        permissions: [],
        last_login: null,
        created_at: '2024-02-01T08:00:00Z',
        updated_at: '2024-03-22T08:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateUser(7, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/7`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}');
    expect(body).toEqual({
      first_name: 'Matei',
      email: 'matei@dacars.ro',
      roles: ['support'],
      manage_supers: false,
    });

    expect(result).toEqual(apiResponse);
  });

  it('promotes a user to super admin', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiMessageResponse = { message: 'Utilizatorul a devenit super admin' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.makeUserSuper(10);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/10/super`,
      expect.objectContaining({
        method: 'POST',
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

  it('revokes a user super admin status', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiMessageResponse = { message: 'Utilizatorul nu mai este super admin' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.removeUserSuper(10);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/10/super`,
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

  it('deletes a user and returns confirmation', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = { message: 'Utilizatorul a fost șters' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteUser(42);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/users/42`,
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
