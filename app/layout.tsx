import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster as SonnerToaster } from "sonner"

// Force dynamic rendering for all pages (CRM needs runtime data)
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

import { I18nProvider } from "@/lib/i18n-context"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#f5ebe0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,hi,gu',
              autoDisplay: false
            }, 'google_translate_element');
          }
        ` }} />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async defer></script>
      </head>
      <body suppressHydrationWarning className={`${inter.className} antialiased`}>
        <I18nProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nProvider>
        <div suppressHydrationWarning id="google_translate_element" style={{ display: 'none' }} />
        <div className="print:hidden">
          <Toaster />
          <SonnerToaster />
        </div>
      </body>
    </html>
  )
}
