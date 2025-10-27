"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/context/useBooking";
import type { BookingAppliedOffer } from "@/types/booking";
import type { ButtonProps } from "@/types/ui";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

type OfferPayload = Pick<BookingAppliedOffer, "id" | "title"> & Partial<BookingAppliedOffer>;

type ApplyOfferButtonProps = {
    offer: OfferPayload | null;
    label: string;
    href?: string;
    className?: string;
    variant?: ButtonProps["variant"];
    ariaLabel?: string;
};

const ApplyOfferButton = ({
    offer,
    label,
    href = "/form",
    className,
    variant,
    ariaLabel,
}: ApplyOfferButtonProps) => {
    const router = useRouter();
    const { booking, setBooking } = useBooking();
    const buildLocaleHref = useLocaleHref();

    const handleClick = useCallback(() => {
        if (offer && typeof offer.id === "number") {
            const normalizedTitle = offer.title?.trim() ?? "";
            if (normalizedTitle.length > 0) {
                const existing = booking.appliedOffers ?? [];
                const payload: BookingAppliedOffer = {
                    id: offer.id,
                    title: normalizedTitle,
                    kind: offer.kind ?? null,
                    value: offer.value ?? null,
                    badge: offer.badge ?? null,
                };

                const alreadyAdded = existing.some((entry) => entry.id === payload.id);
                const updatedOffers = alreadyAdded
                    ? existing.map((entry) => (entry.id === payload.id ? { ...entry, ...payload } : entry))
                    : [...existing, payload];

                setBooking({
                    ...booking,
                    appliedOffers: updatedOffers,
                });
            }
        }

        const target = href && href.trim().length > 0 ? href : "/form";
        const localizedTarget = buildLocaleHref(target);
        if (/^https?:\/\//i.test(localizedTarget)) {
            window.location.href = localizedTarget;
            return;
        }
        router.push(localizedTarget);
    }, [booking, buildLocaleHref, href, offer, router, setBooking]);

    return (
        <Button
            type="button"
            className={className}
            variant={variant}
            aria-label={ariaLabel ?? label}
            onClick={handleClick}
        >
            {label}
        </Button>
    );
};

export default ApplyOfferButton;

