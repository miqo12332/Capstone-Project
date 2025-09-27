export type ID = string;

export type Benefit = { icon: string; title: string; description: string };
export type HowStep = { step: number; title: string; description: string };
export type Testimonial = { name: string; role: string; quote: string };

export type LandingInfo = {
  hero: {
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  benefits: Benefit[];
  howItWorks: HowStep[];
  testimonials: Testimonial[];
  footerCTA: { title: string; subtitle?: string; button: string };
};