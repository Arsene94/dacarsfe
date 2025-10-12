import Image from "next/image";

import heroBackgroundWebp from "@/public/images/bg-hero-1280x720.webp";

export const HeroBackground = () => {
    return (
        <Image
            src={heroBackgroundWebp}
            alt="Fundal aeroport"
            fill
            priority
            loading="eager"
            placeholder="blur"
            sizes="100vw"
            quality={60}
            decoding="async"
            className="object-cover"
        />
    );
};
