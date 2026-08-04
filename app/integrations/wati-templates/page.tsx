"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Copy, CheckCircle, Clock, XCircle, Eye, ArrowLeft, Search, Download, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { SAFAWALA_TEMPLATES, templateManager, type WATITemplate } from "@/lib/wati-templates"
import Link from "next/link"

export default function WATITemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<WATITemplate | null>(null)
  const [copying, setCopying] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [templateStatuses, setTemplateStatuses] = useState<Record<string, string>>({})
  const [loadingStatuses, setLoadingStatuses] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchTemplateStatuses = async () => {
    setLoadingStatuses(true)
    try {
      const response = await fetch("/api/wati/templates")
      const data = await response.json()

      if (data.success) {
        setTemplateStatuses(data.templateStatuses)
        setLastUpdated(data.lastUpdated)
        toast({
          title: "Status Updated",
          description: "Template statuses synced with WATI successfully.",
        })
      } else {
        toast({
          title: "Sync Failed",
          description: "Could not fetch latest template statuses from WATI.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to connect to WATI API.",
        variant: "destructive",
      })
    } finally {
      setLoadingStatuses(false)
    }
  }

  useEffect(() => {
    fetchTemplateStatuses()
  }, [])

  const templatesByCategory = SAFAWALA_TEMPLATES.reduce(
    (acc, template) => {
      const category = template.category || "OTHER"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    },
    {} as Record<string, WATITemplate[]>,
  )

  const categories = Object.keys(templatesByCategory).sort()

  const filteredTemplates = SAFAWALA_TEMPLATES.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const copyToClipboard = async (text: string, templateName: string) => {
    setCopying(templateName)
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Template format copied. You can now paste it in WATI dashboard.",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the template format.",
        variant: "destructive",
      })
    } finally {
      setCopying(null)
    }
  }

  const copyComponentContent = async (text: string, componentType: string) => {
    const copyId = `${componentType}-${Date.now()}`
    setCopying(copyId)
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: `${componentType} content copied successfully.`,
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the content.",
        variant: "destructive",
      })
    } finally {
      setCopying(null)
    }
  }

  const getStatusBadge = (templateName: string, fallbackStatus: string) => {
    const realStatus = templateStatuses[templateName] || fallbackStatus
    switch (realStatus) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{realStatus}</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "UTILITY":
        return "bg-blue-100 text-blue-800"
      case "MARKETING":
        return "bg-purple-100 text-purple-800"
      case "AUTHENTICATION":
        return "bg-green-100 text-green-800"
      case "CUSTOMER_MANAGEMENT":
        return "bg-orange-100 text-orange-800"
      case "BOOKING_SYSTEM":
        return "bg-indigo-100 text-indigo-800"
      case "INVENTORY_MANAGEMENT":
        return "bg-teal-100 text-teal-800"
      case "QUOTE_SYSTEM":
        return "bg-pink-100 text-pink-800"
      case "FINANCIAL_MANAGEMENT":
        return "bg-emerald-100 text-emerald-800"
      case "STAFF_MANAGEMENT":
        return "bg-violet-100 text-violet-800"
      case "FRANCHISE_MANAGEMENT":
        return "bg-cyan-100 text-cyan-800"
      case "REPORTING_ANALYTICS":
        return "bg-amber-100 text-amber-800"
      case "SYSTEM_NOTIFICATIONS":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const removeEmojis = (text: string) => {
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        "",
      )
      .trim()
  }

  const exportAllTemplates = () => {
    let content = `SAFAWALA CRM - WhatsApp Templates for WATI Approval\n`
    content += `Generated on: ${new Date().toLocaleString()}\n`
    content += `Total Templates: ${SAFAWALA_TEMPLATES.length}\n`
    content += `${"=".repeat(60)}\n\n`

    SAFAWALA_TEMPLATES.forEach((template, index) => {
      content += `${index + 1}. TEMPLATE NAME: ${template.name}\n`
      content += `   Category: ${template.category.replace(/_/g, " ")}\n`
      content += `   Language: ${template.language}\n`
      content += `   Description: ${template.description}\n`
      content += `   Status: ${templateStatuses[template.name] || template.status}\n`
      content += `   ${"-".repeat(40)}\n`

      template.components.forEach((component, compIndex) => {
        content += `   Component ${compIndex + 1}: ${component.type}\n`
        if (component.format) content += `   Format: ${component.format}\n`
        if (component.text) {
          const text = component.type === "HEADER" ? removeEmojis(component.text) : component.text
          content += `   Text: ${text}\n`
        }
        if (component.example) {
          content += `   Example: ${JSON.stringify(component.example)}\n`
        }
        if (component.buttons) {
          content += `   Buttons:\n`
          component.buttons.forEach((button, btnIndex) => {
            content += `     ${btnIndex + 1}. ${button.text} (${button.type})\n`
            if (button.url) content += `        URL: ${button.url}\n`
          })
        }
        content += `\n`
      })

      content += `   JSON Format for WATI:\n`
      content += `   ${templateManager.generateSubmissionFormat(template.name)}\n`
      content += `\n${"=".repeat(60)}\n\n`
    })

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `safawala-wati-templates-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: `Downloaded ${SAFAWALA_TEMPLATES.length} templates as document file.`,
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/integrations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Integrations
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">WATI Templates</h1>
            <p className="text-muted-foreground">Manage WhatsApp message templates for your CRM</p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportAllTemplates} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button onClick={fetchTemplateStatuses} disabled={loadingStatuses} variant="outline">
            {loadingStatuses ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Sync Status
          </Button>
          <Button
            onClick={() => window.open("https://live.wati.io/481455/messageTemplate", "_blank")}
            className="bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Create in WATI
          </Button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">📋 Template Submission Process</h4>
        <p className="text-sm text-blue-700">
          WATI requires manual template creation through their dashboard. Use the "Export All" button to download all
          templates, then copy and paste them into WATI's template creation interface. Templates will sync back to your
          CRM once approved.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          All Templates ({SAFAWALA_TEMPLATES.length})
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category.replace(/_/g, " ")} ({templatesByCategory[category].length})
          </Button>
        ))}
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="submission">Submission Guide</TabsTrigger>
          <TabsTrigger value="categories">Categories Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg capitalize">{template.name.replace(/_/g, " ")}</CardTitle>
                    {getStatusBadge(template.name, template.status)}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline">{template.language.toUpperCase()}</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTemplate(template)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        copyToClipboard(templateManager.generateSubmissionFormat(template.name), template.name)
                      }
                      disabled={copying === template.name}
                    >
                      {copying === template.name ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{category.replace(/_/g, " ")}</span>
                    <Badge className={getCategoryColor(category)}>{templatesByCategory[category].length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {category === "CUSTOMER_MANAGEMENT" && "Templates for customer interactions and updates"}
                    {category === "BOOKING_SYSTEM" && "Templates for booking confirmations and updates"}
                    {category === "INVENTORY_MANAGEMENT" && "Templates for stock alerts and inventory updates"}
                    {category === "QUOTE_SYSTEM" && "Templates for quote generation and follow-ups"}
                    {category === "FINANCIAL_MANAGEMENT" && "Templates for payments and financial notifications"}
                    {category === "STAFF_MANAGEMENT" && "Templates for staff tasks and management"}
                    {category === "FRANCHISE_MANAGEMENT" && "Templates for franchise operations"}
                    {category === "REPORTING_ANALYTICS" && "Templates for reports and analytics"}
                    {category === "SYSTEM_NOTIFICATIONS" && "Templates for system alerts and updates"}
                    {category === "UTILITY" && "General utility templates"}
                    {category === "MARKETING" && "Marketing and promotional templates"}
                    {category === "AUTHENTICATION" && "Authentication and security templates"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory(category)} className="w-full">
                    View {templatesByCategory[category].length} Templates
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Submit Templates for Approval</CardTitle>
              <CardDescription>Follow these steps to submit your templates to WhatsApp for approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Export Templates</h4>
                    <p className="text-sm text-muted-foreground">
                      Click "Export All" to download all templates in a formatted document
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Open WATI Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Click "Create in WATI" to go directly to WATI's template creation page
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Create Templates Manually</h4>
                    <p className="text-sm text-muted-foreground">
                      Copy template content from the exported file and create each template in WATI
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Submit for Approval</h4>
                    <p className="text-sm text-muted-foreground">
                      Submit templates for WhatsApp approval (usually takes 24-48 hours)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">
                    5
                  </div>
                  <div>
                    <h4 className="font-medium">Sync Status</h4>
                    <p className="text-sm text-muted-foreground">
                      Use "Sync Status" button to update approval status in your CRM
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• WATI doesn't support programmatic template creation via API</li>
                  <li>• Templates must be created manually in WATI dashboard</li>
                  <li>• Approval process typically takes 24-48 hours</li>
                  <li>• Use exact parameter format as shown in templates</li>
                  <li>• UTILITY category templates have higher approval rates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="capitalize">{selectedTemplate.name.replace(/_/g, " ")}</CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-xs font-medium text-blue-800 mb-1">WATI Template Name:</div>
                    <div className="font-mono text-sm text-blue-900 bg-white px-2 py-1 rounded border">
                      {selectedTemplate.name}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedTemplate.name, selectedTemplate.status)}
                <Badge className={getCategoryColor(selectedTemplate.category)}>
                  {selectedTemplate.category.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="space-y-3">
                {selectedTemplate.components.map((component, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium text-sm text-muted-foreground">
                        {component.type}
                        {component.format && ` (${component.format})`}
                      </div>
                      {component.text && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyComponentContent(
                              component.type === "HEADER" ? removeEmojis(component.text!) : component.text!,
                              component.type,
                            )
                          }
                          disabled={copying?.startsWith(`${component.type}-`)}
                          className="h-6 px-2"
                        >
                          {copying?.startsWith(`${component.type}-`) ? (
                            <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent mr-2" />
                          ) : (
                            <Copy className="w-3 h-3 mr-2" />
                          )}
                        </Button>
                      )}
                    </div>
                    {component.text && (
                      <div className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">
                        {component.type === "HEADER" ? removeEmojis(component.text) : component.text}
                      </div>
                    )}
                    {component.buttons && (
                      <div className="mt-2 space-y-1">
                        {component.buttons.map((button, btnIndex) => (
                          <div
                            key={btnIndex}
                            className="text-sm bg-blue-50 p-2 rounded flex justify-between items-center"
                          >
                            <span>
                              {button.text} ({button.type})
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyComponentContent(button.text, `BUTTON-${btnIndex}`)}
                              className="h-5 px-1"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    copyToClipboard(
                      templateManager.generateSubmissionFormat(selectedTemplate.name),
                      selectedTemplate.name,
                    )
                  }
                  disabled={copying === selectedTemplate.name}
                  className="flex-1"
                >
                  {copying === selectedTemplate.name ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Copy for Submission
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
