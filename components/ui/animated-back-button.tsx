"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AnimatedBackButtonProps {
  onClick?: () => void
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

export function AnimatedBackButton({
  onClick,
  variant = "outline",
  size = "default",
  className,
  children = "Back",
  disabled = false,
}: AnimatedBackButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Steve Jobs-inspired smooth animations
        "group relative overflow-hidden transition-all duration-300 ease-out",
        // Hover effects
        "hover:scale-105 hover:shadow-md",
        // Active/press effect
        "active:scale-95",
        className
      )}
    >
      {/* Shimmer effect on hover (Steve Jobs magic touch) */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Arrow with playful animation */}
      <ArrowLeft 
        className={cn(
          "transition-all duration-300 ease-out",
          size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-2",
          // Playful bounce on hover
          "group-hover:-translate-x-1 group-hover:scale-110",
          // Subtle rotation on hover
          "group-hover:-rotate-12"
        )} 
      />
      
      {/* Text with smooth fade - hide when size is icon */}
      {children && size !== "icon" && (
        <span className="relative z-10 transition-all duration-300 group-hover:tracking-wide">
          {children}
        </span>
      )}
    </Button>
  )
}
