import Image from "next/image";

import heroBackgroundMobileWebp from "@/public/images/bg-hero-mobile-480x879.webp";
import heroBackgroundMobile2xWebp from "@/public/images/bg-hero-mobile-960x1759.webp";
import heroBackgroundTabletWebp from "@/public/images/bg-hero-820x380.webp";
import heroBackgroundDesktopWebp from "@/public/images/bg-hero-1280x720.webp";
import heroBackgroundDesktop2xWebp from "@/public/images/bg-hero-1920x1080.webp";

export const HeroBackground = () => {
    return (
        <picture className="absolute inset-0 block">
            <source
                media="(max-width: 767px)"
                type="image/webp"
                srcSet={`${heroBackgroundMobileWebp.src} 1x, ${heroBackgroundMobile2xWebp.src} 2x`}
            />
            <source
                media="(max-width: 1279px)"
                type="image/webp"
                srcSet={`${heroBackgroundTabletWebp.src} 1x, ${heroBackgroundDesktopWebp.src} 2x`}
            />
            <source
                type="image/webp"
                srcSet={`${heroBackgroundDesktopWebp.src} 1x, ${heroBackgroundDesktop2xWebp.src} 2x`}
            />
            <Image
                src={heroBackgroundDesktop2xWebp}
                alt="Fundal aeroport"
                fill
                priority
                placeholder="blur"
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 100vw, 100vw"
                quality={70}
                className="object-cover"
            />
        </picture>
    );
};
