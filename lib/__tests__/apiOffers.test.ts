import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult } from '@/types/api';
import type { Offer, OfferPayload } from '@/types/offer';

describe('ApiClient admin offers management', () => {
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

  it('creates an offer using sanitized payload and admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      title: 'Early Booking',
      status: 'published',
      badge: undefined,
      offer_type: 'percentage_discount',
      offer_value: '15%',
      features: ['Ridicare gratuită de la aeroport'],
      benefits: 'Asigurare completă inclusă',
      starts_at: '2024-10-01T00:00:00Z',
      ends_at: null,
    } satisfies OfferPayload;

    const apiResponse: ApiItemResult<Offer> = {
      data: {
        id: 12,
        title: 'Early Booking',
        status: 'published',
        offer_type: 'percentage_discount',
        offer_value: '15%',
      } as Offer,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createOffer(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/offers`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Early Booking',
          status: 'published',
          offer_type: 'percentage_discount',
          offer_value: '15%',
          features: ['Ridicare gratuită de la aeroport'],
          benefits: 'Asigurare completă inclusă',
          starts_at: '2024-10-01T00:00:00Z',
          ends_at: null,
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

  it('updates an offer keeping only provided fields and admin auth headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      status: 'draft',
      description: 'Promoție early bird pentru rezervările făcute cu 30 de zile înainte.',
      primary_cta_label: 'Rezervă acum',
      primary_cta_url: 'https://dacars.test/oferte/early-booking',
      background_class: 'bg-berkeley-600',
      text_class: undefined,
    } satisfies OfferPayload;

    const apiResponse: ApiItemResult<Offer> = {
      data: {
        id: 12,
        title: 'Early Booking',
        status: 'draft',
        description: 'Promoție early bird pentru rezervările făcute cu 30 de zile înainte.',
      } as Offer,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateOffer(12, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/offers/12`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          status: 'draft',
          description: 'Promoție early bird pentru rezervările făcute cu 30 de zile înainte.',
          primary_cta_label: 'Rezervă acum',
          primary_cta_url: 'https://dacars.test/oferte/early-booking',
          background_class: 'bg-berkeley-600',
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
