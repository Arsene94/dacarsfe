let currentEventId: string | undefined;

export type MetaEventParams = Record<string, unknown> | undefined;

export type MetaPixelFunction = (
  action: string,
  eventName?: string,
  params?: Record<string, unknown>
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

const hasWindow = typeof window !== "undefined";

export function setMetaEventId(eventId: string | null | undefined): void {
  if (typeof eventId === "string" && eventId.trim().length > 0) {
    currentEventId = eventId;
    return;
  }

  currentEventId = undefined;
}

export function trackMetaEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!hasWindow || typeof window.fbq !== "function") {
    return;
  }

  const normalizedEvent = typeof eventName === "string" && eventName.trim().length > 0 ? eventName.trim() : "";
  if (!normalizedEvent) {
    return;
  }

  const payload: Record<string, unknown> | undefined = params ? { ...params } : undefined;
  if (currentEventId && payload) {
    if (typeof payload.event_id !== "string" || payload.event_id.trim().length === 0) {
      payload.event_id = currentEventId;
    }
  } else if (currentEventId && !payload) {
    window.fbq("track", normalizedEvent, { event_id: currentEventId });
    return;
  }

  window.fbq("track", normalizedEvent, payload);
}
