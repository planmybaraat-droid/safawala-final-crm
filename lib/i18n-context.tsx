"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { Language, translations } from "./i18n"

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("crm_language") as Language
    if (savedLang && (savedLang === "en" || savedLang === "hi" || savedLang === "gu")) {
      setLanguageState(savedLang)
    }
  }, [])

  // Trigger Google Translate dynamically on language change
  useEffect(() => {
    // Disable translation on login/auth pages to prevent input values being translated, which blocks logging in
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/"
    const isAuthPage = pathname === "/" || pathname.startsWith("/auth")
    const targetLanguage = isAuthPage ? "en" : language

    try {
      document.cookie = `googtrans=/en/${targetLanguage}; path=/;`
      document.cookie = `googtrans=/en/${targetLanguage}; path=/; domain=localhost;`
      document.cookie = `googtrans=/en/${targetLanguage}; path=/; domain=mysafawale-ai;`
      document.cookie = `googtrans=/en/${targetLanguage}; path=/; domain=mysafawala.com;`
      document.cookie = `googtrans=/en/${targetLanguage}; path=/; domain=.mysafawala.com;`
    } catch (e) {
      console.warn("Google Translate cookies failed:", e)
    }

    let attempts = 0
    const triggerTranslation = () => {
      try {
        const select = document.querySelector('.goog-te-combo') as HTMLSelectElement
        if (select) {
          if (select.value !== targetLanguage) {
            select.value = targetLanguage
            select.dispatchEvent(new Event('change'))
          }
          return true
        }
      } catch (err) {
        console.error("Error triggering Google Translate:", err)
      }
      return false
    }

    const success = triggerTranslation()
    if (!success) {
      const timer = setInterval(() => {
        attempts++
        const ok = triggerTranslation()
        if (ok || attempts > 10) {
          clearInterval(timer)
        }
      }, 500)
      return () => clearInterval(timer)
    }
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("crm_language", lang)
    window.dispatchEvent(new Event("languagechange"))
  }

  const t = (key: string): string => {
    const dict = translations[language] || translations["en"]
    return dict[key] || translations["en"][key] || key
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    // Graceful fallback for components outside provider during tests/renders
    return {
      language: "en" as Language,
      setLanguage: () => {},
      t: (key: string) => {
        const dict = translations["en"]
        return dict[key] || key
      }
    }
  }
  return context
}
