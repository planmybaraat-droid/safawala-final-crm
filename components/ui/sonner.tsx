'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'
import { X } from 'lucide-react'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group print:hidden"
      toastOptions={{
        classNames: {
          toast:
            'group relative pr-8 toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton: 'hidden',
        },
        closeButton: true,
      }}
      closeButton
      // Custom slot to overlay our own close icon
      icons={{
        close: <X className="h-4 w-4" />,
      }}
      richColors
      expand
      {...props}
    />
  )
}

export { Toaster }
