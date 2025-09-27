import type { LandingRepository } from "../../application/landing/LandingRepository";
import type { LandingInfo } from "../../shared/types";

export class InMemoryLandingRepository implements LandingRepository {
  async getInfo(): Promise<LandingInfo> {
    return {
      hero: {
        title: "Build Habits That Last, One Small Step at a Time",
        subtitle: "AI-driven scheduling and micro-progression to make consistency natural and stress-free.",
        ctaPrimary: "Start Free",
        ctaSecondary: "Watch Demo",
      },
      benefits: [
        { icon: "🌱", title: "Start Small", description: "Begin with micro-steps that feel effortless." },
        { icon: "🤖", title: "Smart Scheduling", description: "AI suggests the best time for each habit." },
        { icon: "🔥", title: "Stay Motivated", description: "Streaks, charts, and gamification keep you going." },
      ],
      howItWorks: [
        { step: 1, title: "Choose a Habit", description: "Pick a small starting point you can’t fail." },
        { step: 2, title: "AI Schedules It", description: "We find the best time slots around your day." },
        { step: 3, title: "Grow Gradually", description: "Increase the step size as your streak grows." },
      ],
      testimonials: [
        { name: "Ani M.", role: "Student", quote: "Micro-steps finally made daily reading stick." },
        { name: "David K.", role: "Engineer", quote: "The AI timing avoids clashes with my work day." },
      ],
      footerCTA: {
        title: "Take your first step today",
        subtitle: "No credit card required.",
        button: "Get Started Free",
      },
    };
  }
}

export const landingRepo = new InMemoryLandingRepository();