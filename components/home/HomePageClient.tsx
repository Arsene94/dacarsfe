"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import BenefitsSection from "@/components/BenefitsSection";
import ContactSection from "@/components/ContactSection";
import FleetSection from "@/components/FleetSection";
import HeroSection from "@/components/HeroSection";
import OffersSection from "@/components/OffersSection";
import ProcessSection from "@/components/ProcessSection";
import WheelOfFortune from "@/components/WheelOfFortune";

const ElfsightWidget = dynamic(() => import("@/components/ElfsightWidget"), {
    ssr: false,
});

const HomePageClient = () => {
    const [showWheelPopup, setShowWheelPopup] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWheelPopup(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="pt-16 lg:pt-20">
            <HeroSection />
            <FleetSection />
            <BenefitsSection />
            <OffersSection />
            <ElfsightWidget />
            {/*<TestimonialsSection />*/}
            <ProcessSection />
            <ContactSection />

            {showWheelPopup && (
                <WheelOfFortune
                    isPopup={true}
                    onClose={() => setShowWheelPopup(false)}
                />
            )}
        </div>
    );
};

export default HomePageClient;
