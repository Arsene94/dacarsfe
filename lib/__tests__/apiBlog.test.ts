import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from '@/lib/api';
import type {
  ApiDeleteResponse,
  ApiItemResult,
  ApiListResult,
  TranslationBatchStatus,
} from '@/types/api';
import type {
  BlogCategory,
  BlogCategoryPayload,
  BlogPost,
  BlogPostPayload,
  BlogTag,
  BlogTagPayload,
} from '@/types/blog';

describe('ApiClient admin blog management', () => {
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

  it('lists blog categories with sanitized filters and pagination', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<BlogCategory> = {
      data: [
        {
          id: 5,
          name: 'Mașini electrice',
          slug: 'masini-electrice',
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBlogCategories({
      page: 2,
      perPage: 20,
      limit: 50,
      name: '   ',
      search: '  electrice  ',
      slug: '  eco  ',
      sort: '  -created_at ',
      fields: ' id,name ',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-categories?page=2&per_page=20&limit=50&name=electrice&slug=eco&sort=-created_at&fields=id%2Cname`,
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

  it('creates a blog category with sanitized payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Informații utile',
      description: 'Sfaturi pentru închirieri',
      status: 'active',
      order: 3,
      icon: undefined,
    } satisfies BlogCategoryPayload;

    const apiResponse: ApiItemResult<BlogCategory> = {
      data: {
        id: 12,
        name: 'Informații utile',
        description: 'Sfaturi pentru închirieri',
        status: 'active',
        order: 3,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createBlogCategory(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-categories`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Informații utile',
          description: 'Sfaturi pentru închirieri',
          status: 'active',
          order: 3,
        }),
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

  it('updates a blog category and preserves admin headers', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      description: 'Articole tehnice și tutoriale',
      status: 'inactive',
      order: undefined,
    } satisfies BlogCategoryPayload;

    const apiResponse: ApiItemResult<BlogCategory> = {
      data: {
        id: 8,
        name: 'Tehnologie',
        description: 'Articole tehnice și tutoriale',
        status: 'inactive',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBlogCategory(8, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-categories/8`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          description: 'Articole tehnice și tutoriale',
          status: 'inactive',
        }),
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

  it('deletes a blog category', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      message: 'Categorie ștearsă',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteBlogCategory(11);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-categories/11`,
      expect.objectContaining({
        method: 'DELETE',
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

  it('lists blog tags with normalized filters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<BlogTag> = {
      data: [
        {
          id: 3,
          name: 'roadtrip',
          slug: 'roadtrip',
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBlogTags({
      page: 1,
      per_page: 30,
      limit: 100,
      name: '   ',
      search: ' roadtrip  ',
      slug: '  roadtrip  ',
      sort: ' name ',
      fields: ' id,slug ',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-tags?page=1&per_page=30&limit=100&name=roadtrip&slug=roadtrip&sort=name&fields=id%2Cslug`,
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

  it('creates a blog tag stripping undefined fields', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      name: 'Tips',
      description: undefined,
    } satisfies BlogTagPayload;

    const apiResponse: ApiItemResult<BlogTag> = {
      data: {
        id: 9,
        name: 'Tips',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createBlogTag(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-tags`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Tips',
        }),
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

  it('updates a blog tag with sanitized payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      description: 'Sfaturi pentru drumuri lungi',
      name: undefined,
    } satisfies BlogTagPayload;

    const apiResponse: ApiItemResult<BlogTag> = {
      data: {
        id: 6,
        name: 'roadtrip',
        description: 'Sfaturi pentru drumuri lungi',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBlogTag(6, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-tags/6`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          description: 'Sfaturi pentru drumuri lungi',
        }),
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

  it('deletes a blog tag', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      success: true,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteBlogTag(4);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-tags/4`,
      expect.objectContaining({
        method: 'DELETE',
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

  it('lists blog posts with include parameters and filters', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<BlogPost> = {
      data: [
        {
          id: 21,
          title: 'Top destinații 2024',
          slug: 'top-destinatii-2024',
          status: 'published',
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBlogPosts({
      page: 3,
      perPage: 15,
      limit: 45,
      category_id: 12,
      author_id: ' 9 ',
      status: ' published ',
      slug: '  top-destinatii-2024 ',
      title: '   ',
      search: '  road trips ',
      sort: ' -published_at ',
      fields: ' id,title ',
      include: [' author', 'category ', '', 'tags', 'author'],
      language: 'ro',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/ro?page=3&per_page=15&limit=45&category_id=12&author_id=+9+&status=published&slug=top-destinatii-2024&title=road+trips&sort=-published_at&fields=id%2Ctitle&include=author%2Ccategory%2Ctags`,
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

  it('lists blog posts via the admin endpoint', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiListResult<BlogPost> = {
      data: [
        { id: 9, title: 'Draft articol', slug: 'draft-articol', status: 'draft' },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getAdminBlogPosts({
      page: 2,
      perPage: 50,
      status: 'draft',
      include: ['category', 'category'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/admin/blog-posts?page=2&per_page=50&status=draft&include=category`,
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

  it('queues blog post translations', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<TranslationBatchStatus> = {
      data: {
        id: 'job-123',
        status: 'queued',
        total: 45,
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.queueBlogPostTranslations();

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/translate/batch`,
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

  it('retrieves blog post translation batch status', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<TranslationBatchStatus> = {
      data: {
        id: 'job-123',
        status: 'processing',
        processed: { posts: 10 },
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBlogPostTranslationBatchStatus(' job-123 ');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/translate/batch/job-123`,
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

  it('retrieves a single blog post', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiItemResult<BlogPost> = {
      data: {
        id: 34,
        title: 'Test drive electric',
        slug: 'test-drive-electric',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.getBlogPost(34);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/34/ro`,
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

  it('creates a blog post using JSON payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      title: 'Ghid complet leasing auto',
      excerpt: 'Tot ce trebuie să știi înainte de a închiria',
      content: '<p>Detalii utile pentru clienți.</p>',
      status: 'draft',
      category_id: 4,
      author_id: 2,
      tag_ids: [1, '2'],
      image: undefined,
    } satisfies BlogPostPayload;

    const apiResponse: ApiItemResult<BlogPost> = {
      data: {
        id: 56,
        title: 'Ghid complet leasing auto',
        slug: 'ghid-complet-leasing-auto',
        status: 'draft',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createBlogPost(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Ghid complet leasing auto',
          excerpt: 'Tot ce trebuie să știi înainte de a închiria',
          content: '<p>Detalii utile pentru clienți.</p>',
          status: 'draft',
          category_id: 4,
          author_id: 2,
          tag_ids: [1, '2'],
        }),
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

  it('creates a blog post using FormData', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const formData = new FormData();
    formData.append('title', 'Promoții vara 2024');
    formData.append('status', 'draft');

    const apiResponse: ApiItemResult<BlogPost> = {
      data: {
        id: 61,
        title: 'Promoții vara 2024',
        slug: 'promotii-vara-2024',
        status: 'draft',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.createBlogPost(formData);

    const [, requestInit] = fetchMock.mock.calls[0];

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts`,
      expect.objectContaining({
        method: 'POST',
        body: formData,
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(requestInit?.headers).not.toHaveProperty('Content-Type');
    expect(result).toEqual(apiResponse);
  });

  it('updates a blog post using JSON payload', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const payload = {
      status: 'published',
      published_at: '2024-04-01T10:00:00Z',
      meta_description: 'Ghid complet pentru clienți',
      image: undefined,
    } satisfies BlogPostPayload;

    const apiResponse: ApiItemResult<BlogPost> = {
      data: {
        id: 41,
        title: 'Experiențe premium',
        slug: 'experiente-premium',
        status: 'published',
        published_at: '2024-04-01T10:00:00Z',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBlogPost(41, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/41`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          status: 'published',
          published_at: '2024-04-01T10:00:00Z',
          meta_description: 'Ghid complet pentru clienți',
        }),
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

  it('updates a blog post using FormData', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const formData = new FormData();
    formData.append('status', 'draft');

    const apiResponse: ApiItemResult<BlogPost> = {
      data: {
        id: 72,
        title: 'Promoții trecute',
        slug: 'promotii-trecute',
        status: 'draft',
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.updateBlogPost(72, formData);

    const [, requestInit] = fetchMock.mock.calls[0];

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/72`,
      expect.objectContaining({
        method: 'PUT',
        body: formData,
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'X-API-KEY': 'kSqh88TvUXNl6TySfXaXnxbv1jeorTJt',
        }),
        credentials: 'omit',
      }),
    );

    expect(requestInit?.headers).not.toHaveProperty('Content-Type');
    expect(result).toEqual(apiResponse);
  });

  it('deletes a blog post', async () => {
    const client = new ApiClient(baseURL);
    client.setToken('admin-token');

    const apiResponse: ApiDeleteResponse = {
      message: 'Articol eliminat',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await client.deleteBlogPost(19);

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseURL}/blog-posts/19`,
      expect.objectContaining({
        method: 'DELETE',
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
