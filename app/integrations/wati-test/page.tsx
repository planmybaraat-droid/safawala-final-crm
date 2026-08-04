"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Send, TestTube, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { whatsappService } from "@/lib/whatsapp-service"

export default function WATITestPage() {
  const [phoneNumber, setPhoneNumber] = useState("919725295692")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [templateParams, setTemplateParams] = useState<string[]>([])
  const [customMessage, setCustomMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [testResults, setTestResults] = useState<
    Array<{
      timestamp: string
      phone: string
      template: string
      status: "success" | "failed"
      message: string
    }>
  >([])

  const approvedTemplates = [
    {
      name: "booking_confirmation",
      displayName: "Booking Confirmation",
      params: ["Customer Name", "Booking ID", "Total Amount", "Event Date"],
      description: "Send booking confirmation to customers",
    },
    {
      name: "payment_reminder",
      displayName: "Payment Reminder",
      params: ["Customer Name", "Booking ID", "Pending Amount", "Due Date"],
      description: "Remind customers about pending payments",
    },
    {
      name: "delivery_notification",
      displayName: "Delivery Notification",
      params: ["Customer Name", "Booking ID", "Delivery Date"],
      description: "Notify customers about delivery schedule",
    },
    {
      name: "task_assignment",
      displayName: "Task Assignment",
      params: ["Staff Name", "Task Title", "Priority", "Due Date"],
      description: "Assign tasks to staff members",
    },
    {
      name: "inventory_alert",
      displayName: "Inventory Alert",
      params: ["Product Name", "Current Stock", "Minimum Stock"],
      description: "Alert about low stock items",
    },
  ]

  const testConnection = async () => {
    setSending(true)
    try {
      console.log("[v0] Testing WATI connection...")
      const result = await whatsappService.testConnection()

      const testResult = {
        timestamp: new Date().toLocaleString(),
        phone: phoneNumber,
        template: "Connection Test",
        status: result ? ("success" as const) : ("failed" as const),
        message: result ? "Connection successful!" : "Connection failed",
      }

      setTestResults((prev) => [testResult, ...prev])

      toast({
        title: result ? "Connection Successful" : "Connection Failed",
        description: result ? "WATI integration is working properly" : "Please check your WATI configuration",
        variant: result ? "default" : "destructive",
      })
    } catch (error) {
      console.error("[v0] Connection test error:", error)
      toast({
        title: "Test Failed",
        description: "Error testing WATI connection",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const sendTestMessage = async () => {
    if (!phoneNumber || (!selectedTemplate && !customMessage)) {
      toast({
        title: "Missing Information",
        description: "Please provide phone number and select a template or enter custom message",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      let result = false
      let messageText = ""

      if (selectedTemplate) {
        const template = approvedTemplates.find((t) => t.name === selectedTemplate)
        if (template) {
          messageText = generateTestMessage(template, templateParams)
          result = await whatsappService.sendMessage({
            to: phoneNumber,
            type: "text",
            text: { body: messageText },
          })
        }
      } else {
        messageText = customMessage
        result = await whatsappService.sendMessage({
          to: phoneNumber,
          type: "text",
          text: { body: customMessage },
        })
      }

      const testResult = {
        timestamp: new Date().toLocaleString(),
        phone: phoneNumber,
        template: selectedTemplate || "Custom Message",
        status: result ? ("success" as const) : ("failed" as const),
        message: messageText.substring(0, 100) + (messageText.length > 100 ? "..." : ""),
      }

      setTestResults((prev) => [testResult, ...prev])

      toast({
        title: result ? "Message Sent" : "Send Failed",
        description: result ? "Test message sent successfully" : "Failed to send message",
        variant: result ? "default" : "destructive",
      })
    } catch (error) {
      console.error("[v0] Send test error:", error)
      toast({
        title: "Send Failed",
        description: "Error sending test message",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const generateTestMessage = (template: any, params: string[]) => {
    switch (template.name) {
      case "booking_confirmation":
        return `🎉 *Booking Confirmed - Safawala*

Dear ${params[0] || "Test Customer"},

Your booking has been confirmed!

📋 *Booking Details:*
• Booking ID: ${params[1] || "BK001"}
• Total Amount: ₹${params[2] || "5000"}
• Event Date: ${params[3] || "Tomorrow"}

Thank you for choosing Safawala! 🙏`

      case "payment_reminder":
        return `💰 *Payment Reminder - Safawala*

Dear ${params[0] || "Test Customer"},

This is a friendly reminder about your pending payment.

📋 *Payment Details:*
• Booking ID: ${params[1] || "BK001"}
• Pending Amount: ₹${params[2] || "2500"}
• Due Date: ${params[3] || "Today"}

Please make the payment at your earliest convenience.

Thank you! 🙏`

      case "delivery_notification":
        return `🚚 *Delivery Update - Safawala*

Dear ${params[0] || "Test Customer"},

Your order is ready for delivery!

📋 *Delivery Details:*
• Booking ID: ${params[1] || "BK001"}
• Scheduled Delivery: ${params[2] || "Tomorrow"}

Our team will contact you shortly.

Thank you! 🙏`

      case "task_assignment":
        return `📋 *Task Assigned - Safawala*

Hello ${params[0] || "Test Staff"},

A new task has been assigned to you.

📋 *Task Details:*
• Title: ${params[1] || "Test Task"}
• Priority: ${params[2] || "Medium"}
• Due Date: ${params[3] || "Tomorrow"}

Please complete this task on time. 💪`

      case "inventory_alert":
        return `⚠️ *Low Stock Alert - Safawala*

Inventory Alert:

📦 *Product Details:*
• Product: ${params[0] || "Test Product"}
• Current Stock: ${params[1] || "5"}
• Minimum Required: ${params[2] || "10"}

Please restock immediately! 🚨`

      default:
        return "Test message from Safawala CRM"
    }
  }

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName)
    const template = approvedTemplates.find((t) => t.name === templateName)
    if (template) {
      setTemplateParams(new Array(template.params.length).fill(""))
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/integrations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Integrations
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">WATI Template Testing</h1>
          <p className="text-muted-foreground">Test your approved WhatsApp templates</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Configuration
            </CardTitle>
            <CardDescription>Configure and send test messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="919725295692"
              />
            </div>

            <div className="space-y-2">
              <Label>Test Type</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={testConnection} disabled={sending} className="flex-1 bg-transparent">
                  {sending ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template Selection</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to test" />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-3">
                <Label>Template Parameters</Label>
                {approvedTemplates
                  .find((t) => t.name === selectedTemplate)
                  ?.params.map((param, index) => (
                    <Input
                      key={index}
                      placeholder={param}
                      value={templateParams[index] || ""}
                      onChange={(e) => {
                        const newParams = [...templateParams]
                        newParams[index] = e.target.value
                        setTemplateParams(newParams)
                      }}
                    />
                  ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Or Send Custom Message</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter custom message to test..."
                rows={3}
              />
            </div>

            <Button onClick={sendTestMessage} disabled={sending} className="w-full">
              {sending ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Recent test message results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No test results yet. Send a test message to see results.
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{result.template}</span>
                      <Badge variant={result.status === "success" ? "default" : "destructive"}>
                        {result.status === "success" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {result.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.timestamp} • {result.phone}
                    </div>
                    <div className="text-sm bg-gray-50 p-2 rounded">{result.message}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>Templates ready for testing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {approvedTemplates.map((template) => (
              <div key={template.name} className="border rounded-lg p-3">
                <h4 className="font-medium">{template.displayName}</h4>
                <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                <div className="text-xs text-muted-foreground">Parameters: {template.params.join(", ")}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
