import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AppStateProvider } from "../context/AppState";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FieldTracker AI - Realtime Employee Field Tracking & Productivity SaaS",
  description: "Enterprise industrial-level SaaS for live GPS coordinate tracing, automated geofenced attendance logs, impossible speed spoofing filters, and NLP-powered workforce audits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#120c08] text-[#f1f5f9]">
        <AppStateProvider>
          {children}
        </AppStateProvider>
      </body>
    </html>
  );
}

