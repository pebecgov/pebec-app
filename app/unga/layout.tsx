import React from "react";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import Footer from "@/components/Footer";
import "../globals.css";

export const metadata = {
  title: "UNGA Registration",
  description: "PEBEC UNGA attendee registration",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-1 flex items-center justify-center px-4 py-12">
              {children}
            </main>
            <Footer />
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
