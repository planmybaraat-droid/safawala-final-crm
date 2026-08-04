"use client"
import { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'

export interface ConfirmDialogProps {
  open: boolean
  title?: string
  description?: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({ open, title='Are you sure?', description, confirmLabel='Confirm', cancelLabel='Cancel', destructive, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o)=> { if(!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}> {cancelLabel} </Button>
          <Button type="button" variant={destructive? 'destructive':'default'} onClick={onConfirm} disabled={loading}>{loading ? 'Please wait...' : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}