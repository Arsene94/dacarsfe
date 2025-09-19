import { describe, expect, it } from 'vitest';

import { cn, getStatusText } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class names and ignores falsy values', () => {
    expect(cn('btn', undefined, 'btn-primary', null, false, 'active')).toBe('btn btn-primary active');
  });

  it('returns an empty string when all values are falsy', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });
});

describe('getStatusText', () => {
  it('returns localized labels for known statuses', () => {
    expect(getStatusText('reserved')).toBe('Rezervat');
    expect(getStatusText('pending')).toBe('În așteptare');
    expect(getStatusText('cancelled')).toBe('Anulat');
    expect(getStatusText('completed')).toBe('Finalizat');
    expect(getStatusText('no_answer')).toBe('Fără răspuns');
    expect(getStatusText('waiting_advance_payment')).toBe('Așteaptă avans');
  });

  it('falls back to the original status when no translation is available', () => {
    expect(getStatusText('custom_status')).toBe('custom_status');
  });
});
