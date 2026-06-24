import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "DOC Bern – Ducati Owners Club Bern",
  description: "Die offizielle App des Ducati Owners Club Bern. Events, News, Rabatte und Partner.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DOC Bern",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          <main className="max-w-lg mx-auto pt-16 pb-24 px-4">
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
