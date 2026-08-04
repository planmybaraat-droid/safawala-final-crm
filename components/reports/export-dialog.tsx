"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Download, FileText, Table, Loader2 } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { toast } from '@/hooks/use-toast'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  reportData: any
  dateRange?: DateRange
  selectedFranchise: string
  reportType: string
}

export function ExportDialog({ 
  isOpen, 
  onClose, 
  reportData, 
  dateRange, 
  selectedFranchise, 
  reportType 
}: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState('csv')
  const [includeCharts, setIncludeCharts] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!reportData) return

    setIsExporting(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate processing time

      if (exportFormat === 'csv') {
        await exportToCSV()
      } else if (exportFormat === 'pdf') {
        await exportToPDF()
      } else if (exportFormat === 'excel') {
        await exportToExcel()
      }
      
      toast({
        title: "Export Successful",
        description: `Report exported as ${exportFormat.toUpperCase()}`,
      })
      
      onClose()
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = async () => {
    const csvContent = [
      ['Safawala CRM - Business Report'],
      ['Report Type', reportType],
      ['Date Range', `${dateRange?.from?.toLocaleDateString()} - ${dateRange?.to?.toLocaleDateString()}`],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['SUMMARY'],
      ['Total Revenue', `₹${reportData.totalRevenue?.toLocaleString() || 0}`],
      ['Total Expenses', `₹${(reportData.totalExpenses || 0).toLocaleString()}`],
      ['Net Profit', `₹${((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)).toLocaleString()}`],
      ['Total Bookings', reportData.totalBookings || 0],
      ['Total Customers', reportData.totalCustomers || 0],
      [''],
      ...(includeDetails ? [
        ['TOP PRODUCTS'],
        ['Product Name', 'Category', 'Bookings', 'Revenue'],
        ...(reportData.topProducts || []).map((product: any) => [
          product.name,
          product.category,
          product.bookings,
          `₹${product.revenue.toLocaleString()}`
        ])
      ] : [])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportToPDF = async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportType}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px; 
              color: #333;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #8B5CF6; 
              padding-bottom: 20px; 
            }
            .logo { 
              font-size: 28px; 
              font-weight: bold; 
              color: #8B5CF6; 
              margin-bottom: 10px; 
            }
            .subtitle { 
              color: #666; 
              font-size: 14px; 
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .stat-card { 
              border: 2px solid #e5e7eb; 
              padding: 20px; 
              border-radius: 12px; 
              text-align: center;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            }
            .stat-value { 
              font-size: 24px; 
              font-weight: bold; 
              color: #8B5CF6; 
              margin-bottom: 5px;
            }
            .stat-label { 
              color: #666; 
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); 
              color: white;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
            }
            tr:nth-child(even) { 
              background-color: #f8fafc; 
            }
            .section-title { 
              font-size: 20px; 
              font-weight: bold; 
              margin: 40px 0 20px 0; 
              color: #374151;
              border-left: 4px solid #8B5CF6;
              padding-left: 15px;
            }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              color: #666; 
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .profit-positive { color: #059669; }
            .profit-negative { color: #DC2626; }
            @media print {
              body { margin: 0; }
              .stat-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">SAFAWALA CRM</div>
            <h1>${reportType}</h1>
            <p class="subtitle">Date Range: ${dateRange?.from?.toLocaleDateString()} - ${dateRange?.to?.toLocaleDateString()}</p>
            <p class="subtitle">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            ${selectedFranchise !== 'all' ? `<p class="subtitle">Franchise: ${selectedFranchise}</p>` : ''}
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">₹${reportData.totalRevenue?.toLocaleString() || 0}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">₹${(reportData.totalExpenses || 0).toLocaleString()}</div>
              <div class="stat-label">Total Expenses</div>
            </div>
            <div class="stat-card">
              <div class="stat-value ${((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)) >= 0 ? 'profit-positive' : 'profit-negative'}">
                ₹${((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)).toLocaleString()}
              </div>
              <div class="stat-label">Net Profit</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${reportData.totalBookings || 0}</div>
              <div class="stat-label">Total Bookings</div>
            </div>
          </div>

          ${includeDetails && reportData.topProducts && reportData.topProducts.length > 0 ? `
            <div class="section-title">Top Performing Products</div>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Bookings</th>
                  <th>Revenue</th>
                  <th>Avg. Revenue per Booking</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topProducts.map((product: any) => `
                  <tr>
                    <td><strong>${product.name}</strong></td>
                    <td>${product.category}</td>
                    <td>${product.bookings}</td>
                    <td>₹${product.revenue.toLocaleString()}</td>
                    <td>₹${Math.round(product.revenue / product.bookings).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="section-title">Key Performance Indicators</div>
          <table>
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Performance</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Profit Margin</td>
                <td>${(((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)) / Math.max(reportData.totalRevenue || 1, 1) * 100).toFixed(1)}%</td>
                <td>${(((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)) / Math.max(reportData.totalRevenue || 1, 1) * 100) > 20 ? '🟢 Excellent' : (((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)) / Math.max(reportData.totalRevenue || 1, 1) * 100) > 10 ? '🟡 Good' : '🔴 Needs Improvement'}</td>
              </tr>
              <tr>
                <td>Revenue per Customer</td>
                <td>₹${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalCustomers || 1, 1)).toLocaleString()}</td>
                <td>${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalCustomers || 1, 1)) > 10000 ? '🟢 High Value' : '🟡 Average'}</td>
              </tr>
              <tr>
                <td>Revenue per Booking</td>
                <td>₹${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalBookings || 1, 1)).toLocaleString()}</td>
                <td>${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalBookings || 1, 1)) > 5000 ? '🟢 Premium' : '🟡 Standard'}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Safawala CRM - Wedding Turban & Accessories Management System</strong></p>
            <p>This report contains confidential business information. Please handle with care.</p>
            <p>For support and inquiries: support@safawala.com | +91-1234567890</p>
          </div>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportToExcel = async () => {
    // Create a simple CSV that can be opened in Excel
    const excelContent = [
      ['Safawala CRM - Business Report'],
      [''],
      ['Report Type', reportType],
      ['Date Range', `${dateRange?.from?.toLocaleDateString()} - ${dateRange?.to?.toLocaleDateString()}`],
      ['Generated On', new Date().toLocaleDateString()],
      [''],
      ['EXECUTIVE SUMMARY'],
      ['Metric', 'Value', 'Notes'],
      ['Total Revenue', `₹${reportData.totalRevenue?.toLocaleString() || 0}`, 'All revenue streams'],
      ['Total Expenses', `₹${(reportData.totalExpenses || 0).toLocaleString()}`, 'Operating expenses'],
      ['Net Profit', `₹${((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)).toLocaleString()}`, 'Revenue minus expenses'],
      ['Profit Margin', `${(((reportData.totalRevenue || 0) - (reportData.totalExpenses || 0)) / Math.max(reportData.totalRevenue || 1, 1) * 100).toFixed(1)}%`, 'Profitability ratio'],
      ['Total Bookings', reportData.totalBookings || 0, 'Number of bookings'],
      ['Total Customers', reportData.totalCustomers || 0, 'Unique customers'],
      ['Revenue per Customer', `₹${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalCustomers || 1, 1)).toLocaleString()}`, 'Customer lifetime value'],
      ['Revenue per Booking', `₹${Math.round((reportData.totalRevenue || 0) / Math.max(reportData.totalBookings || 1, 1)).toLocaleString()}`, 'Average booking value'],
      [''],
      ...(includeDetails && reportData.topProducts ? [
        ['TOP PRODUCTS ANALYSIS'],
        ['Product Name', 'Category', 'Bookings', 'Revenue', 'Avg Revenue per Booking', 'Market Share %'],
        ...(reportData.topProducts || []).map((product: any) => [
          product.name,
          product.category,
          product.bookings,
          `₹${product.revenue.toLocaleString()}`,
          `₹${Math.round(product.revenue / product.bookings).toLocaleString()}`,
          `${((product.revenue / (reportData.totalRevenue || 1)) * 100).toFixed(1)}%`
        ])
      ] : [])
    ].map(row => row.join('\t')).join('\n')

    const blob = new Blob([excelContent], { type: 'text/tab-separated-values;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV (Comma Separated Values)
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Excel Compatible (.xls)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF Report (.html)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Export Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="details" 
                checked={includeDetails}
                onCheckedChange={setIncludeDetails}
              />
              <Label htmlFor="details">Include detailed product analysis</Label>
            </div>
            
            {exportFormat === 'pdf' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="charts" 
                  checked={includeCharts}
                  onCheckedChange={setIncludeCharts}
                />
                <Label htmlFor="charts">Include performance indicators</Label>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Report Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Report Type:</strong> {reportType}</p>
              <p><strong>Date Range:</strong> {dateRange?.from?.toLocaleDateString()} - {dateRange?.to?.toLocaleDateString()}</p>
              {selectedFranchise !== 'all' && <p><strong>Franchise:</strong> {selectedFranchise}</p>}
              <p><strong>Total Revenue:</strong> ₹{reportData?.totalRevenue?.toLocaleString() || 0}</p>
              <p><strong>Total Bookings:</strong> {reportData?.totalBookings || 0}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
