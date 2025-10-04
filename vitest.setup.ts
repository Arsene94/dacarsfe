import React from 'react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(globalThis, 'React', {
  value: React,
  writable: true,
  configurable: true,
});

class IntersectionObserverMock {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
  readonly takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

if (typeof window !== 'undefined') {
  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }
}

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props ?? {};
    const resolvedSrc = typeof src === 'string' ? src : src?.src ?? '';
    return React.createElement('img', {
      alt,
      ...rest,
      src: resolvedSrc,
    });
  },
}));
