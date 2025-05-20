import { Metadata } from "next";
import Hero from "@/components/Hero";
import Brands from "@/components/Brands";
import Feature from "@/components/Features";
import About from "@/components/About";
import FeaturesTab from "@/components/FeaturesTab";
import FunFact from "@/components/FunFact";
import Integration from "@/components/Integration";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Blog from "@/components/Blog";
import Testimonial from "@/components/Testimonial";
import President from "@/components/PresidentSection";
import LatestNewsSection from "@/components/NewsComp";

export const metadata: Metadata = {
  title: "PEBEC - Enabling Business Enviroment Secretariat",

  // other metadata
  description: "Enabling Business Enviroment Secretariat"
};

export default function Home() {
  return (
    <main>
      <Hero />
      <Brands />
      <President/>
      <Feature />
      <About />
      <FeaturesTab />
      <FunFact />
      <Integration />
      <LatestNewsSection/>
      <CTA />
      <FAQ />
      <Contact />
    </main>
  );
}
