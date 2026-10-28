import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareMatrix OS — Clinical Operations Fabric",
  description:
    "Enterprise hospital command surface: bed capacity, critical lab escalation, medication safety, deterioration watch, imaging comparison and post-discharge follow-up.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070d14" },
    { media: "(prefers-color-scheme: light)", color: "#eef2f6" },
  ],
};

const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('cm.theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
