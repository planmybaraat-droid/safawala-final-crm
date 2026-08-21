"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script"

export function ClientRuntimeEffects() {
  const pathname = usePathname()

  useEffect(() => {
    const isWarehousePortal = pathname === "/portal/warehouse" || pathname.startsWith("/portal/warehouse/")
    document.body.classList.toggle("warehouse-portal-theme", isWarehousePortal)
    return () => document.body.classList.remove("warehouse-portal-theme")
  }, [pathname])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[Service Worker] Registration failed:", error)
      })
    }

    const browserWindow = window as typeof window & {
      google?: {
        translate?: {
          TranslateElement?: new (
            options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
            elementId: string,
          ) => unknown
        }
      }
      googleTranslateElementInit?: () => void
    }

    browserWindow.googleTranslateElementInit = () => {
      const TranslateElement = browserWindow.google?.translate?.TranslateElement
      const container = document.getElementById("google_translate_element")
      if (!TranslateElement || !container || container.childElementCount > 0) return

      new TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,hi,gu",
          autoDisplay: false,
        },
        "google_translate_element",
      )
    }

    if (browserWindow.google?.translate?.TranslateElement) {
      browserWindow.googleTranslateElementInit()
    } else if (!document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) {
      const script = document.createElement("script")
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  return <div suppressHydrationWarning id="google_translate_element" style={{ display: "none" }} />
}
