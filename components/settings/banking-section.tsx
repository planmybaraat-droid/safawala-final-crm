"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
// @ts-ignore
import QRCode from 'qrcode'
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  QrCode,
  Smartphone,
  Download,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'

interface BankAccount {
  id: string
  bank_name: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  branch_name?: string
  account_type: string
  is_primary: boolean
  show_on_invoice: boolean
  upi_id?: string
  qr_code_url?: string
}

interface BankingSectionProps {
  franchiseId: string
}

export function BankingSection({ franchiseId }: BankingSectionProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [showAccountNumbers, setShowAccountNumbers] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'Current',
    is_primary: false,
    show_on_invoice: true,
    upi_id: '',
    qr_code_url: ''
  })

  useEffect(() => {
    fetchBankAccounts()
  }, [franchiseId])

  useEffect(() => {
    if (selectedAccount && qrCodeDialogOpen) {
      updateQRCode(selectedAccount, paymentAmount)
    }
  }, [selectedAccount, qrCodeDialogOpen])

  const fetchBankAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/settings/banking?franchise_id=${franchiseId}`)
      const result = await response.json()
      
      if (response.ok) {
        setBankAccounts(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      toast({
        title: "Error",
        description: "Failed to load bank accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBankFormChange = (field: string, value: any) => {
    setBankForm(prev => ({ ...prev, [field]: value }))
  }

  const resetBankForm = () => {
    setBankForm({
      bank_name: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_type: 'Current',
      is_primary: false,
      show_on_invoice: true,
      upi_id: '',
      qr_code_url: ''
    })
    setEditingBank(null)
  }

  const handleEditBank = (bank: BankAccount) => {
    setBankForm({
      bank_name: bank.bank_name,
      account_holder_name: bank.account_holder_name,
      account_number: bank.account_number,
      ifsc_code: bank.ifsc_code,
      branch_name: bank.branch_name || '',
      account_type: bank.account_type,
      is_primary: bank.is_primary,
      show_on_invoice: bank.show_on_invoice,
      upi_id: bank.upi_id || '',
      qr_code_url: bank.qr_code_url || ''
    })
    setEditingBank(bank)
    setBankDialogOpen(true)
  }

  const handleSaveBank = async () => {
    try {
      setSaving(true)
      const method = editingBank ? 'PUT' : 'POST'
      const body = editingBank 
        ? { ...bankForm, id: editingBank.id, franchise_id: franchiseId }
        : { ...bankForm, franchise_id: franchiseId }

      const response = await fetch('/api/settings/banking', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: editingBank ? "Bank account updated successfully" : "Bank account added successfully",
        })
        setBankDialogOpen(false)
        resetBankForm()
        fetchBankAccounts()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save bank account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving bank account:', error)
      toast({
        title: "Error",
        description: "Failed to save bank account",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBank = async (bankId: string) => {
    try {
      const response = await fetch('/api/settings/banking', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bankId })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Bank account deleted successfully",
        })
        fetchBankAccounts()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete bank account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting bank account:', error)
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      })
    }
  }

  const toggleAccountVisibility = (accountId: string) => {
    setShowAccountNumbers(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  const generateUPIQRCode = async (account: BankAccount) => {
    if (!account.upi_id) {
      toast({
        title: "Error",
        description: "UPI ID not available for this account",
        variant: "destructive",
      })
      return
    }

    setSelectedAccount(account)
    setQrCodeDialogOpen(true)
    
    // Generate initial QR code without amount
    await updateQRCode(account, paymentAmount)
  }

  const updateQRCode = async (account: BankAccount, amount?: string) => {
    try {
      // Generate UPI payment URL
      let upiUrl = `upi://pay?pa=${account.upi_id}&pn=${encodeURIComponent(account.account_holder_name)}&cu=INR`
      
      if (amount && amount.trim() && parseFloat(amount) > 0) {
        upiUrl += `&am=${parseFloat(amount).toFixed(2)}`
      }
      
      const qrCodeUrl = await QRCode.toDataURL(upiUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeDataUrl(qrCodeUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      })
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !selectedAccount) return
    
    const link = document.createElement('a')
    const filename = paymentAmount && parseFloat(paymentAmount) > 0 
      ? `${selectedAccount.bank_name}_UPI_QR_₹${parseFloat(paymentAmount).toFixed(2)}.png`
      : `${selectedAccount.bank_name}_UPI_QR.png`
    
    link.download = filename
    link.href = qrCodeDataUrl
    link.click()
    
    toast({
      title: "Downloaded!",
      description: "QR code image saved to your device",
    })
  }

  const copyUPIId = (upiId: string) => {
    navigator.clipboard.writeText(upiId)
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    })
  }

  const formatAccountNumber = (accountNumber: string, isVisible: boolean) => {
    if (isVisible) return accountNumber
    return accountNumber.replace(/\d(?=\d{4})/g, "*")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Banking Details
          </CardTitle>
          <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetBankForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      value={bankForm.bank_name}
                      onChange={(e) => handleBankFormChange('bank_name', e.target.value)}
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Account Type</Label>
                    <Select value={bankForm.account_type} onValueChange={(value) => handleBankFormChange('account_type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                  <Input
                    id="account_holder_name"
                    value={bankForm.account_holder_name}
                    onChange={(e) => handleBankFormChange('account_holder_name', e.target.value)}
                    placeholder="Safawala Rental Services"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input
                      id="account_number"
                      value={bankForm.account_number}
                      onChange={(e) => handleBankFormChange('account_number', e.target.value)}
                      placeholder="123456789012"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code *</Label>
                    <Input
                      id="ifsc_code"
                      value={bankForm.ifsc_code}
                      onChange={(e) => handleBankFormChange('ifsc_code', e.target.value)}
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    value={bankForm.branch_name}
                    onChange={(e) => handleBankFormChange('branch_name', e.target.value)}
                    placeholder="Mumbai Main Branch"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upi_id">UPI ID</Label>
                  <Input
                    id="upi_id"
                    value={bankForm.upi_id}
                    onChange={(e) => handleBankFormChange('upi_id', e.target.value)}
                    placeholder="safawala@hdfc"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr_code_url">QR Code Image</Label>
                  <Input
                    id="qr_code_url"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Convert file to base64 or handle upload
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          handleBankFormChange('qr_code_url', event.target?.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  {bankForm.qr_code_url && (
                    <div className="mt-2">
                      <img 
                        src={bankForm.qr_code_url} 
                        alt="QR Code Preview" 
                        className="w-24 h-24 object-contain border rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_primary"
                    checked={bankForm.is_primary}
                    onCheckedChange={(checked) => handleBankFormChange('is_primary', checked)}
                  />
                  <Label htmlFor="is_primary">Set as primary account</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_on_invoice"
                    checked={bankForm.show_on_invoice}
                    onCheckedChange={(checked) => handleBankFormChange('show_on_invoice', checked)}
                  />
                  <Label htmlFor="show_on_invoice">Show on invoices</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setBankDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveBank} disabled={saving} className="flex-1">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBank ? 'Update' : 'Add'} Account
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No bank accounts added yet</p>
              <p className="text-sm text-gray-500">Add your first bank account to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{account.bank_name}</h4>
                          {account.is_primary && (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          )}
                          {account.show_on_invoice && (
                            <Badge variant="outline" className="text-xs">On Invoices</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">{account.account_holder_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {formatAccountNumber(account.account_number, showAccountNumbers[account.id] || false)} • {account.ifsc_code}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAccountVisibility(account.id)}
                              className="h-6 w-6 p-0"
                            >
                              {showAccountNumbers[account.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {account.upi_id && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 space-y-3 border border-blue-100">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">UPI Payment</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">UPI ID:</span>
                                  <code className="text-sm bg-white px-2 py-1 rounded border text-blue-700 font-medium">{account.upi_id}</code>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyUPIId(account.upi_id!)}
                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                >
                                  <Copy className="h-3 w-3 text-blue-600" />
                                </Button>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateUPIQRCode(account)}
                                  className="flex-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  <QrCode className="h-3 w-3 mr-2" />
                                  Generate QR Code
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {account.qr_code_url && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <QrCode className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Uploaded QR Code</span>
                            </div>
                            <img 
                              src={account.qr_code_url} 
                              alt="Bank QR Code" 
                              className="w-20 h-20 object-contain border rounded"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBank(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBank(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={(open) => {
        setQrCodeDialogOpen(open)
        if (!open) {
          setPaymentAmount('')
          setQrCodeDataUrl('')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              UPI Payment QR Code
            </DialogTitle>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-medium">{selectedAccount.bank_name}</h3>
                <p className="text-sm text-gray-600">{selectedAccount.account_holder_name}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">UPI ID:</span>
                  <code className="text-sm bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-700">{selectedAccount.upi_id}</code>
                </div>
              </div>

              <Separator />

              {/* Payment Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">₹</span>
                  <Input
                    id="payment_amount"
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onBlur={() => selectedAccount && updateQRCode(selectedAccount, paymentAmount)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedAccount && updateQRCode(selectedAccount, paymentAmount)}
                  >
                    Update QR
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Leave empty for open amount</p>
              </div>

              <div className="flex justify-center">
                {qrCodeDataUrl ? (
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              <div className="text-center space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">
                    {paymentAmount && parseFloat(paymentAmount) > 0 
                      ? `Payment of ₹${parseFloat(paymentAmount).toFixed(2)}`
                      : 'Open Amount Payment'
                    }
                  </p>
                  <p className="text-xs text-gray-500">
                    Scan with any UPI app (PhonePe, Google Pay, Paytm, etc.)
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => copyUPIId(selectedAccount.upi_id!)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy UPI ID
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={downloadQRCode}
                    className="flex-1"
                    disabled={!qrCodeDataUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}