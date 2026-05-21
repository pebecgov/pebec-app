// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
// @ts-nocheck

"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Lines from "@/components/Lines";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "../globals.css";
import "next-google-translate-widget/styles";
import "../prosemirror.css";
import ToasterContext from "../context/ToastContext";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { Analytics } from '@vercel/analytics/next';
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import ChatbaseScript from "@/components/ChatbaseScript";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import ActivityTracker from "@/components/ActivityTracker";
import NextGoogleTranslateWidget, { LANGUAGES } from "next-google-translate-widget";

const SITE_TRANSLATE_LANGUAGES = [
  { label: "English", value: "en" },
  ...LANGUAGES.filter((l) => ["fr", "ar", "es", "pt", "hi", "sw"].includes(l.value)),
  { label: "Hausa", value: "ha", flag: "ng" },
  { label: "Igbo", value: "ig", flag: "ng" },
  { label: "Yorùbá", value: "yo", flag: "ng" }
];
const inter = Inter({
  subsets: ["latin"]
});
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const isHiddenPath = pathname.startsWith("/admin") || 
    pathname.startsWith("/mda") || 
    pathname.startsWith("/staff") || 
    pathname.startsWith("/reform_champion") || 
    pathname.startsWith("/deputies") || 
    pathname.startsWith("/magistrates") || 
    pathname.startsWith("/state_governor") || 
    pathname.startsWith("/vice_president") || 
    pathname.startsWith("/president") || 
    pathname.startsWith("/saber_agent") ||
    pathname.startsWith("/world_bank") ||
    pathname.startsWith("/dmo");
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  return <ClerkProvider>
    
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ActivityTracker />
        <html lang="en" suppressHydrationWarning>
          <body className={`dark:bg-white ${inter.className}`} suppressHydrationWarning>
            <ThemeProvider enableSystem={false} attribute="class" defaultTheme="light">
            {isLoading ? <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="flex flex-col items-center justify-center gap-6">
      {}
      <img src="/images/logo/logo_pebec1.PNG" alt="PEBEC Logo" className="w-36 h-auto object-contain animate-logo-reveal" />

      {}
      <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin" />
    </div>
  </div> : <>
    {!isHiddenPath && <Lines />}
    {!isHiddenPath && <Header />}
    <Toaster position="top-center" richColors /> {}
    <main className="opacity-0 animate-fadeIn">{children}
      
    </main>
    {!isHiddenPath && <Footer />}
    {!isHiddenPath && (
      <div className="pebec-translate-widget-slot fixed bottom-24 right-4 z-[200] xl:bottom-4">
        <NextGoogleTranslateWidget
          pageLanguage="en"
          languages={SITE_TRANSLATE_LANGUAGES}
          menuAlign="right"
        />
      </div>
    )}


                  {}
                  {}
                </>}
            </ThemeProvider>
            <Analytics />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>;
}
