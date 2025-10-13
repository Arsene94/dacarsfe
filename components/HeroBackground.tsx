import Image from "next/image";

import heroBackgroundMobileWebp from "@/public/images/bg-hero-mobile.webp";
import heroBackgroundWebp from "@/public/images/bg-hero-1280x720.webp";

export const HeroBackground = () => {
    return (
        <picture className="absolute inset-0 block">
            <source media="(max-width: 767px)" srcSet={heroBackgroundMobileWebp.src} />
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
            />
        </picture>
    );
};
