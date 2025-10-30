import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api';
import { loadFeaturedOffers } from '@/lib/offers/publicOffers';
import type { ApiListResult } from '@/types/api';
import type { Offer } from '@/types/offer';

describe('loadFeaturedOffers', () => {
  let getOffersSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getOffersSpy = vi.spyOn(apiClient, 'getOffers');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    getOffersSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returnează ofertele localizate atunci când API-ul răspunde cu succes', async () => {
    const offer: Offer = {
      id: 10,
      title: 'Ofertă Diaspora',
      slug: 'oferta-diaspora',
      description: 'Reducere pentru clienții din diaspora.',
      discount_label: '15% reducere',
      show_on_site: true,
    };

    const apiResponse: ApiListResult<Offer> = {
      data: [offer],
    };

    getOffersSpy.mockResolvedValueOnce(apiResponse);

    const result = await loadFeaturedOffers('ro');

    expect(getOffersSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: 'public',
        status: 'published',
        limit: 4,
        sort: '-starts_at,-created_at',
        language: 'ro',
      }),
    );
    expect(result).toEqual([offer]);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('folosește fallback-ul în română dacă varianta localizată nu este disponibilă', async () => {
    const fallbackOffer: Offer = {
      id: 7,
      title: 'Ofertă de iarnă',
      slug: 'oferta-iarna',
      description: 'Tarife speciale pentru sezonul rece.',
      discount_label: '20% reducere',
      show_on_site: true,
    };

    const fallbackResponse: ApiListResult<Offer> = {
      data: [fallbackOffer],
    };

    getOffersSpy
      .mockRejectedValueOnce(new Error('Service indisponibil pentru locale-ul cerut'))
      .mockResolvedValueOnce(fallbackResponse);

    const result = await loadFeaturedOffers('en');

    expect(getOffersSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        audience: 'public',
        status: 'published',
        limit: 4,
        sort: '-starts_at,-created_at',
        language: 'en',
      }),
    );

    expect(getOffersSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        audience: 'public',
        status: 'published',
        limit: 4,
        sort: '-starts_at,-created_at',
      }),
    );

    expect(result).toEqual([fallbackOffer]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
