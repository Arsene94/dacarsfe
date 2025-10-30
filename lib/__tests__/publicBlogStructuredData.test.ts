import { describe, expect, it } from 'vitest';

import { buildBlogPostStructuredData, type BlogPostCopy } from '@/lib/blog/publicBlog';
import type { BlogPost } from '@/types/blog';

const copy: BlogPostCopy = {
  breadcrumbHome: 'Acasă',
  breadcrumbBlog: 'Blog',
  publishedLabel: 'Publicat pe',
  authorLabel: 'Autor',
  shareTitle: 'Distribuie',
  shareDescription: 'Împarte articolul cu colegii tăi.',
  notFoundTitle: 'Articol indisponibil',
  notFoundDescription: 'Nu am găsit articolul solicitat.',
};

const basePost: BlogPost = {
  id: 1,
  title: 'Sfaturi pentru închirieri',
  slug: 'sfaturi-inchirieri',
  content: '<p>Conținut util pentru clienți.</p>',
  status: 'published',
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2023-12-01T00:00:00Z',
};

describe('buildBlogPostStructuredData', () => {
  it('include FAQ și oferte în structured data atunci când sunt disponibile', () => {
    const postWithExtras: BlogPost = {
      ...basePost,
      faqs: [
        {
          id: 10,
          category_id: 2,
          question: 'Cum funcționează garanția?',
          answer: 'Garanția se blochează pe card și se eliberează după predare.',
        },
      ],
      offers: [
        {
          id: 5,
          title: 'Reducere fidelitate',
          slug: 'reducere-fidelitate',
          description: 'Activează reducerea de 15% pentru rezervările recurente.',
          discount_label: '15% reducere',
          primary_cta_url: '/offers/reducere-fidelitate',
          offer_value: '15%',
          show_on_site: true,
          starts_at: '2024-01-05T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      ],
    };

    const structuredData = buildBlogPostStructuredData(postWithExtras, copy, 'Recomandări utile pentru șoferi.');

    const faqEntry = structuredData.find((entry) => entry['@type'] === 'FAQPage') as
      | { mainEntity: unknown[] }
      | undefined;
    expect(faqEntry).toBeDefined();
    expect(Array.isArray(faqEntry?.mainEntity)).toBe(true);
    expect(faqEntry?.mainEntity).toHaveLength(1);

    const offerCatalogEntry = structuredData.find((entry) => entry['@type'] === 'OfferCatalog') as
      | { itemListElement: Array<Record<string, unknown>> }
      | undefined;
    expect(offerCatalogEntry).toBeDefined();
    expect(Array.isArray(offerCatalogEntry?.itemListElement)).toBe(true);
    expect(offerCatalogEntry?.itemListElement).toHaveLength(1);

    const firstOffer = offerCatalogEntry?.itemListElement?.[0];
    expect(firstOffer?.position).toBe(1);
    expect(firstOffer?.['@type']).toBe('Offer');
  });

  it('omite structured data pentru FAQ și oferte când nu există conținut', () => {
    const structuredData = buildBlogPostStructuredData({ ...basePost, faqs: [], offers: [] }, copy, 'Descriere');

    expect(structuredData.some((entry) => entry['@type'] === 'FAQPage')).toBe(false);
    expect(structuredData.some((entry) => entry['@type'] === 'OfferCatalog')).toBe(false);
    expect(structuredData).toHaveLength(2);
  });
});
