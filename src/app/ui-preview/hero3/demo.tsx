"use client";

import { AnimatedMarqueeHero } from "@/components/ui/hero-3";

// A list of sample image URLs for the demo
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1494548162494-384bba4ab999?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",
];

const AnimatedHeroDemo = () => {
  return (
    <AnimatedMarqueeHero
      tagline="Join over 100,000 happy creators"
      title={
        <>
          Engage Audiences
          <br />
          with Stunning Videos
        </>
      }
      description="Boost Your Brand with High-Impact Short Videos from our expert content creators. Our team is ready to propel your business forward."
      ctaText="Get Started"
      images={DEMO_IMAGES}
    />
  );
};

export default AnimatedHeroDemo;
