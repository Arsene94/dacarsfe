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
            sizes="100vw"
            quality={55}
            decoding="async"
            className="object-cover"
        />
    );
};
