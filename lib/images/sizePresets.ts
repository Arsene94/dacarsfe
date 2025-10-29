const MOBILE_GUTTER = "2rem";
const TABLET_GUTTER = "4rem";
const DESKTOP_GUTTER = "6rem";

const heroBackgroundSizes = "100vw" as const;

const blogCardImageSizes =
    `(max-width: 639px) calc(100vw - ${MOBILE_GUTTER}), (max-width: 1023px) calc((100vw - ${TABLET_GUTTER}) / 2), 320px` as const;

const carGridImageSizes =
    `(max-width: 639px) calc(100vw - ${MOBILE_GUTTER}), (max-width: 1023px) calc((100vw - ${TABLET_GUTTER}) / 2), (max-width: 1439px) calc((100vw - ${DESKTOP_GUTTER}) / 3), 360px` as const;

export const IMAGE_SIZE_PRESETS = {
    heroBackground: heroBackgroundSizes,
    blogCard: blogCardImageSizes,
    carGridCard: carGridImageSizes,
} as const;

export type ImageSizePresetKey = keyof typeof IMAGE_SIZE_PRESETS;

export const getImageSizesPreset = (key: ImageSizePresetKey): string => IMAGE_SIZE_PRESETS[key];
