"use client";

import { useEffect, useState } from "react";
import HeroSection from '../components/HeroSection';
import BenefitsSection from '../components/BenefitsSection';
import FleetSection from '../components/FleetSection';
import OffersSection from '../components/OffersSection';
import TestimonialsSection from '../components/TestimonialsSection';
import ProcessSection from '../components/ProcessSection';
import ContactSection from '../components/ContactSection';
import WheelOfFortune from '../components/WheelOfFortune';

const HomePage = () => {
    const [showWheelPopup, setShowWheelPopup] = useState(false);

    // useEffect(() => {
    //     // Show wheel popup after 2 seconds when page loads
    //     const timer = setTimeout(() => {
    //         setShowWheelPopup(true);
    //     }, 2000);
    //
    //     return () => clearTimeout(timer);
    // }, []);

  return (
    <div className="pt-16 lg:pt-20">
      <HeroSection />
      <FleetSection />
      <BenefitsSection />
      <OffersSection />
      <TestimonialsSection />
      <ProcessSection />
      <ContactSection />

        {/*{showWheelPopup && (*/}
        {/*    <WheelOfFortune*/}
        {/*        isPopup={true}*/}
        {/*        onClose={() => setShowWheelPopup(false)}*/}
        {/*    />*/}
        {/*)}*/}
    </div>
  );
};

export default HomePage;
