import { describe, expect, it } from 'vitest';

import { buildLocalBusinessStructuredData } from '@/lib/seo/localBusiness';
import type { Offer } from '@/types/offer';

describe('buildLocalBusinessStructuredData', () => {
  it('exclude review and aggregate rating metadata from the JSON-LD output', () => {
    const offers: Offer[] = [
      {
        id: 1,
        title: 'Reducere test',
        slug: 'reducere-test',
        description: 'Reducere limitată pentru testare.',
        primary_cta_url: '/offers/reducere-test',
        starts_at: '2025-01-01T00:00:00Z',
        ends_at: '2025-02-01T00:00:00Z',
      } as Offer,
    ];

    const schema = buildLocalBusinessStructuredData(
      offers,
      [
        {
          author: 'Maria Ionescu',
          body: 'Servicii excelente și predare rapidă.',
          rating: 5,
          datePublished: '2024-12-01',
        },
      ],
      { ratingValue: 4.93, reviewCount: 3 },
    );

    expect(schema.review).toBeUndefined();
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema['@type']).toBe('CarRental');
    expect(schema.makesOffer).toBeDefined();
  });
});
