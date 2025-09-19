import { describe, expect, it } from 'vitest';

import { toQuery } from '@/lib/qs';

describe('toQuery', () => {
  it('serializes primitives, arrays and trims strings', () => {
    const query = toQuery({
      search: '  electric ',
      empty: '   ',
      makes: [1, '2'],
      page: 2,
      available: false,
      limit: 0,
      skip: undefined,
      optional: null,
    });

    expect(query).toBe('search=electric&makes%5B%5D=1&makes%5B%5D=2&page=2&available=false&limit=0');
  });

  it('returns an empty string when all values are filtered out', () => {
    expect(toQuery({ name: '   ', items: [], count: null })).toBe('');
  });
});
