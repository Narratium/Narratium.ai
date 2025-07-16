import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/local-fonts.css";
import "./styles/fonts.css";
import MainLayout from "@/components/MainLayout";
import { LanguageProvider } from "@/app/i18n/LanguageProvider";
import { SoundProvider } from "@/contexts/SoundContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/react";

// Define viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: "Narratium - Interactive Storytelling Platform",
  description: "Narratium is an innovative interactive storytelling platform that brings your stories to life. Create, share, and experience unique narratives in a fantasy-themed environment.",
  keywords: "interactive storytelling, narrative platform, fantasy stories, creative writing, story creation",
  authors: [{ name: "Narratium Team" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "Narratium - Interactive Storytelling Platform",
    description: "Create and experience unique interactive stories in a fantasy-themed environment",
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN",
    siteName: "Narratium",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Narratium - Interactive Storytelling Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Narratium - Interactive Storytelling Platform",
    description: "Create and experience unique interactive stories in a fantasy-themed environment",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.png", sizes: "152x152", type: "image/png" },
      { url: "/icon.png", sizes: "120x120", type: "image/png" },
    ],
    shortcut: { url: "/icon.ico" },
    other: [
      {
        rel: "mask-icon",
        url: "/icon.png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Narratium",
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="h-full">
      <body className="h-full bg-[#171717] text-white">
        <GoogleAnalytics />
        <SoundProvider>
          <LanguageProvider>
            <MainLayout>{children}</MainLayout>
          </LanguageProvider>
        </SoundProvider>
        <Analytics />
      </body>
    </html>
  );
}

