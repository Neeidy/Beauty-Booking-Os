import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import ServicesSection from "../components/ServicesSection";
import GalerieTeamSection from "../components/sections/GalerieTeamSection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <GalerieTeamSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
