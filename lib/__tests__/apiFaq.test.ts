import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiItemResult, TranslationBatchStatus } from '@/types/api';

describe('ApiClient FAQ translation helpers', () => {
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

  it('queues FAQ translations', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<TranslationBatchStatus> = {
      data: {
        id: 'faq-job-1',
        status: 'queued',
        total: { faqs: 12 },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.queueFaqTranslations();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/faqs/translate/batch`,
      expect.objectContaining({
        method: 'POST',
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

  it('retrieves FAQ translation batch status', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<TranslationBatchStatus> = {
      data: {
        id: 'faq-job-1',
        status: 'completed',
        processed: { faqs: 12, categories: 3 },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getFaqTranslationBatchStatus(' faq-job-1 ');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/faqs/translate/batch/faq-job-1`,
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
});
