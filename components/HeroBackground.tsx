import Image from "next/image";

import heroBackgroundDesktop from "@/public/images/bg-hero-1920x1080.webp";

import { getImageSizesPreset } from "@/lib/images/sizePresets";

export const HeroBackground = () => {
    return (
        <Image
            src={heroBackgroundDesktop}
            alt="Rent a car Aeroport Otopeni pentru românii din diaspora"
            fill
            fetchPriority={"high"}
            priority
            placeholder="blur"
            sizes={getImageSizesPreset("heroBackground")}
            quality={55}
            className="object-cover"
        />
    );
};
