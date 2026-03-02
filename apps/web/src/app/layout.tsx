import type { Metadata } from "next";
import { Syncopate, Outfit } from "next/font/google";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const syncopate = Syncopate({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const outfit = Outfit({
  variable: "--font-numbers",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AURUM // Net Worth Architecture",
  description: "High-performance financial intelligence vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${syncopate.variable} ${outfit.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
