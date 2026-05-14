import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PITWALL — F1 Immersive Dashboard",
  description:
    "Real-time Formula 1 analytics. Race results, live telemetry, driver standings, and AI-powered team intelligence for the 2026 season.",
  keywords: ["Formula 1", "F1", "2026", "race results", "telemetry", "driver standings", "PITWALL"],
  openGraph: {
    title: "PITWALL — F1 Immersive Dashboard",
    description: "Live race results, driver standings, telemetry and paddock intelligence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
