import { toast } from '@/hooks/use-toast'

export interface ToastOptions {
  title: string
  description?: string
  duration?: number
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export class ToastService {
  // Success notifications
  static success(options: ToastOptions | string) {
    const config = typeof options === 'string' 
      ? { title: options } 
      : options
    
    toast.success(config.title, config.description)
  }

  // Error notifications with detailed failure reasons
  static error(options: ToastOptions | string | ApiError) {
    let config: ToastOptions
    
    if (typeof options === 'string') {
      config = { title: 'Error', description: options }
    } else if ('message' in options) {
      // ApiError format
      config = {
        title: 'Operation Failed',
        description: this.formatErrorMessage(options)
      }
    } else {
      config = options
    }
    
    toast.error(config.title, config.description)
  }

  // Warning notifications
  static warning(options: ToastOptions | string) {
    const config = typeof options === 'string' 
      ? { title: 'Warning', description: options } 
      : options
    
    toast.warning(config.title, config.description)
  }

  // Info notifications
  static info(options: ToastOptions | string) {
    const config = typeof options === 'string' 
      ? { title: 'Info', description: options } 
      : options
    
    toast.info(config.title, config.description)
  }

  // Format API error messages with detailed reasons
  private static formatErrorMessage(error: ApiError): string {
    let message = error.message

    // Add error code if available
    if (error.code) {
      message += ` (Code: ${error.code})`
    }

    // Add additional details if available
    if (error.details) {
      if (typeof error.details === 'string') {
        message += ` - ${error.details}`
      } else if (error.details.hint) {
        message += ` - ${error.details.hint}`
      } else if (error.details.message) {
        message += ` - ${error.details.message}`
      }
    }

    return message
  }

  // Handle API response errors with context
  static async handleApiError(
    response: Response, 
    operation: string,
    customErrorMessages?: Record<number, string>
  ) {
    let errorMessage = `Failed to ${operation}`
    
    try {
      const errorData = await response.json()
      
      if (customErrorMessages && customErrorMessages[response.status]) {
        errorMessage = customErrorMessages[response.status]
      } else {
        switch (response.status) {
          case 400:
            errorMessage = `Invalid request: ${errorData.message || 'Bad request'}`
            break
          case 401:
            errorMessage = 'Authentication required. Please log in again.'
            break
          case 403:
            errorMessage = 'You do not have permission to perform this action'
            break
          case 404:
            errorMessage = 'The requested resource was not found'
            break
          case 409:
            errorMessage = `Conflict: ${errorData.message || 'Resource already exists'}`
            break
          case 422:
            errorMessage = `Validation error: ${errorData.message || 'Invalid data provided'}`
            break
          case 429:
            errorMessage = 'Too many requests. Please try again later.'
            break
          case 500:
            errorMessage = `Server error while ${operation.toLowerCase()}. Please try again.`
            break
          case 503:
            errorMessage = 'Service temporarily unavailable. Please try again later.'
            break
          default:
            errorMessage = `Failed to ${operation.toLowerCase()}: ${errorData.message || 'Unknown error'}`
        }
      }

      this.error({
        title: 'Operation Failed',
        description: errorMessage
      })
    } catch (parseError) {
      // If we can't parse the error response
      this.error({
        title: 'Operation Failed',
        description: `Failed to ${operation.toLowerCase()}. Status: ${response.status}`
      })
    }
  }

  // Common CRM operation notifications
  static operations = {
    // Customer operations
    customerCreated: () => this.success('Customer created successfully'),
    customerUpdated: () => this.success('Customer updated successfully'),
    customerDeleted: () => this.success('Customer deleted successfully'),
    customerCreateFailed: (reason?: string) => this.error(`Failed to create customer${reason ? `: ${reason}` : ''}`),
    customerUpdateFailed: (reason?: string) => this.error(`Failed to update customer${reason ? `: ${reason}` : ''}`),
    customerDeleteFailed: (reason?: string) => this.error(`Failed to delete customer${reason ? `: ${reason}` : ''}`),

    // Booking operations
    bookingCreated: () => this.success('Booking created successfully'),
    bookingUpdated: () => this.success('Booking updated successfully'),
    bookingCancelled: () => this.success('Booking cancelled successfully'),
    bookingCreateFailed: (reason?: string) => this.error(`Failed to create booking${reason ? `: ${reason}` : ''}`),
    bookingUpdateFailed: (reason?: string) => this.error(`Failed to update booking${reason ? `: ${reason}` : ''}`),
    bookingCancelFailed: (reason?: string) => this.error(`Failed to cancel booking${reason ? `: ${reason}` : ''}`),

    // Inventory operations
    inventoryUpdated: () => this.success('Inventory updated successfully'),
    inventoryUpdateFailed: (reason?: string) => this.error(`Failed to update inventory${reason ? `: ${reason}` : ''}`),
    stockAdded: () => this.success('Stock added successfully'),
    stockAddFailed: (reason?: string) => this.error(`Failed to add stock${reason ? `: ${reason}` : ''}`),

    // Payment operations
    paymentProcessed: () => this.success('Payment processed successfully'),
    paymentFailed: (reason?: string) => this.error(`Payment failed${reason ? `: ${reason}` : ''}`),
    refundProcessed: () => this.success('Refund processed successfully'),
    refundFailed: (reason?: string) => this.error(`Refund failed${reason ? `: ${reason}` : ''}`),

    // Settings operations
    settingsSaved: () => this.success('Settings saved successfully'),
    settingsSaveFailed: (reason?: string) => this.error(`Failed to save settings${reason ? `: ${reason}` : ''}`),

    // Data import/export
    dataImported: (count: number) => this.success(`${count} records imported successfully`),
    dataImportFailed: (reason?: string) => this.error(`Data import failed${reason ? `: ${reason}` : ''}`),
    dataExported: () => this.success('Data exported successfully'),
    dataExportFailed: (reason?: string) => this.error(`Data export failed${reason ? `: ${reason}` : ''}`),

    // Sync operations
    syncCompleted: () => this.success('Synchronization completed successfully'),
    syncFailed: (reason?: string) => this.error(`Synchronization failed${reason ? `: ${reason}` : ''}`),

    // Notification operations
    notificationSent: () => this.success('Notification sent successfully'),
    notificationFailed: (reason?: string) => this.error(`Failed to send notification${reason ? `: ${reason}` : ''}`),

    // Authentication
    loginSuccess: () => this.success('Welcome! Logged in successfully'),
    loginFailed: (reason?: string) => this.error(`Login failed${reason ? `: ${reason}` : ''}`),
    logoutSuccess: () => this.success('Logged out successfully'),
    sessionExpired: () => this.warning('Session expired. Please log in again.'),

    // General operations
    saveSuccess: () => this.success('Changes saved successfully'),
    saveFailed: (reason?: string) => this.error(`Failed to save changes${reason ? `: ${reason}` : ''}`),
    deleteSuccess: () => this.success('Deleted successfully'),
    deleteFailed: (reason?: string) => this.error(`Failed to delete${reason ? `: ${reason}` : ''}`),
    loadFailed: (reason?: string) => this.error(`Failed to load data${reason ? `: ${reason}` : ''}`),
  }
}

// Export singleton instance for convenience
export const toastService = new ToastService()

// Export individual methods for direct use
export const {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  handleApiError,
} = ToastService