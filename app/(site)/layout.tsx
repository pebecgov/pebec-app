"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Lines from "@/components/Lines";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "../globals.css";
import "../prosemirror.css";

import ToasterContext from "../context/ToastContext";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import ChatbaseScript from "@/components/ChatbaseScript";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  // ✅ Hide Header/Footer for Admin and MDA pages
  const isHiddenPath = pathname.startsWith("/admin") || pathname.startsWith("/mda")|| pathname.startsWith("/staff") || pathname.startsWith("/reform_champion")|| pathname.startsWith("/deputies")|| pathname.startsWith("/magistrates")|| pathname.startsWith("/state_governor")
  || pathname.startsWith("/vice_president")
  || pathname.startsWith("/president")  || pathname.startsWith("/saber_agent")  
  ;

  // ✅ Simulate page loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500); // Simulate loading delay
    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <html lang="en" suppressHydrationWarning>
          <body className={`dark:bg-white ${inter.className}`}>
            <ThemeProvider enableSystem={false} attribute="class" defaultTheme="light">
            {isLoading ? (
  <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Logo Reveal Effect */}
      <img
        src="/images/logo/logo_pebec1.PNG"
        alt="PEBEC Logo"
        className="w-36 h-auto object-contain animate-logo-reveal"
      />

      {/* Clean Spinner under logo */}
      <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin" />
    </div>
  </div>
) : (
  <>
    {!isHiddenPath && <Lines />}
    {!isHiddenPath && <Header />}
    <Toaster position="top-center" richColors /> {/* Only this Toaster! */}
    <main className="opacity-0 animate-fadeIn">{children}
      
    </main>
    {!isHiddenPath && <Footer />}


                  {/* <ScrollToTop /> */}
                  {/* <ChatbaseScript /> */}
                </>
              )}
            </ThemeProvider>
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
