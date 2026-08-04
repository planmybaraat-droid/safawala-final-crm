"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { WHATSAPP_TEMPLATES, type TemplateItem } from '@/lib/whatsapp-template-data'
import { 
  MessageSquare, 
  Bell, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Smartphone,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react'

interface WhatsAppSectionProps {
  franchiseId: string
}

interface NotificationSettings {
  booking_confirmation: boolean
  payment_received: boolean
  delivery_reminder: boolean
  return_reminder: boolean
  invoice_sent: boolean
  delivery_reminder_hours: number
  return_reminder_hours: number
  business_hours_only: boolean
  business_start_time: string
  business_end_time: string
}

interface WATIConfig {
  is_active: boolean
  base_url: string
  instance_id: string
  test_phone: string
}

// Badge color helper
const getBadgeStyle = (badge: TemplateItem['badge']) => {
  switch (badge) {
    case 'essential':
      return 'bg-green-100 text-green-700'
    case 'important':
      return 'bg-red-100 text-red-700'
    case 'marketing':
      return 'bg-purple-100 text-purple-700'
    default:
      return ''
  }
}

const getBadgeLabel = (badge: TemplateItem['badge']) => {
  switch (badge) {
    case 'essential':
      return 'Essential'
    case 'important':
      return 'Important'
    case 'marketing':
      return 'Marketing'
    default:
      return 'Optional'
  }
}

export function WhatsAppSection({ franchiseId }: WhatsAppSectionProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [watiConfig, setWatiConfig] = useState<WATIConfig | null>(null)
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [settings, setSettings] = useState<NotificationSettings>({
    booking_confirmation: true,
    payment_received: true,
    delivery_reminder: true,
    return_reminder: true,
    invoice_sent: true,
    delivery_reminder_hours: 24,
    return_reminder_hours: 24,
    business_hours_only: true,
    business_start_time: '09:00',
    business_end_time: '18:00',
  })
  const [testPhone, setTestPhone] = useState('')
  const { toast } = useToast()

  const copyToClipboard = async (templateName: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedTemplate(templateName)
      toast({ title: 'Copied!', description: `Template "${templateName}" copied to clipboard` })
      setTimeout(() => setCopiedTemplate(null), 2000)
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [franchiseId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load WATI configuration
      const configRes = await fetch('/api/wati/setup')
      if (configRes.ok) {
        const configData = await configRes.json()
        setWatiConfig(configData.config)
        if (configData.config?.test_phone) {
          setTestPhone(configData.config.test_phone)
        }
      }

      // Load template statuses
      const templatesRes = await fetch('/api/wati/templates')
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        setTemplates(templatesData.templateStatuses || {})
      }

      // Load notification settings
      const settingsRes = await fetch(`/api/settings/whatsapp?franchiseId=${franchiseId}`)
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        if (settingsData.settings) {
          setSettings(settingsData.settings)
        }
      }
    } catch (error) {
      console.error('[WhatsApp] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ franchiseId, settings }),
      })

      if (res.ok) {
        toast({ title: 'Settings saved', description: 'WhatsApp notification settings updated' })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast({ title: 'Invalid phone', description: 'Please enter a valid phone number', variant: 'destructive' })
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/wati/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          phone: testPhone,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast({ title: 'Test message sent!', description: `Check WhatsApp on ${testPhone}` })
      } else {
        throw new Error(data.error || 'Failed to send')
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send test message', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  const getTemplateStatus = (templateName: string) => {
    const status = templates[templateName]
    if (status === 'APPROVED') return <Badge className="bg-green-100 text-green-700">Approved</Badge>
    if (status === 'PENDING') return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
    if (status === 'REJECTED') return <Badge className="bg-red-100 text-red-700">Rejected</Badge>
    return <Badge variant="outline">Not Found</Badge>
  }

  // Template Card Component
  const TemplateCard = ({ template }: { template: TemplateItem }) => (
    <details className="border rounded-lg group">
      <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between list-none">
        <div className="flex items-center gap-3">
          <Badge className={getBadgeStyle(template.badge)} variant={template.badge === 'optional' ? 'outline' : 'default'}>
            {getBadgeLabel(template.badge)}
          </Badge>
          <span className="font-medium font-mono text-sm">{template.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm hidden sm:inline">{template.label}</span>
          <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="p-4 border-t bg-gray-50 space-y-3">
        {/* Template Name to copy */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Template Name:</span>
          <code className="bg-gray-200 px-2 py-0.5 rounded text-xs font-mono">{template.name}</code>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2"
            onClick={() => copyToClipboard(`${template.name}_name`, template.name)}
          >
            {copiedTemplate === `${template.name}_name` ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        {/* Message Content */}
        <div className="relative">
          <div className="bg-white p-4 rounded-lg border text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {template.message}
          </div>
          <Button 
            variant="default" 
            size="sm" 
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(template.name, template.message)}
          >
            {copiedTemplate === template.name ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-300" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy Message
              </>
            )}
          </Button>
        </div>
        
        {/* Parameters */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Parameters:</strong> {template.params}
          </p>
        </div>
      </div>
    </details>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Integration (WATI)
          </CardTitle>
          <CardDescription>
            Connect with customers via WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {watiConfig?.is_active ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <p className="font-medium">
                  {watiConfig?.is_active ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-gray-500">
                  {watiConfig?.base_url || 'WATI API not configured'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Test Message */}
          <div className="space-y-2">
            <Label>Send Test Message</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Phone number (e.g., 919876543210)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleSendTestMessage} disabled={testing || !watiConfig?.is_active}>
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            WhatsApp Template Library
          </CardTitle>
          <CardDescription>
            Complete list of all 46 templates for WATI. Click to expand and copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-800 mb-2">📝 How to Create Templates in WATI:</h5>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Go to WATI Dashboard → Templates → Create New Template</li>
              <li>Copy the template name exactly (click the small copy button)</li>
              <li>Select "UTILITY" as category for all templates</li>
              <li>Click "Copy Message" to copy the message body</li>
              <li>WhatsApp approval takes 24-48 hours</li>
            </ol>
          </div>

          {/* Template Categories */}
          {WHATSAPP_TEMPLATES.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <h4 className="font-bold text-lg border-b pb-2">
                {category.title}
              </h4>
              <div className="space-y-2">
                {category.templates.map((template, templateIndex) => (
                  <TemplateCard key={templateIndex} template={template} />
                ))}
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <h5 className="font-semibold text-green-800 mb-2">✅ Template Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-green-700">
              <div>📋 Booking: 8</div>
              <div>💳 Payment: 8</div>
              <div>📦 Delivery: 6</div>
              <div>🔄 Return: 6</div>
              <div>📄 Invoice: 4</div>
              <div>💬 Quotes: 4</div>
              <div>👤 Customer: 6</div>
              <div>📢 Marketing: 4</div>
            </div>
            <p className="text-sm text-green-700 mt-2 font-medium">Total: 46 Templates</p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Auto Notifications
          </CardTitle>
          <CardDescription>
            Automatically send WhatsApp messages on business events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Booking Confirmation</Label>
                <p className="text-sm text-gray-500">Send when a new booking is created</p>
              </div>
              <Switch
                checked={settings.booking_confirmation}
                onCheckedChange={(checked) => setSettings({ ...settings, booking_confirmation: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Payment Received</Label>
                <p className="text-sm text-gray-500">Send when payment is recorded</p>
              </div>
              <Switch
                checked={settings.payment_received}
                onCheckedChange={(checked) => setSettings({ ...settings, payment_received: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Delivery Reminder</Label>
                <p className="text-sm text-gray-500">Send before scheduled delivery</p>
              </div>
              <Switch
                checked={settings.delivery_reminder}
                onCheckedChange={(checked) => setSettings({ ...settings, delivery_reminder: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Return Reminder</Label>
                <p className="text-sm text-gray-500">Send before return due date</p>
              </div>
              <Switch
                checked={settings.return_reminder}
                onCheckedChange={(checked) => setSettings({ ...settings, return_reminder: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Invoice Sent</Label>
                <p className="text-sm text-gray-500">Send invoice PDF to customer</p>
              </div>
              <Switch
                checked={settings.invoice_sent}
                onCheckedChange={(checked) => setSettings({ ...settings, invoice_sent: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Reminder Timing */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Reminder Timing
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Reminder (hours before)</Label>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={settings.delivery_reminder_hours}
                  onChange={(e) => setSettings({ ...settings, delivery_reminder_hours: parseInt(e.target.value) || 24 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Return Reminder (hours before)</Label>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={settings.return_reminder_hours}
                  onChange={(e) => setSettings({ ...settings, return_reminder_hours: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Business Hours Only</Label>
                <p className="text-sm text-gray-500">Only send messages during business hours</p>
              </div>
              <Switch
                checked={settings.business_hours_only}
                onCheckedChange={(checked) => setSettings({ ...settings, business_hours_only: checked })}
              />
            </div>

            {settings.business_hours_only && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={settings.business_start_time}
                    onChange={(e) => setSettings({ ...settings, business_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={settings.business_end_time}
                    onChange={(e) => setSettings({ ...settings, business_end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
