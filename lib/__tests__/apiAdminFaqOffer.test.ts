import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type { ApiListResult } from '@/types/api';
import type { FaqCategory } from '@/types/faq';
import type { Offer } from '@/types/offer';

describe('ApiClient admin FAQ and offers endpoints', () => {
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

    it('lists FAQ categories from the admin endpoint with sanitized filters', async () => {
        const client = new ApiClient(baseURL);
        client.setToken('admin-token');

        const apiResponse: ApiListResult<FaqCategory> = {
            data: [],
        };

        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify(apiResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const result = await client.getAdminFaqCategories({
            language: ' ro ',
            perPage: 50,
            show_on_site: false,
            include: ['faqs'],
            audience: 'admin',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            `${baseURL}/admin/faq-categories/ro?per_page=50&show_on_site=0&audience=admin&include=faqs`,
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

    it('lists offers from the admin endpoint regardless of visibility', async () => {
        const client = new ApiClient(baseURL);
        client.setToken('admin-token');

        const apiResponse: ApiListResult<Offer> = {
            data: [],
        };

        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify(apiResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        const result = await client.getAdminOffers({
            language: ' ro ',
            perPage: 25,
            show_on_site: 0,
            audience: 'admin',
            sort: ' -updated_at ',
            include: 'faqs',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            `${baseURL}/admin/offers/ro?per_page=25&show_on_site=0&audience=admin&sort=-updated_at&include=faqs`,
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

