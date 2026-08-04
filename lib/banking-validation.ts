// Banking validation utilities (removed ACCOUNT_TYPES)

// Validation patterns
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const UPI_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
export const ACCOUNT_NUMBER_PATTERN = /^[a-zA-Z0-9]{8,24}$/

// File upload constraints
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface BankAccountFormData {
  bank_name: string
  account_holder: string
  account_number: string
  ifsc_code: string
  branch_name?: string
  upi_id?: string
  is_primary: boolean
  show_on_invoices: boolean
  show_on_quotes: boolean
  qr_file_path?: string
}

export interface ValidationError {
  field: string
  message: string
}

export class BankingValidator {
  static validateBankName(value: string): string | null {
    if (!value || value.trim().length < 2) {
      return 'Bank name must be at least 2 characters'
    }
    if (value.trim().length > 100) {
      return 'Bank name must be less than 100 characters'
    }
    return null
  }

  static validateAccountHolder(value: string): string | null {
    if (!value || value.trim().length < 2) {
      return 'Account holder name must be at least 2 characters'
    }
    if (value.trim().length > 100) {
      return 'Account holder name must be less than 100 characters'
    }
    return null
  }

  static validateAccountNumber(value: string): string | null {
    if (!value || !ACCOUNT_NUMBER_PATTERN.test(value.trim())) {
      return 'Account number must be 8-24 alphanumeric characters'
    }
    return null
  }

  static validateIFSCCode(value: string): string | null {
    if (!value || !IFSC_PATTERN.test(value.toUpperCase().trim())) {
      return 'IFSC code must follow format: ABCD0123456 (4 letters, 1 zero, 6 alphanumeric)'
    }
    return null
  }

  static validateUPIId(value: string): string | null {
    if (value && value.trim() && !UPI_PATTERN.test(value.trim())) {
      return 'UPI ID format is invalid (e.g., user@bank)'
    }
    return null
  }

  static validateFile(file: File): string | null {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'File must be JPEG, PNG, or WebP image'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB'
    }
    return null
  }

  static validateForm(data: BankAccountFormData): ValidationError[] {
    const errors: ValidationError[] = []

    const bankNameError = this.validateBankName(data.bank_name)
    if (bankNameError) errors.push({ field: 'bank_name', message: bankNameError })

    const accountHolderError = this.validateAccountHolder(data.account_holder)
    if (accountHolderError) errors.push({ field: 'account_holder', message: accountHolderError })

    const accountNumberError = this.validateAccountNumber(data.account_number)
    if (accountNumberError) errors.push({ field: 'account_number', message: accountNumberError })

    const ifscError = this.validateIFSCCode(data.ifsc_code)
    if (ifscError) errors.push({ field: 'ifsc_code', message: ifscError })

    const upiError = this.validateUPIId(data.upi_id || '')
    if (upiError) errors.push({ field: 'upi_id', message: upiError })

    return errors
  }
}

// Utility functions
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber
  return 'XXXXXX' + accountNumber.slice(-4)
}

export function generateFileKey(orgId: string, fileExtension: string): string {
  const uuid = crypto.randomUUID()
  return `banks/${orgId}/${uuid}.${fileExtension}`
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}