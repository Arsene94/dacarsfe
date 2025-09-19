import { describe, expect, it } from 'vitest';

import {
  buildWheelPrizeDefaultDescription,
  describeWheelPrizeAmount,
  describeWheelPrizeSummaryAmount,
  formatWheelPrizeAmount,
  formatWheelPrizeExpiry,
  mapReservationPrizeToWheelPrize,
} from '@/lib/wheelFormatting';
import type { WheelPrize } from '@/types/wheel';
import type { ReservationWheelPrizeSummary } from '@/types/reservation';

describe('formatWheelPrizeAmount', () => {
  const basePrize: WheelPrize = {
    id: 1,
    period_id: 2,
    title: 'Test',
    description: null,
    amount: 10,
    color: '#000000',
    probability: 0,
    type: 'other',
    created_at: null,
    updated_at: null,
  };

  it('returns a dash for missing values or invalid amounts', () => {
    expect(formatWheelPrizeAmount(null)).toBe('—');
    expect(formatWheelPrizeAmount({ ...basePrize, amount: Number.NaN })).toBe('—');
  });

  it('formats percentage prizes with the percent suffix', () => {
    expect(formatWheelPrizeAmount({ ...basePrize, type: 'percentage_discount', amount: 15 })).toBe('15%');
  });

  it('formats fixed discounts with the RON suffix', () => {
    expect(formatWheelPrizeAmount({ ...basePrize, type: 'fixed_discount', amount: 25 })).toBe('25 RON');
  });

  it('formats extra rental day prizes with pluralization support', () => {
    expect(formatWheelPrizeAmount({ ...basePrize, type: 'extra_rental_day', amount: 1 })).toBe('1 zi');
    expect(formatWheelPrizeAmount({ ...basePrize, type: 'extra_rental_day', amount: 1.5 })).toBe('1,5 zile');
  });

  it('falls back to locale formatting for other prize types', () => {
    expect(formatWheelPrizeAmount(basePrize)).toBe('10');
  });
});

describe('describeWheelPrizeAmount', () => {
  const basePrize: WheelPrize = {
    id: 10,
    period_id: 11,
    title: 'Bonus',
    description: null,
    amount: 20,
    color: '#ff0000',
    probability: 0,
    type: 'percentage_discount',
    created_at: null,
    updated_at: null,
  };

  it('returns null when formatting yields no value', () => {
    expect(describeWheelPrizeAmount({ ...basePrize, amount: Number.NaN })).toBeNull();
  });

  it('returns human-readable descriptions based on type', () => {
    expect(describeWheelPrizeAmount(basePrize)).toBe('Reducere de 20%');
    expect(describeWheelPrizeAmount({ ...basePrize, type: 'fixed_discount' })).toBe('Discount de 20 RON');
    expect(describeWheelPrizeAmount({ ...basePrize, type: 'extra_rental_day' })).toBe('Bonus de 20 zile');
    expect(describeWheelPrizeAmount({ ...basePrize, type: 'vehicle_upgrade' })).toBe('20');
  });
});

describe('mapReservationPrizeToWheelPrize', () => {
  it('maps reservation summaries to wheel prizes and normalizes numbers', () => {
    const summary: ReservationWheelPrizeSummary = {
      wheel_of_fortune_id: '5' as unknown as number,
      prize_id: '8' as unknown as number,
      title: 'Reducere specială',
      type: 'fixed_discount',
      amount: '123 RON' as unknown as number,
      description: 'Economisește acum',
      discount_value: 100,
      amount_label: null,
      expires_at: null,
    };

    expect(mapReservationPrizeToWheelPrize(summary)).toStrictEqual({
      id: 8,
      period_id: 5,
      title: 'Reducere specială',
      description: 'Economisește acum',
      amount: 123,
      color: '#000000',
      probability: 0,
      type: 'fixed_discount',
      created_at: null,
      updated_at: null,
    });
  });

  it('returns null for empty summaries', () => {
    expect(mapReservationPrizeToWheelPrize(null)).toBeNull();
  });
});

describe('describeWheelPrizeSummaryAmount', () => {
  const baseSummary: ReservationWheelPrizeSummary = {
    wheel_of_fortune_id: 1,
    prize_id: 2,
    title: 'Premiu',
    type: 'percentage_discount',
    amount: 30,
    description: null,
    amount_label: null,
    expires_at: null,
    discount_value: 0,
  };

  it('returns a custom label when provided', () => {
    expect(describeWheelPrizeSummaryAmount({ ...baseSummary, amount_label: '   Mega reducere   ' })).toBe('   Mega reducere   ');
  });

  it('falls back to describing the mapped prize', () => {
    expect(describeWheelPrizeSummaryAmount(baseSummary)).toBe('Reducere de 30%');
  });

  it('returns null for empty summaries', () => {
    expect(describeWheelPrizeSummaryAmount(null)).toBeNull();
  });
});

describe('formatWheelPrizeExpiry', () => {
  it('formats valid ISO strings using the Romanian locale', () => {
    expect(formatWheelPrizeExpiry('2024-12-05T00:00:00Z')).toBe('5 decembrie 2024');
  });

  it('returns null for invalid values', () => {
    expect(formatWheelPrizeExpiry(undefined)).toBeNull();
    expect(formatWheelPrizeExpiry('not-a-date')).toBeNull();
  });
});

describe('buildWheelPrizeDefaultDescription', () => {
  const basePrize: WheelPrize = {
    id: 1,
    period_id: 1,
    title: 'Premiu',
    description: null,
    amount: 10,
    color: '#000000',
    probability: 0,
    type: 'percentage_discount',
    created_at: null,
    updated_at: null,
  };

  it('builds context-aware default descriptions', () => {
    expect(buildWheelPrizeDefaultDescription(basePrize)).toBe('Reducere de 10% la următoarea rezervare.');
    expect(buildWheelPrizeDefaultDescription({ ...basePrize, type: 'fixed_discount' })).toBe('Discount de 10 RON aplicat la rezervarea ta.');
    expect(buildWheelPrizeDefaultDescription({ ...basePrize, type: 'extra_rental_day' })).toBe('Bonus de 10 zile pentru mașina rezervată.');
    expect(buildWheelPrizeDefaultDescription({ ...basePrize, type: 'vehicle_upgrade' })).toBe('10');
  });

  it('returns null when the amount description is missing', () => {
    expect(buildWheelPrizeDefaultDescription({ ...basePrize, amount: Number.NaN })).toBeNull();
  });
});
