import heroBackground from "@/public/images/bg-hero-1280x720.avif";
import Image from "next/image";

export const HeroBackground = () => {
    return (
        <Image
            src={heroBackground}
            alt="Fundal aeroport"
            fill
            priority
            fetchPriority="high"
            loading="eager"
            sizes="100vw"
            quality={70}
            decoding="async"
            className="object-cover"
        />
    );
}
