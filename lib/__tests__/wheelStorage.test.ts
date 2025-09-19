import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WHEEL_PRIZE_STORAGE_KEY,
  WHEEL_PRIZE_TTL_MS,
  clearStoredWheelPrize,
  getStoredWheelPrize,
  isStoredWheelPrizeActive,
  parseStoredWheelPrize,
  storeWheelPrize,
} from '@/lib/wheelStorage';
import type { StoredWheelPrizeEntry } from '@/lib/wheelStorage';
import type { WheelPrize } from '@/types/wheel';

describe('wheelStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('parses and normalizes stored wheel prizes with alternative field names', () => {
    const raw = {
      version: 2,
      prize: {
        id: '5',
        periodId: '9',
        name: 'Test Prize',
        description: 'Detalii',
        amount: '10,5',
        hex: '#123456',
        weight: '1.5',
        prize_type: 'percentage_discount',
        created_at: '2024-01-02T08:00:00Z',
        updated_at: '2024-01-02T09:00:00Z',
      },
      participant: {
        name: '  Ana ',
        phone: ' 0712345678 ',
      },
      wheel_of_fortune_id: '9',
      prize_id: '11',
      saved_at: '2024-01-03T10:00:00Z',
      expire_at: '2024-02-03T10:00:00Z',
    };

    const parsed = parseStoredWheelPrize(raw);

    expect(parsed).toStrictEqual({
      version: 2,
      prize: {
        id: 5,
        period_id: 9,
        title: 'Test Prize',
        description: 'Detalii',
        amount: 10.5,
        color: '#123456',
        probability: 1.5,
        type: 'percentage_discount',
        created_at: new Date('2024-01-02T08:00:00Z').toISOString(),
        updated_at: new Date('2024-01-02T09:00:00Z').toISOString(),
      },
      winner: {
        name: 'Ana',
        phone: '0712345678',
      },
      wheel_of_fortune_id: 9,
      prize_id: 11,
      saved_at: new Date('2024-01-03T10:00:00Z').toISOString(),
      expires_at: new Date('2024-02-03T10:00:00Z').toISOString(),
    });
  });

  it('returns null for records missing required fields', () => {
    expect(parseStoredWheelPrize({})).toBeNull();
    expect(
      parseStoredWheelPrize({
        prize: { id: '1' },
        winner: { name: 'Test' },
        saved_at: '2024-01-01T00:00:00Z',
        expires_at: null,
      }),
    ).toBeNull();
  });

  it('stores sanitized records in localStorage and computes expiry', () => {
    const prize: WheelPrize = {
      id: 4,
      period_id: 7,
      title: 'Premiu',
      description: null,
      amount: 12,
      color: '#ff0000',
      probability: 0.5,
      type: 'percentage_discount',
      created_at: null,
      updated_at: null,
    };

    const savedAt = '2024-05-01T00:00:00Z';
    const entry = storeWheelPrize({
      prize,
      winner: { name: '  Bob  ', phone: '  0711222333 ' },
      savedAt,
      expiresAt: undefined,
    });

    expect(entry.version).toBe(1);
    expect(entry.prize).toStrictEqual({
      id: 4,
      period_id: 7,
      title: 'Premiu',
      description: null,
      amount: 12,
      color: '#ff0000',
      probability: 0.5,
      type: 'percentage_discount',
      created_at: null,
      updated_at: null,
    });
    expect(entry.winner).toStrictEqual({ name: 'Bob', phone: '0711222333' });
    expect(entry.wheel_of_fortune_id).toBe(4);
    expect(entry.prize_id).toBeNull();
    expect(entry.saved_at).toBe(new Date(savedAt).toISOString());
    expect(entry.expires_at).toBe(
      new Date(new Date(savedAt).getTime() + WHEEL_PRIZE_TTL_MS).toISOString(),
    );

    const stored = localStorage.getItem(WHEEL_PRIZE_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toStrictEqual(entry);
  });

  it('reads stored records from localStorage and purges invalid data', () => {
    const validRaw = {
      prize: {
        id: 1,
        period_id: 1,
        title: 'Premiu',
        description: null,
        amount: 5,
        color: '#111111',
        probability: 0,
        type: 'other',
        created_at: null,
        updated_at: null,
      },
      winner: { name: 'Ana', phone: '0712345678' },
      wheel_of_fortune_id: 1,
      prize_id: 1,
      saved_at: '2024-01-01T00:00:00Z',
      expires_at: '2099-01-01T00:00:00Z',
    } satisfies Omit<StoredWheelPrizeEntry, 'version'>;

    localStorage.setItem(
      WHEEL_PRIZE_STORAGE_KEY,
      JSON.stringify({ ...validRaw, version: 1 }),
    );

    const record = getStoredWheelPrize();
    expect(record).not.toBeNull();
    expect(record?.winner.name).toBe('Ana');

    localStorage.setItem(WHEEL_PRIZE_STORAGE_KEY, JSON.stringify({}));
    expect(getStoredWheelPrize()).toBeNull();
    expect(localStorage.getItem(WHEEL_PRIZE_STORAGE_KEY)).toBeNull();

    localStorage.setItem(WHEEL_PRIZE_STORAGE_KEY, '{invalid-json');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getStoredWheelPrize()).toBeNull();
    expect(localStorage.getItem(WHEEL_PRIZE_STORAGE_KEY)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('clears stored prizes explicitly', () => {
    localStorage.setItem(WHEEL_PRIZE_STORAGE_KEY, JSON.stringify({ some: 'value' }));
    clearStoredWheelPrize();
    expect(localStorage.getItem(WHEEL_PRIZE_STORAGE_KEY)).toBeNull();
  });

  it('determines whether a stored prize is still active', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const active: StoredWheelPrizeEntry = {
      version: 1,
      prize: {
        id: 1,
        period_id: 1,
        title: 'Premiu',
        description: null,
        amount: null,
        color: '#000',
        probability: 0,
        type: 'other',
        created_at: null,
        updated_at: null,
      },
      winner: { name: 'Ana', phone: '0712345678' },
      wheel_of_fortune_id: 1,
      prize_id: 1,
      saved_at: new Date('2023-12-31T00:00:00Z').toISOString(),
      expires_at: new Date('2024-01-02T12:00:00Z').toISOString(),
    };

    const expired = { ...active, expires_at: new Date('2024-01-01T11:59:59Z').toISOString() };

    expect(isStoredWheelPrizeActive(active, now)).toBe(true);
    expect(isStoredWheelPrizeActive(expired, now)).toBe(false);
    expect(isStoredWheelPrizeActive(null, now)).toBe(false);
    expect(isStoredWheelPrizeActive({ ...active, expires_at: 'invalid-date' }, now)).toBe(false);
  });
});
