import { trackMetaEvent, type MetaPixelFunction } from "@/lib/analytics/meta";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const hasWindow = typeof window !== "undefined";

type AdvancedMatchingPayload = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ge?: string;
  db?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  external_id?: string;
};

type FacebookPixelAdvancedMatchingUpdate = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  externalId?: string | number | null;
};

const FACEBOOK_PIXEL_EVENTS = {
  PAGE_VIEW: "PageView",
  VIEW_CONTENT: "ViewContent",
  SEARCH: "Search",
  LEAD: "Lead",
} as const;

type FacebookPixelEventName =
  (typeof FACEBOOK_PIXEL_EVENTS)[keyof typeof FACEBOOK_PIXEL_EVENTS] | string;

let advancedMatching: AdvancedMatchingPayload = {};

const pixelConfigured = typeof PIXEL_ID === "string" && PIXEL_ID.length > 0;

const getFbq = (): MetaPixelFunction | undefined => {
  if (!hasWindow) {
    return undefined;
  }

  const fbq = window.fbq;
  return typeof fbq === "function" ? fbq : undefined;
};

const applyAdvancedMatching = (): boolean => {
  if (!pixelConfigured) {
    return false;
  }

  const fbq = getFbq();
  if (!fbq) {
    return false;
  }

  const payload = { ...advancedMatching };
  if (Object.keys(payload).length === 0) {
    return false;
  }

  fbq("set", "userData", payload);
  return true;
};

const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeDigits = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const digits = String(value).replace(/\D+/g, "");
  return digits.length > 0 ? digits : undefined;
};

const normalizeName = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeGender = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "male" || normalized === "m" || normalized === "masculin") {
    return "m";
  }

  if (normalized === "female" || normalized === "f" || normalized === "feminin") {
    return "f";
  }

  return undefined;
};

const normalizeDateOfBirth = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`;
  }

  const europeanMatch = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (europeanMatch) {
    return `${europeanMatch[3]}${europeanMatch[2]}${europeanMatch[1]}`;
  }

  const slashMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}${slashMatch[1]}${slashMatch[2]}`;
  }

  return undefined;
};

const normalizeLocation = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizePostalCode = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeExternalId = (value: unknown): string | undefined => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }

    return String(Math.trunc(value));
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

type AdvancedMatchingKey = keyof AdvancedMatchingPayload;

type DraftAdvancedMatching = AdvancedMatchingPayload & Record<string, string | undefined>;

const assignAdvancedMatchingValue = (
  key: AdvancedMatchingKey,
  value: string | undefined,
  draft: DraftAdvancedMatching,
): boolean => {
  if (!value) {
    if (draft[key]) {
      delete draft[key];
      return true;
    }

    return false;
  }

  if (draft[key] === value) {
    return false;
  }

  draft[key] = value;
  return true;
};

const applyFullName = (fullName: string | undefined, draft: DraftAdvancedMatching): boolean => {
  if (!fullName) {
    let changed = false;
    if (draft.fn) {
      delete draft.fn;
      changed = true;
    }
    if (draft.ln) {
      delete draft.ln;
      changed = true;
    }
    return changed;
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return false;
  }

  const [first, ...rest] = parts;
  const last = rest.length > 0 ? rest[rest.length - 1] : undefined;
  let changed = false;
  changed = assignAdvancedMatchingValue("fn", first, draft) || changed;
  changed = assignAdvancedMatchingValue("ln", last, draft) || changed;
  return changed;
};

export const initFacebookPixel = (): void => {
  applyAdvancedMatching();
};

export const isFacebookPixelConfigured = (): boolean => {
  return Boolean(pixelConfigured && getFbq());
};

export const trackFacebookPixelPageView = (): void => {
  trackMetaEvent(FACEBOOK_PIXEL_EVENTS.PAGE_VIEW);
};

export const trackFacebookPixelEvent = (
  eventName: FacebookPixelEventName,
  data?: Record<string, unknown>,
): void => {
  trackMetaEvent(eventName, data);
};

export const updateFacebookPixelAdvancedMatching = (
  update: FacebookPixelAdvancedMatchingUpdate,
): void => {
  const draft: DraftAdvancedMatching = { ...advancedMatching };
  let changed = false;

  if ("email" in update) {
    changed = assignAdvancedMatchingValue("em", normalizeEmail(update.email ?? undefined), draft) || changed;
  }

  if ("phone" in update) {
    changed = assignAdvancedMatchingValue("ph", normalizeDigits(update.phone ?? undefined), draft) || changed;
  }

  if ("firstName" in update) {
    changed = assignAdvancedMatchingValue("fn", normalizeName(update.firstName ?? undefined), draft) || changed;
  }

  if ("lastName" in update) {
    changed = assignAdvancedMatchingValue("ln", normalizeName(update.lastName ?? undefined), draft) || changed;
  }

  if ("fullName" in update) {
    changed = applyFullName(update.fullName ?? undefined, draft) || changed;
  }

  if ("gender" in update) {
    changed = assignAdvancedMatchingValue("ge", normalizeGender(update.gender ?? undefined), draft) || changed;
  }

  if ("dateOfBirth" in update) {
    changed = assignAdvancedMatchingValue(
      "db",
      normalizeDateOfBirth(update.dateOfBirth ?? undefined),
      draft,
    ) || changed;
  }

  if ("city" in update) {
    changed = assignAdvancedMatchingValue("ct", normalizeLocation(update.city ?? undefined), draft) || changed;
  }

  if ("state" in update) {
    changed = assignAdvancedMatchingValue("st", normalizeLocation(update.state ?? undefined), draft) || changed;
  }

  if ("postalCode" in update) {
    changed = assignAdvancedMatchingValue("zp", normalizePostalCode(update.postalCode ?? undefined), draft) || changed;
  }

  if ("country" in update) {
    changed = assignAdvancedMatchingValue("country", normalizeLocation(update.country ?? undefined), draft) || changed;
  }

  if ("externalId" in update) {
    changed = assignAdvancedMatchingValue(
      "external_id",
      normalizeExternalId(update.externalId ?? undefined),
      draft,
    ) || changed;
  }

  if (!changed) {
    return;
  }

  advancedMatching = draft;
  applyAdvancedMatching();
};

export const getFacebookPixelAdvancedMatchingSnapshot = (): AdvancedMatchingPayload => ({
  ...advancedMatching,
});

export { FACEBOOK_PIXEL_EVENTS };
export type { FacebookPixelEventName, FacebookPixelAdvancedMatchingUpdate };
