import Image from "next/image";

import heroBackgroundMobileWebpMin from "@/public/images/bg-hero-mobile-378x284.webp";
import heroBackgroundMobileWebp from "@/public/images/bg-hero-mobile-480x879.webp";
import heroBackgroundMobileLargeWebp from "@/public/images/bg-hero-mobile-960x1759.webp";
import heroBackgroundTabletWebp from "@/public/images/bg-hero-820x380.webp";
import heroBackgroundDesktopWebp from "@/public/images/bg-hero-1280x720.webp";
import heroBackgroundDesktopLargeWebp from "@/public/images/bg-hero-1440x810.webp";
import heroBackgroundDesktop2xWebp from "@/public/images/bg-hero-1920x1080.webp";

export const HeroBackground = () => {
    return (
        <picture className="absolute inset-0 block">
            <source
                media="(max-width: 467px)"
                type="image/webp"
                srcSet={`${heroBackgroundMobileWebpMin.src} ${heroBackgroundMobileWebpMin.width}w, ${heroBackgroundMobileWebpMin.src} ${heroBackgroundMobileWebpMin.width}w`}
                sizes="100vw"
            />
            <source
                media="(max-width: 767px)"
                type="image/webp"
                srcSet={`${heroBackgroundMobileWebp.src} ${heroBackgroundMobileWebp.width}w, ${heroBackgroundMobileLargeWebp.src} ${heroBackgroundMobileLargeWebp.width}w`}
                sizes="100vw"
            />
            <source
                media="(max-width: 1279px)"
                type="image/webp"
                srcSet={`${heroBackgroundTabletWebp.src} ${heroBackgroundTabletWebp.width}w, ${heroBackgroundDesktopWebp.src} ${heroBackgroundDesktopWebp.width}w`}
                sizes="100vw"
            />
            <source
                type="image/webp"
                srcSet={`${heroBackgroundDesktopLargeWebp.src} ${heroBackgroundDesktopLargeWebp.width}w, ${heroBackgroundDesktop2xWebp.src} ${heroBackgroundDesktop2xWebp.width}w`}
                sizes="100vw"
            />
            <Image
                src={heroBackgroundDesktopLargeWebp}
                alt="Rent a car Aeroport Otopeni pentru românii din diaspora"
                fill
                priority
                placeholder="blur"
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 100vw, 1440px"
                quality={70}
                className="object-cover"
            />
        </picture>
    );
};
