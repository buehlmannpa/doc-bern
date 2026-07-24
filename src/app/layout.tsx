import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { getMaintenance } from "@/lib/db";

export const metadata: Metadata = {
  title: "DOC Bern – Ducati Official Club Bern",
  description: "Die App des Ducati Official Club Bern. Events, News, Vorteile und Partner.",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Setzt Theme + Akzentfarbe synchron vor dem ersten Paint (verhindert Flackern).
const noFlashScript = `(function(){try{
var accents=[["227, 6, 19","#e30613","#ffffff"],["30, 30, 30","#1e1e1e","#ffffff"],["120, 120, 128","#787880","#ffffff"],["255, 204, 0","#ffcc00","#1d1d1f"],["0, 122, 255","#007aff","#ffffff"]];
var i=parseInt(localStorage.getItem('doc-bern-accent')||'0',10)||0;var c=accents[i]||accents[0];
var r=document.documentElement;r.style.setProperty('--accent',c[0]);r.style.setProperty('--accent-hex',c[1]);r.style.setProperty('--accent-foreground',c[2]);
var m=localStorage.getItem('doc-bern-theme')||'auto';
var dark=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
r.setAttribute('data-theme',dark?'dark':'light');
}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");
  const maintenance = await getMaintenance();
  const showMaintenance = maintenance && !isAdmin;

  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          {showMaintenance ? (
            <MaintenanceScreen />
          ) : (
            <>
              <Header />
              <main className="max-w-lg mx-auto pt-[68px] pb-24 px-4">
                {children}
              </main>
              <BottomNav />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
