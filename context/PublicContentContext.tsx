"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import apiClient from "@/lib/api";
import {
  DEFAULT_PUBLIC_LOCALE,
  PUBLIC_LOCALE_COOKIE_NAME,
  PUBLIC_LOCALE_STORAGE_KEY,
  isSupportedPublicLocale,
  normalizePublicLocale,
} from "@/lib/publicContent/config";
import {
  getByPath,
  isCompatibleValue,
  isPlainObject,
  mergeContent,
} from "@/lib/publicContent/utils";
import type {
  PublicContentDictionary,
  PublicContentRequestParams,
  PublicContentResponse,
  PublicLocale,
} from "@/types/public-content";

type ResolveFn = <T>(path: string, fallback: T) => T;

type PublicContentContextValue = {
  locale: PublicLocale;
  setLocale: (nextLocale: PublicLocale) => void;
  resolve: ResolveFn;
  t: (key: string, fallback: string) => string;
  refresh: () => Promise<void>;
  isLoading: boolean;
  version: string | null;
  updatedAt: string | null;
  error: string | null;
};

const PublicContentContext = createContext<PublicContentContextValue | undefined>(
  undefined,
);

const noopResolve: ResolveFn = (_path, fallback) => fallback;

type ProviderProps = {
  children: ReactNode;
  initialLocale?: PublicLocale;
  initialContent?: PublicContentDictionary | null;
  initialVersion?: string | null;
  initialUpdatedAt?: string | null;
};

const normalizeSections = (
  response: PublicContentResponse | null | undefined,
): PublicContentDictionary => {
  if (!response) {
    return {};
  }

  if (isPlainObject(response.content)) {
    return response.content;
  }

  if (
    Array.isArray(response.sections) &&
    response.sections.length > 0 &&
    isPlainObject(response.meta)
  ) {
    const subset: PublicContentDictionary = {};
    response.sections.forEach((sectionKey) => {
      const value = getByPath(response.meta ?? {}, sectionKey);
      if (typeof sectionKey === "string" && typeof value !== "undefined") {
        subset[sectionKey] = value;
      }
    });
    return subset;
  }

  return {};
};

const persistLocale = (locale: PublicLocale) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn("Failed to persist locale to localStorage", error);
  }

  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const encodedValue = encodeURIComponent(locale);
  document.cookie = `${PUBLIC_LOCALE_COOKIE_NAME}=${encodedValue}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
};

const readStoredLocale = (): PublicLocale | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(PUBLIC_LOCALE_STORAGE_KEY);
    if (isSupportedPublicLocale(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to read locale from localStorage", error);
  }

  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${PUBLIC_LOCALE_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  const [, value] = match.split("=");
  if (!value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(value);
    return normalizePublicLocale(decoded);
  } catch (error) {
    console.warn("Failed to decode persisted locale", error);
    return null;
  }
};

const mergeWithExisting = (
  base: PublicContentDictionary,
  update: PublicContentDictionary,
): PublicContentDictionary => {
  if (!isPlainObject(base)) {
    return update;
  }

  if (!isPlainObject(update)) {
    return base;
  }

  return mergeContent(base, update);
};

export const PublicContentProvider = ({
  children,
  initialLocale,
  initialContent,
  initialVersion,
  initialUpdatedAt,
}: ProviderProps) => {
  const [locale, setLocaleState] = useState<PublicLocale>(
    normalizePublicLocale(initialLocale ?? DEFAULT_PUBLIC_LOCALE),
  );
  const [content, setContent] = useState<PublicContentDictionary>(
    () => (isPlainObject(initialContent) ? initialContent : {}),
  );
  const [version, setVersion] = useState<string | null>(
    typeof initialVersion === "string" ? initialVersion : null,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    typeof initialUpdatedAt === "string" ? initialUpdatedAt : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortController = useRef<AbortController | null>(null);
  const didHydrateRef = useRef(false);

  const resolve: ResolveFn = useCallback(
    (path, fallback) => {
      const value = getByPath(content, path);
      if (isCompatibleValue(value, fallback)) {
        return value as typeof fallback;
      }
      return fallback;
    },
    [content],
  );

  const translate = useCallback<PublicContentContextValue["t"]>(
    (key, fallback) => {
      const resolved = resolve(key, fallback);
      return typeof resolved === "string" ? resolved : fallback;
    },
    [resolve],
  );

  const applyResponse = useCallback(
    (response: PublicContentResponse | null | undefined) => {
      if (!response) {
        return;
      }

      const normalizedContent = normalizeSections(response);
      setContent((prev) => mergeWithExisting(prev, normalizedContent));
      setVersion(
        typeof response.version === "string" ? response.version : null,
      );
      setUpdatedAt(
        typeof response.updated_at === "string"
          ? response.updated_at
          : typeof response.published_at === "string"
            ? response.published_at
            : null,
      );
    },
    [],
  );

  const fetchContent = useCallback(
    async (targetLocale: PublicLocale, params: Partial<PublicContentRequestParams> = {}) => {
      if (abortController.current) {
        abortController.current.abort();
      }

      const controller = new AbortController();
      abortController.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.getPublicContent(
          {
            locale: targetLocale,
            version: params.version ?? version,
            sections: params.sections,
            fallbackLocale: params.fallbackLocale,
            previewToken: params.previewToken,
            includeDraft: params.includeDraft,
          },
          { signal: controller.signal },
        );

        applyResponse(response);
      } catch (fetchError) {
        if ((fetchError as { name?: string })?.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch public content", fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nu am putut încărca conținutul.",
        );
      } finally {
        if (abortController.current === controller) {
          abortController.current = null;
        }
        setIsLoading(false);
      }
    },
    [applyResponse, version],
  );

  useEffect(() => {
    if (didHydrateRef.current) {
      return;
    }

    didHydrateRef.current = true;

    const stored = readStoredLocale();
    if (stored && stored !== locale) {
      setLocaleState(stored);
      void fetchContent(stored, { version: null });
      return;
    }

    if (!initialContent || Object.keys(initialContent).length === 0) {
      void fetchContent(locale);
    }
  }, [fetchContent, initialContent, locale]);

  useEffect(() => () => {
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  const updateLocale = useCallback(
    (nextLocale: PublicLocale) => {
      const normalized = normalizePublicLocale(nextLocale);
      if (normalized === locale) {
        return;
      }

      setLocaleState(normalized);
      persistLocale(normalized);
      void fetchContent(normalized, { version: null });
    },
    [fetchContent, locale],
  );

  const refresh = useCallback(async () => {
    await fetchContent(locale, { version: null });
  }, [fetchContent, locale]);

  const contextValue = useMemo<PublicContentContextValue>(
    () => ({
      locale,
      setLocale: updateLocale,
      resolve,
      t: translate,
      refresh,
      isLoading,
      version,
      updatedAt,
      error,
    }),
    [locale, updateLocale, resolve, translate, refresh, isLoading, version, updatedAt, error],
  );

  return (
    <PublicContentContext.Provider value={contextValue}>
      {children}
    </PublicContentContext.Provider>
  );
};

export const usePublicContent = () => {
  const context = useContext(PublicContentContext);
  if (!context) {
    return {
      locale: DEFAULT_PUBLIC_LOCALE,
      setLocale: () => undefined,
      resolve: noopResolve,
      t: (_key: string, fallback: string) => fallback,
      refresh: async () => undefined,
      isLoading: false,
      version: null,
      updatedAt: null,
      error: "PublicContentProvider missing",
    } satisfies PublicContentContextValue;
  }
  return context;
};

export const usePublicContentSection = <T,>(path: string, fallback: T): T => {
  const { resolve } = usePublicContent();
  return resolve(path, fallback);
};

