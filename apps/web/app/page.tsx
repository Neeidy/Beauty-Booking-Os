import Header from "../components/Header";
import HeroSection from "../components/sections/HeroSection";
import ServicesSection from "../components/sections/ServicesSection";
import GalleryTeamSection from "../components/sections/GalleryTeamSection";
import TestimonialsSection from "../components/sections/TestimonialsSection";
import StandortSection from "../components/sections/StandortSection";
import CtaFooterSection from "../components/sections/CtaFooterSection";

export default function HomePage() {
  return (
    <>
      <Header />
      <HeroSection />
      <ServicesSection />
      <GalleryTeamSection />
      <TestimonialsSection />
      <StandortSection />
      <CtaFooterSection />
    </>
  );
}
