import type { BlogCategory, BlogPost } from "@/types/blog";

const normalizeLanguage = (value?: string | null): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    return trimmed.toLowerCase();
};

const matchesLanguage = (candidate?: string | null, locale?: string | null): boolean => {
    const normalizedCandidate = normalizeLanguage(candidate);
    const normalizedLocale = normalizeLanguage(locale);

    if (!normalizedCandidate || !normalizedLocale) {
        return false;
    }

    if (normalizedCandidate === normalizedLocale) {
        return true;
    }

    const [candidateBase] = normalizedCandidate.split(/[\-_]/);
    const [localeBase] = normalizedLocale.split(/[\-_]/);

    return Boolean(candidateBase && localeBase && candidateBase === localeBase);
};

export const applyBlogCategoryTranslation = <T extends BlogCategory | null | undefined>(
    category: T,
    locale?: string | null,
): T => {
    if (!category || !category.translations || category.translations.length === 0) {
        return category;
    }

    const translation = category.translations.find((entry) => matchesLanguage(entry.lang, locale));
    if (!translation) {
        return category;
    }

    return {
        ...category,
        name: translation.name ?? category.name,
        description: translation.description ?? category.description,
    } as T;
};

export const applyBlogPostTranslation = (post: BlogPost, locale?: string | null): BlogPost => {
    const translatedCategory = applyBlogCategoryTranslation(post.category, locale);

    if (!post.translations || post.translations.length === 0) {
        return {
            ...post,
            category: translatedCategory,
        };
    }

    const translation = post.translations.find((entry) => matchesLanguage(entry.lang, locale));
    if (!translation) {
        return {
            ...post,
            category: translatedCategory,
        };
    }

    return {
        ...post,
        title: translation.title ?? post.title,
        excerpt: translation.excerpt ?? post.excerpt,
        content: translation.content ?? post.content,
        meta_title: translation.meta_title ?? post.meta_title,
        meta_description: translation.meta_description ?? post.meta_description,
        category: translatedCategory,
    };
};
