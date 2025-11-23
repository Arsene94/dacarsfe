import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type {
  MailBrandingResponse,
  MailBrandingUpdatePayload,
  MailTemplateAttachmentsResponse,
  MailTemplateDetailResponse,
  MailTemplateUpdatePayload,
  MailTemplatesResponse,
} from '@/types/mail';

describe('ApiClient admin mail branding management', () => {
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

  it('fetches mail branding settings with authentication headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: MailBrandingResponse = {
      data: {
        site: {
          title: 'DaCars',
          url: 'https://www.dacars.ro',
          logo_path: '/storage/logo.png',
          logo_max_height: 48,
          description: 'Închirieri auto premium',
          email: 'contact@dacars.ro',
          phone: '+40 745 000 000',
          phone_link: '+40745000000',
          support_phone: null,
          support_phone_link: null,
          address: 'Strada Viitorului 10',
          availability: 'Non-stop',
          menu_items: [],
          footer_links: [],
          social_links: [],
        },
        colors: {
          berkeley: '#1b1f3b',
          jade: '#3ba381',
          jadeLight: '#bde7d0',
          eefie: '#eef1f5',
        },
        resolved_site: {
          title: 'DaCars',
          url: 'https://www.dacars.ro',
          logo_path: '/storage/logo.png',
          menu_items: [],
          footer_links: [],
          social_links: [],
        },
        resolved_colors: {
          berkeley: '#1b1f3b',
          jade: '#3ba381',
          jadeLight: '#bde7d0',
          eefie: '#eef1f5',
        },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getMailBrandingSettings();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-branding-settings`,
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

  it('updates mail branding settings trimming undefined fields from payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: MailBrandingUpdatePayload = {
      site: {
        title: 'DaCars.ro',
        url: 'https://www.dacars.ro',
        logo_path: '/storage/logo.png',
        description: 'Rezervă-ți mașina de azi',
        email: 'contact@dacars.ro',
        logo_max_height: 64,
        menu_items: [
          { label: 'Flotă', url: 'https://www.dacars.ro/flota' },
          { label: 'Contact', url: 'https://www.dacars.ro/contact' },
        ],
        footer_links: [
          { label: 'Termeni și condiții', url: 'https://www.dacars.ro/termeni' },
        ],
        social_links: [{ label: 'Facebook', url: 'https://facebook.com/dacars' }],
        phone: '+40 745 000 000',
        phone_link: '+40745000000',
        support_phone: undefined,
        support_phone_link: undefined,
      },
      colors: {
        berkeley: '#1b1f3b',
        jade: '#3ba381',
        jadeLight: '#bde7d0',
        eefie: undefined,
      },
    };

    const apiResponse: MailBrandingResponse = {
      data: {
        site: {
          title: 'DaCars.ro',
          url: 'https://www.dacars.ro',
          logo_path: '/storage/logo.png',
          logo_max_height: 64,
          description: 'Rezervă-ți mașina de azi',
          email: 'contact@dacars.ro',
          phone: '+40 745 000 000',
          phone_link: '+40745000000',
          support_phone: null,
          support_phone_link: null,
          address: null,
          availability: null,
          menu_items: [
            { label: 'Flotă', url: 'https://www.dacars.ro/flota' },
            { label: 'Contact', url: 'https://www.dacars.ro/contact' },
          ],
          footer_links: [
            { label: 'Termeni și condiții', url: 'https://www.dacars.ro/termeni' },
          ],
          social_links: [{ label: 'Facebook', url: 'https://facebook.com/dacars' }],
        },
        colors: {
          berkeley: '#1b1f3b',
          jade: '#3ba381',
          jadeLight: '#bde7d0',
          eefie: '#eef1f5',
        },
        resolved_site: {
          title: 'DaCars.ro',
          url: 'https://www.dacars.ro',
          logo_path: '/storage/logo.png',
          logo_max_height: 64,
          description: 'Rezervă-ți mașina de azi',
          email: 'contact@dacars.ro',
          phone: '+40 745 000 000',
          phone_link: '+40745000000',
          support_phone: null,
          support_phone_link: null,
          address: null,
          availability: null,
          menu_items: [
            { label: 'Flotă', url: 'https://www.dacars.ro/flota' },
            { label: 'Contact', url: 'https://www.dacars.ro/contact' },
          ],
          footer_links: [
            { label: 'Termeni și condiții', url: 'https://www.dacars.ro/termeni' },
          ],
          social_links: [{ label: 'Facebook', url: 'https://facebook.com/dacars' }],
        },
        resolved_colors: {
          berkeley: '#1b1f3b',
          jade: '#3ba381',
          jadeLight: '#bde7d0',
          eefie: '#eef1f5',
        },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateMailBrandingSettings(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-branding-settings`,
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

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];
    expect(options?.body).toBeDefined();
    expect(JSON.parse(String(options?.body))).toEqual({
      site: {
        title: 'DaCars.ro',
        url: 'https://www.dacars.ro',
        logo_path: '/storage/logo.png',
        description: 'Rezervă-ți mașina de azi',
        email: 'contact@dacars.ro',
        logo_max_height: 64,
        menu_items: [
          { label: 'Flotă', url: 'https://www.dacars.ro/flota' },
          { label: 'Contact', url: 'https://www.dacars.ro/contact' },
        ],
        footer_links: [
          { label: 'Termeni și condiții', url: 'https://www.dacars.ro/termeni' },
        ],
        social_links: [{ label: 'Facebook', url: 'https://facebook.com/dacars' }],
        phone: '+40 745 000 000',
        phone_link: '+40745000000',
      },
      colors: {
        berkeley: '#1b1f3b',
        jade: '#3ba381',
        jadeLight: '#bde7d0',
      },
    });

    expect(result).toEqual(apiResponse);
  });

  it('lists mail templates using admin authentication', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: MailTemplatesResponse = {
      data: [
        {
          key: 'booking-confirmation',
          path: 'emails/booking-confirmation.blade.php',
          name: 'Confirmare rezervare',
          title: 'Rezervarea ta DaCars',
          subject: 'Confirmarea rezervării',
          updated_at: '2024-05-12T09:00:00Z',
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getMailTemplates();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates`,
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

  it('retrieves a mail template detail trimming and encoding the key', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: MailTemplateDetailResponse = {
      data: {
        key: 'booking/confirmation',
        path: 'emails/booking-confirmation.blade.php',
        name: 'Confirmare rezervare',
        title: 'Rezervarea ta DaCars',
        subject: 'Confirmarea rezervării',
        contents: '<p>Mulțumim pentru rezervare!</p>',
        updated_at: '2024-05-12T09:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getMailTemplateDetail(' booking/confirmation ');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates/booking%2Fconfirmation`,
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

  it('updates a mail template using sanitized key and payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload: MailTemplateUpdatePayload = {
      title: 'Rezervarea ta este confirmată',
      subject: 'Confirmare rezervare DaCars',
      contents: '<p>Rezervarea a fost procesată.</p>',
    };

    const apiResponse: MailTemplateDetailResponse = {
      data: {
        key: 'booking-confirmation',
        path: 'emails/booking-confirmation.blade.php',
        name: 'Confirmare rezervare',
        title: payload.title!,
        subject: payload.subject!,
        contents: payload.contents!,
        updated_at: '2024-05-12T09:05:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateMailTemplate(' booking-confirmation ', payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates/booking-confirmation`,
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

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];
    expect(JSON.parse(String(options?.body))).toEqual(payload);

    expect(result).toEqual(apiResponse);
  });

  it('uploads a mail template attachment with provided file name and deposit flag', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const file = new File(['contract'], 'contract.pdf', { type: 'application/pdf' });

    const apiResponse: MailTemplateAttachmentsResponse = {
      data: {
        attachments: [
          {
            id: 'uuid-1',
            name: 'Contract PDF',
            filename: 'contract.pdf',
            with_deposit: true,
          },
        ],
        attachment: {
          id: 'uuid-1',
          name: 'Contract PDF',
          filename: 'contract.pdf',
          with_deposit: true,
        },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.uploadMailTemplateAttachment(' booking-confirmation ', file, {
      withDeposit: true,
    });

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates/booking-confirmation/attachments`,
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    const body = options?.body as FormData;
    const appendedFile = body.get('file');
    expect(appendedFile).toBeInstanceOf(File);
    expect((appendedFile as File).name).toBe('contract.pdf');

    const entries = Array.from(body.entries());
    expect(entries).toContainEqual(['with_deposit', '1']);

    const headers = (options?.headers ?? {}) as Record<string, string>;
    expect(headers).not.toHaveProperty('Content-Type');

    expect(result).toEqual(apiResponse);
  });

  it('uploads a mail template attachment restricting to no-deposit bookings', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const file = new File(['contract'], 'no-deposit.pdf', { type: 'application/pdf' });

    const apiResponse: MailTemplateAttachmentsResponse = {
      data: {
        attachments: [],
        attachment: undefined,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.uploadMailTemplateAttachment(' invoice ', file, { withDeposit: false });

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];
    const entries = Array.from((options?.body as FormData).entries());
    expect(entries).toContainEqual(['with_deposit', '0']);
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates/invoice/attachments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
      }),
    );
  });

  it('uploads a mail template attachment with default filename and no deposit flag', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const blob = new Blob(['terms'], { type: 'text/plain' });

    const apiResponse: MailTemplateAttachmentsResponse = {
      data: {
        attachments: [],
        attachment: undefined,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await client.uploadMailTemplateAttachment(' terms ', blob);

    const [, options] = fetchMock.mock.calls.at(-1) ?? [];
    const body = options?.body as FormData;
    const appendedFile = body.get('file');
    expect(appendedFile).toBeInstanceOf(File);
    expect((appendedFile as File).name).toBe('attachment');
    const entries = Array.from(body.keys());
    expect(entries).toEqual(['file']);
  });

  it('deletes a mail template attachment with sanitized identifiers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: MailTemplateAttachmentsResponse = {
      data: {
        attachments: [],
        attachment: undefined,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteMailTemplateAttachment(
      ' booking confirmation ',
      ' uuid-1234 ',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/mail-templates/booking%20confirmation/attachments/uuid-1234`,
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
