"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  QrCode,
  Eye,
  Upload,
  X,
  Star,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Constants (removed ACCOUNT_TYPES)
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface BankAccount {
  id: string
  franchise_id: string
  bank_name: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  branch_name?: string
  account_type?: string
  upi_id?: string
  qr_file_path?: string
  is_primary: boolean
  show_on_invoice: boolean
  created_at: string
  updated_at: string
}

interface BankingSectionProps {
  franchiseId: string
}

interface BankFormData {
  bank_name: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  branch_name: string
  account_type: string
  upi_id: string
  is_primary: boolean
  show_on_invoice: boolean
}

interface ValidationErrors {
  [key: string]: string
}

export function BankingSection({ franchiseId }: BankingSectionProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewingBank, setViewingBank] = useState<BankAccount | null>(null)
  const { toast } = useToast()
  
  // Form state
  const [formData, setFormData] = useState<BankFormData>({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'Current',
    upi_id: '',
    is_primary: false,
    show_on_invoice: true // Always show on invoices by default
  })

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [qrFileUrl, setQrFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    fetchBankAccounts()
  }, [franchiseId])

  const fetchBankAccounts = async () => {
    try {
      setLoading(true)
      console.log('Fetching bank accounts for franchise_id:', franchiseId)
      const response = await fetch(`/api/settings/banking?franchise_id=${franchiseId}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Fetched bank accounts:', result)
        setBankAccounts(result.data || [])
      } else {
        console.error('Failed to fetch bank accounts, status:', response.status)
        toast({
          title: "Error",
          description: "Failed to load bank accounts",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Validation functions
  const validateForm = () => {
    const errors: ValidationErrors = {}

    if (!formData.bank_name.trim() || formData.bank_name.length < 2 || formData.bank_name.length > 100) {
      errors.bank_name = 'Bank name must be between 2 and 100 characters'
    }

    if (!formData.account_holder_name.trim() || formData.account_holder_name.length < 2 || formData.account_holder_name.length > 100) {
      errors.account_holder_name = 'Account holder name must be between 2 and 100 characters'
    }

    if (!formData.account_number.trim() || !/^[a-zA-Z0-9]{8,24}$/.test(formData.account_number)) {
      errors.account_number = 'Account number must be 8-24 alphanumeric characters'
    }

    if (!formData.ifsc_code.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      errors.ifsc_code = 'IFSC code must follow format: ABCD0123456 (4 letters, 1 zero, 6 alphanumeric)'
    }

    if (formData.upi_id.trim() && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(formData.upi_id)) {
      errors.upi_id = 'UPI ID format is invalid (e.g., user@bank)'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateFile = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or WebP image",
        variant: "destructive"
      })
      return false
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!validateFile(file)) {
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setQrFileUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      console.log('Starting file upload:', file.name, file.type, file.size)
      
      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase()
      const uuid = crypto.randomUUID()
      const key = `banks/${franchiseId}/${uuid}.${ext}`

      // Request presigned URL
      console.log('Requesting presigned URL for key:', key)
      const presignResponse = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          mime: file.type,
          size: file.size,
          org_id: franchiseId
        })
      })

      if (!presignResponse.ok) {
        const errorText = await presignResponse.text()
        console.error('Presign request failed:', presignResponse.status, errorText)
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, publicUrl } = await presignResponse.json()
      console.log('Got presigned URL, uploading to:', uploadUrl)

      // Upload file to presigned URL with better error handling
      let uploadResponse
      
      if (uploadUrl.includes('/fallback')) {
        // Handle fallback upload
        console.log('Using fallback upload for development')
        uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type
          },
          body: file
        })
      } else {
        // Handle normal Supabase upload
        uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type
          },
          body: file
        })
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('File upload failed:', uploadResponse.status, errorText)
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      console.log('File uploaded successfully, public URL:', publicUrl)
      
      // For fallback uploads, use a placeholder URL
      const finalPublicUrl = uploadUrl.includes('/fallback') 
        ? `/api/uploads/fallback?key=${encodeURIComponent(key)}`
        : publicUrl
      
      return finalPublicUrl
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Failed to upload QR code image",
        variant: "destructive"
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  // Form handling functions
  const resetForm = () => {
    setFormData({
      bank_name: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_type: 'Current',
      upi_id: '',
      is_primary: false,
      show_on_invoice: true // Always show on invoices
    })
    setSelectedFile(null)
    setFilePreview(null)
    setQrFileUrl(null)
    setValidationErrors({})
    setIsEditing(false)
    setEditingBank(null)
  }

  const openAddModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (bank: BankAccount) => {
    setFormData({
      bank_name: bank.bank_name,
      account_holder_name: bank.account_holder_name,
      account_number: bank.account_number,
      ifsc_code: bank.ifsc_code,
      branch_name: bank.branch_name || '',
      account_type: bank.account_type || 'Current',
      upi_id: bank.upi_id || '',
      is_primary: bank.is_primary,
      show_on_invoice: bank.show_on_invoice
    })
    setQrFileUrl(bank.qr_file_path || null)
    setIsEditing(true)
    setEditingBank(bank)
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation failed",
        description: "Please fix the errors before saving",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      // Upload file if selected
      let qr_file_path = qrFileUrl
      if (selectedFile) {
        qr_file_path = await uploadFile(selectedFile)
        if (!qr_file_path) return // Upload failed
      }

      // Prepare request data
      const requestData = {
        ...(isEditing && { id: editingBank!.id }), // Include id for updates
        franchise_id: franchiseId,
        bank_name: formData.bank_name.trim(),
        account_holder_name: formData.account_holder_name.trim(),
        account_number: formData.account_number.trim(),
        ifsc_code: formData.ifsc_code.toUpperCase(),
        branch_name: formData.branch_name.trim() || null,
        account_type: formData.account_type || 'Current',
        upi_id: formData.upi_id.trim() || null,
        is_primary: formData.is_primary,
        show_on_invoice: formData.show_on_invoice,
        qr_file_path
      }

      // Make API request - always use the same endpoint
      const url = '/api/settings/banking'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message || 'Bank account saved successfully'
        })
        
        setIsModalOpen(false)
        resetForm()
        fetchBankAccounts() // Refresh the list
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Failed to save bank account',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bank: BankAccount) => {
    try {
      const response = await fetch(`/api/settings/banking?id=${bank.id}&franchise_id=${franchiseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Bank account deleted successfully"
        })
        fetchBankAccounts() // Refresh the list
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Failed to delete bank account',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Error",
        description: "Unable to connect to server",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber
    return 'XXXXXX' + accountNumber.slice(-4)
  }

  const renderFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      return (
        <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
          <AlertCircle className="h-3 w-3" />
          <span>{validationErrors[fieldName]}</span>
        </div>
      )
    }
    return null
  }

  const getFieldClassName = (fieldName: string, baseClassName: string = '') => {
    return `${baseClassName} ${
      validationErrors[fieldName] 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading bank accounts...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Banking Details
            </CardTitle>
            <Button onClick={openAddModal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Bank Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No bank accounts added yet</p>
              <p className="text-sm">Add your first bank account to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((bank) => (
                <div key={bank.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{bank.bank_name}</h3>
                        {bank.is_primary && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><span className="font-medium">Account Holder:</span> {bank.account_holder_name}</p>
                          <p><span className="font-medium">Account Number:</span> {maskAccountNumber(bank.account_number)}</p>
                          <p><span className="font-medium">IFSC Code:</span> {bank.ifsc_code}</p>
                        </div>
                        <div>
                          {bank.branch_name && (
                            <p><span className="font-medium">Branch:</span> {bank.branch_name}</p>
                          )}
                          {bank.upi_id && (
                            <p><span className="font-medium">UPI ID:</span> {bank.upi_id}</p>
                          )}
                        </div>
                      </div>

                      {bank.qr_file_path && (
                        <div className="mt-3">
                          <img 
                            src={bank.qr_file_path} 
                            alt="QR Code" 
                            className="w-16 h-16 border rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingBank(bank)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(bank)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDeleting(bank.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
        setIsModalOpen(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your bank account details' : 'Add a new bank account for transactions'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, bank_name: e.target.value }))
                  // Clear validation error when user starts typing
                  if (validationErrors.bank_name) {
                    const { bank_name, ...rest } = validationErrors
                    setValidationErrors(rest)
                  }
                }}
                placeholder="HDFC Bank"
                className={getFieldClassName('bank_name')}
              />
              {renderFieldError('bank_name')}
            </div>

            {/* Account Holder Name */}
            <div className="space-y-2">
              <Label htmlFor="account_holder">Account Holder Name *</Label>
              <Input
                id="account_holder"
                value={formData.account_holder_name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, account_holder_name: e.target.value }))
                  if (validationErrors.account_holder_name) {
                    const { account_holder_name, ...rest } = validationErrors
                    setValidationErrors(rest)
                  }
                }}
                placeholder="Safawala Rental Services"
                className={getFieldClassName('account_holder_name')}
              />
              {renderFieldError('account_holder_name')}
            </div>

            {/* Account Number and IFSC Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, account_number: e.target.value }))
                    if (validationErrors.account_number) {
                      const { account_number, ...rest } = validationErrors
                      setValidationErrors(rest)
                    }
                  }}
                  placeholder="123456789012"
                  className={getFieldClassName('account_number')}
                />
                {renderFieldError('account_number')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code *</Label>
                <Input
                  id="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))
                    if (validationErrors.ifsc_code) {
                      const { ifsc_code, ...rest } = validationErrors
                      setValidationErrors(rest)
                    }
                  }}
                  placeholder="HDFC0001234"
                  className={getFieldClassName('ifsc_code')}
                />
                {renderFieldError('ifsc_code')}
              </div>
            </div>

            {/* Branch Name */}
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input
                id="branch_name"
                value={formData.branch_name}
                onChange={(e) => setFormData(prev => ({ ...prev, branch_name: e.target.value }))}
                placeholder="Mumbai Main Branch"
                className={getFieldClassName('branch_name')}
              />
              {renderFieldError('branch_name')}
            </div>

            {/* UPI ID */}
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                value={formData.upi_id}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, upi_id: e.target.value }))
                  if (validationErrors.upi_id) {
                    const { upi_id, ...rest } = validationErrors
                    setValidationErrors(rest)
                  }
                }}
                placeholder="safawala@hdfc"
                className={getFieldClassName('upi_id')}
              />
              {renderFieldError('upi_id')}
            </div>

            {/* QR Code Upload */}
            <div className="space-y-2">
              <Label>QR Code Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {(filePreview || qrFileUrl) ? (
                  <div className="flex items-center gap-4">
                    <img 
                      src={filePreview || qrFileUrl || ''} 
                      alt="QR Code Preview" 
                      className="w-20 h-20 object-cover border rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {selectedFile ? `New file: ${selectedFile.name}` : 'Current QR code'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeFile}
                        className="mt-2 flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload QR code image (JPEG, PNG, WebP)
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Maximum file size: 5MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Choose File
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Set as primary account</Label>
                  <p className="text-sm text-gray-500">
                    This will be the default account for transactions
                  </p>
                  {formData.is_primary && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span className="font-semibold">⚠</span> Other primary accounts will be automatically unmarked
                    </p>
                  )}
                </div>
                <Switch
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving || uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="flex items-center gap-2"
            >
              {saving || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isEditing ? 'Update Account' : 'Add Account'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingBank} onOpenChange={() => setViewingBank(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Bank Account Details
              <div className="flex gap-2">
                {viewingBank?.is_primary && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Primary
                  </Badge>
                )}
                <Badge variant="secondary">{viewingBank?.account_type || 'Current'}</Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              View complete bank account information
            </DialogDescription>
          </DialogHeader>
          
          {viewingBank && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column - Bank Details */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank Name</Label>
                    <p className="font-semibold mt-1">{viewingBank.bank_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Holder</Label>
                    <p className="font-semibold mt-1">{viewingBank.account_holder_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Number</Label>
                    <p className="font-mono text-sm mt-1">{viewingBank.account_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IFSC Code</Label>
                    <p className="font-mono text-sm mt-1">{viewingBank.ifsc_code}</p>
                  </div>
                  {viewingBank.branch_name && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Branch</Label>
                      <p className="text-sm mt-1">{viewingBank.branch_name}</p>
                    </div>
                  )}
                  {viewingBank.upi_id && (
                    <div>
                      <Label className="text-xs text-muted-foreground">UPI ID</Label>
                      <p className="text-sm mt-1">{viewingBank.upi_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - QR Code */}
              <div className="flex flex-col items-center justify-center">
                {viewingBank.qr_file_path ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground text-center block">Payment QR</Label>
                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                      <img 
                        src={viewingBank.qr_file_path} 
                        alt="QR Code" 
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Scan to pay</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-muted/50 p-6 rounded-lg border-2 border-dashed w-40 h-40">
                    <p className="text-xs text-muted-foreground text-center">No QR<br/>code</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!isDeleting} onOpenChange={() => setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              {isDeleting && bankAccounts.find(b => b.id === isDeleting) && (
                <>
                  Are you sure you want to permanently delete the bank account{' '}
                  <strong>{bankAccounts.find(b => b.id === isDeleting)?.bank_name}</strong>{' '}
                  ending in <strong>{bankAccounts.find(b => b.id === isDeleting)?.account_number.slice(-4)}</strong>?
                  <br /><br />
                  This will remove any QR code images and cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const bank = bankAccounts.find(b => b.id === isDeleting)
                if (bank) handleDelete(bank)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}