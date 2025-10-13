import Image from "next/image";

import heroBackgroundMobileWebp from "@/public/images/bg-hero-mobile.webp";
import heroBackgroundWebp from "@/public/images/bg-hero-1280x720.webp";

const HERO_BACKGROUND_SRC_SET = `${heroBackgroundMobileWebp.src} 768w, ${heroBackgroundWebp.src} 1280w`;

export const HeroBackground = () => {
    return (
        <Image
            src={heroBackgroundWebp}
            alt="Fundal aeroport"
            fill
            priority
            loading="eager"
            placeholder="blur"
            sizes="(max-width: 767px) 100vw, 100vw"
            quality={60}
            decoding="async"
            className="object-cover"
            srcSet={HERO_BACKGROUND_SRC_SET}
        />
    );
};
