import Header from "../components/Header";
import Hero from "../components/Hero";
import Benefits from "../components/Benefits";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import FooterCTA from "../components/FooterCTA";

export default function LandingPage() {
  return (
    <div>
      <Header />
      <Hero />
      <Benefits />
      <HowItWorks />
      <Testimonials />
      <FooterCTA />
    </div>
  );
}