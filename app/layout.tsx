import type React from "react"
import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans, Inter } from "next/font/google"
import "./globals.css"
import "./warehouse-theme.css"
import "./portal-polish.css"
import "./vadodara-crm-theme.css"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster as SonnerToaster } from "sonner"
import { ClientRuntimeEffects } from "@/components/client-runtime-effects"
import { VadodaraCrmThemeScope } from "@/components/layout/vadodara-crm-theme-scope"

// Force dynamic rendering for all pages (CRM needs runtime data)
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Safawala CRM — Wedding Accessories Management",
  description: "CRM solution for premium wedding turban and accessories rental business",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Safawala",
  },
  icons: {
    icon: '/safaicon.svg',
    apple: '/safaicon.svg',
    shortcut: '/safaicon.svg',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { I18nProvider } from "@/lib/i18n-context"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning lang="en" className={`${inter.variable} ${ibmPlexSans.variable}`}>
      <head>
        <meta name="theme-color" content="#f5ebe0" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className={`${inter.className} antialiased`}>
        <div id="app-root" suppressHydrationWarning>
          <I18nProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </I18nProvider>
          <ClientRuntimeEffects />
          <VadodaraCrmThemeScope />
          <div className="print:hidden">
            <Toaster />
            <SonnerToaster />
          </div>
        </div>
      </body>
    </html>
  )
}
