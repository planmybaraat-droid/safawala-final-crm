/**
 * Example: PDF Design Selector Component
 * Drop this into your quotes page where you want the design selector
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Sparkles } from "lucide-react"
import { type PDFDesignType } from "@/lib/pdf/generate-quote-pdf"

interface PDFDesignSelectorProps {
  value: PDFDesignType
  onChange: (design: PDFDesignType) => void
  className?: string
}

export function PDFDesignSelector({ value, onChange, className }: PDFDesignSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || "w-[150px]"}>
        <SelectValue placeholder="PDF Design" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="classic">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Classic PDF</span>
          </div>
        </SelectItem>
        <SelectItem value="modern">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Modern PDF</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

// ============================================================================
// USAGE EXAMPLE IN QUOTES PAGE
// ============================================================================

/*

// 1. Add state to your component
const [pdfDesign, setPdfDesign] = useState<PDFDesignType>("classic")

// 2. Update handleDownloadPDF to use the selected design
const handleDownloadPDF = async (quote: Quote) => {
  try {
    const franchiseId = user?.franchise_id
    if (!franchiseId) {
      console.warn("[PDF Download] No franchise_id available")
    }
    
    await downloadQuotePDF(quote, franchiseId, pdfDesign)

    toast({
      title: "Success",
      description: `Quote PDF (${pdfDesign}) downloaded successfully`,
    })
  } catch (error) {
    console.error("Error downloading PDF:", error)
    toast({
      title: "Error",
      description: "Failed to download quote PDF. Please try again.",
      variant: "destructive",
    })
  }
}

// 3. Add the selector to your UI (example placements):

// Option A: In the page header next to "New Quote" button
<div className="flex items-center gap-2">
  <PDFDesignSelector value={pdfDesign} onChange={setPdfDesign} />
  <Button onClick={() => router.push("/quotes/create")}>
    <Plus className="mr-2 h-4 w-4" />
    New Quote
  </Button>
</div>

// Option B: In the quote detail dialog actions
<div className="flex items-center gap-2">
  <PDFDesignSelector value={pdfDesign} onChange={setPdfDesign} className="w-[130px]" />
  <Button onClick={() => handleDownloadPDF(selectedQuote)}>
    <Download className="mr-2 h-4 w-4" />
    Download
  </Button>
</div>

// Option C: In the table row actions dropdown
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
    <Eye className="mr-2 h-4 w-4" />
    View Details
  </DropdownMenuItem>
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Download className="mr-2 h-4 w-4" />
      Download PDF
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuItem onClick={() => {
        setPdfDesign("classic")
        handleDownloadPDF(quote)
      }}>
        <FileText className="mr-2 h-4 w-4" />
        Classic Design
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => {
        setPdfDesign("modern")
        handleDownloadPDF(quote)
      }}>
        <Sparkles className="mr-2 h-4 w-4" />
        Modern Design
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
</DropdownMenuContent>

*/
