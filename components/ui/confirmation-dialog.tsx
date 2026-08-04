"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
}: ConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(false)
      setIsProcessing(false)
      // Focus the confirm button when dialog opens
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === "Escape" && !isProcessing) {
        onOpenChange(false)
      } else if (e.key === "Enter" && !isProcessing) {
        handleConfirm()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, isProcessing])

  const handleConfirm = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (isProcessing) return // Prevent double-clicks

    try {
      setIsProcessing(true)
      setError(null)
      await onConfirm()

      setSuccess(true)
      // Close dialog immediately after successful action
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setError(errorMessage)
      toast({
        title: "Action Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    if (isProcessing) return // Prevent canceling during processing
    onOpenChange(false)
  }

  const isLoading = loading || isProcessing

  return (
    <AlertDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isProcessing) {
          // Prevent closing during processing
          onOpenChange(newOpen)
        }
      }}
    >
      <AlertDialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => {
          if (isProcessing) e.preventDefault() // Prevent escape during processing
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            {success ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            ) : error ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            ) : variant === "destructive" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div>
              <AlertDialogTitle className="text-left">
                {success ? "Success!" : error ? "Error" : title}
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left mt-2">
            {success ? "Action completed successfully" : error || description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {!success && (
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isLoading} onClick={handleCancel} tabIndex={isLoading ? -1 : 0}>
                {cancelText}
              </Button>
            </AlertDialogCancel>
          )}

          {success ? (
            <Button onClick={() => onOpenChange(false)} autoFocus>
              Close
            </Button>
          ) : error ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setError(null)}>
                Try Again
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <Button
              ref={confirmButtonRef}
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isLoading}
              tabIndex={0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {variant === "destructive" && <Trash2 className="mr-2 h-4 w-4" />}
                  {confirmText}
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function useConfirmationDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
    onConfirm: () => void | Promise<void>
    loading?: boolean
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })

  const showConfirmation = (config: Omit<typeof dialogState, "open">) => {
    setDialogState({ ...config, open: true })
  }

  const hideConfirmation = () => {
    setDialogState((prev) => ({ ...prev, open: false }))
  }

  const retryConfirmation = () => {
    if (dialogState.onConfirm) {
      dialogState.onConfirm()
    }
  }

  const ConfirmationDialogComponent = () => <ConfirmationDialog {...dialogState} onOpenChange={hideConfirmation} />

  return {
    showConfirmation,
    hideConfirmation,
    retryConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent,
    isOpen: dialogState.open,
  }
}
