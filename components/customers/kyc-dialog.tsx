"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  Copy, 
  ShieldAlert, 
  FileImage,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { uploadWithProgress } from "@/lib/upload-with-progress"
import Tesseract from "tesseract.js"

interface KYCDocuments {
  aadhar_front?: string
  aadhar_back?: string
  passport?: string
  passport_expiry?: string
}

interface KYCDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: any
  onKYCUpdated?: (updatedCustomer: any) => void
}

export function KYCDialog({
  open,
  onOpenChange,
  customer,
  onKYCUpdated
}: KYCDialogProps) {
  const [loading, setLoading] = useState(false)
  const [kycStatus, setKycStatus] = useState<'pending' | 'submitted' | 'verified' | 'rejected'>('pending')
  const [aadharNumber, setAadharNumber] = useState("")
  const [kycNotes, setKycNotes] = useState("")
  
  // Resident selection states
  const [residentType, setResidentType] = useState<'national' | 'international'>('national')
  const [passportNumber, setPassportNumber] = useState("")
  const [passportCountry, setPassportCountry] = useState("")
  const [passportExpiry, setPassportExpiry] = useState("")

  // Document uploads state
  const [documents, setDocuments] = useState<KYCDocuments>({})
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({})
  
  // OCR state
  const [ocrLoading, setOcrLoading] = useState<{ [key: string]: boolean }>({})
  const [ocrResult, setOcrResult] = useState<{ [key: string]: { success: boolean; message: string } }>({})

  // Sandbox Aadhaar OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [verifiedDetails, setVerifiedDetails] = useState<any>(null)

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSendOTP = async () => {
    if (!customer?.phone) {
      toast.error("Customer phone number is required to send OTP")
      return
    }

    if (!aadharNumber || !/^\d{12}$/.test(aadharNumber.trim())) {
      toast.error("Please enter a valid 12-digit Aadhaar number first")
      return
    }

    setIsSendingOtp(true)
    try {
      const res = await fetch("/api/kyc/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          aadharNumber: aadharNumber.trim()
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to send OTP")

      setOtpSent(true)
      setCooldown(60) // 60 seconds cooldown
      toast.success("Aadhaar OTP sent successfully to your registered mobile number!")
    } catch (err: any) {
      console.error("[Aadhaar OTP Send Error]:", err)
      toast.error(err.message || "Failed to trigger Aadhaar verification code")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the 6-digit verification code")
      return
    }

    setIsVerifyingOtp(true)
    try {
      const res = await fetch("/api/kyc/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customer.phone,
          code: otpCode.trim()
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to verify Aadhaar")

      if (result.success) {
        setOtpVerified(true)
        setKycStatus('verified') // Auto-select Verified status
        
        if (result.data) {
          setVerifiedDetails(result.data)
          const loggedName = result.data.name || "N/A"
          const loggedDob = result.data.date_of_birth || "N/A"
          const auditText = `\n[Auto-logged] Aadhaar Verified via Sandbox. Name: ${loggedName}, DOB: ${loggedDob}`
          setKycNotes(prev => prev ? `${prev}${auditText}` : auditText.trim())
        }
        
        toast.success("Aadhaar OTP verified successfully via Sandbox!")
      } else {
        toast.error(result.error || "Invalid verification code")
      }
    } catch (err: any) {
      console.error("[Aadhaar OTP Verify Error]:", err)
      toast.error(err.message || "Verification failed")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Initialize fields on open
  useEffect(() => {
    if (customer && open) {
      setKycStatus(customer.kyc_status || 'pending')
      setKycNotes(customer.kyc_notes || "")
      
      const aadhar = customer.aadhar_number || ""
      const isIntl = aadhar && !/^\d{12}$/.test(aadhar.trim())
      
      if (isIntl) {
        setResidentType('international')
        setPassportNumber(aadhar)
        setPassportCountry(customer.pan_number || "")
        setAadharNumber("")
      } else {
        setResidentType('national')
        setAadharNumber(aadhar)
        setPassportNumber("")
        setPassportCountry("")
      }
      
      // Parse documents
      if (customer.kyc_document_url) {
        try {
          const docs = JSON.parse(customer.kyc_document_url)
          if (docs && (docs.aadhar_front || docs.aadhar_back || docs.passport)) {
            setDocuments(docs)
            if (docs.passport_expiry) {
              setPassportExpiry(docs.passport_expiry)
            } else {
              setPassportExpiry("")
            }
          } else {
            // Backward compatibility for single URL string
            setDocuments({ aadhar_front: customer.kyc_document_url })
            setPassportExpiry("")
          }
        } catch {
          setDocuments({ aadhar_front: customer.kyc_document_url })
          setPassportExpiry("")
        }
      } else {
        setDocuments({})
        setPassportExpiry("")
      }

      // Reset progress/OCR alerts
      setUploadProgress({})
      setIsUploading({})
      setOcrLoading({})
      setOcrResult({})

      // Reset Sandbox states
      setOtpSent(false)
      setOtpCode("")
      setOtpVerified(customer.kyc_status === 'verified')
      setCooldown(0)
      setVerifiedDetails(null)
    }
  }, [customer, open])

  // Helper to preprocess image for OCR (Scale 2x + Grayscale or Threshold Binarization)
  const preprocessVersion = (file: File, mode: 'grayscale' | 'threshold', thresholdVal = 120): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              resolve(file)
              return
            }

            // Scale up by 2x to make text larger and clearer for Tesseract
            const scale = 2
            canvas.width = img.width * scale
            canvas.height = img.height * scale

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imgData.data

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const gray = 0.299 * r + 0.587 * g + 0.114 * b

              let val = gray
              if (mode === 'threshold') {
                val = gray > thresholdVal ? 255 : 0
              }

              data[i] = val
              data[i + 1] = val
              data[i + 2] = val
            }
            
            ctx.putImageData(imgData, 0, 0)
            
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob)
              } else {
                resolve(file)
              }
            }, file.type || "image/jpeg", 0.95)
          } catch (err) {
            console.warn("[OCR Preprocess] Error preprocessing image version:", err)
            resolve(file)
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // Verhoeff checksum lookup tables
  const VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ]

  const VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ]

  const validateVerhoeff = (numStr: string): boolean => {
    if (numStr.length !== 12 || !/^\d{12}$/.test(numStr)) return false
    
    // First digit of a valid Aadhaar cannot be 0 or 1
    if (numStr[0] === "0" || numStr[0] === "1") return false
    
    let c = 0
    const reversed = numStr.split("").reverse().map(Number)
    for (let i = 0; i < 12; i++) {
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]]
    }
    return c === 0
  }

  const cleanLookalikes = (str: string): string => {
    return str
      .replace(/[oO]/g, "0")
      .replace(/[iIl|!\/]/g, "1")
      .replace(/[zZ]/g, "2")
      .replace(/[sS]/g, "5")
      .replace(/[bB]/g, "8")
      .replace(/[gG]/g, "9")
      .replace(/[^0-9]/g, "")
  }

  // Regex extractors with OCR error recovery
  const extractAadhaarNumber = (text: string): string | null => {
    console.log("[Aadhaar OCR Parser] Analyzing text for valid 12-digit Aadhaar pattern...")

    // 1. Check for standard 4-4-4 structures (space or hyphen, allowing lookalikes)
    const spacedOrHyphenRegex = /\b[0-9oOiIl|!zZsSbBgG]{4}[\s-][0-9oOiIl|!zZsSbBgG]{4}[\s-][0-9oOiIl|!zZsSbBgG]{4}\b/g
    const matches = text.match(spacedOrHyphenRegex) || []
    
    for (const match of matches) {
      const cleaned = cleanLookalikes(match)
      if (validateVerhoeff(cleaned)) {
        console.log(`[Aadhaar OCR] Found valid Aadhaar via 4-4-4 pattern: ${cleaned}`)
        return cleaned
      }
    }

    // 2. Check for 12 consecutive digits/lookalikes
    const consecutiveRegex = /\b[0-9oOiIl|!zZsSbBgG]{12}\b/g
    const consecutiveMatches = text.match(consecutiveRegex) || []
    for (const match of consecutiveMatches) {
      const cleaned = cleanLookalikes(match)
      if (validateVerhoeff(cleaned)) {
        console.log(`[Aadhaar OCR] Found valid Aadhaar via 12-consecutive pattern: ${cleaned}`)
        return cleaned
      }
    }

    // 3. Sliding window over all numeric/lookalike chunks (useful if space recognition is broken/uneven)
    const words = text.split(/\s+/)
    let globalClean = ""
    for (const word of words) {
      if (/[0-9oOiIl|!zZsSbBgG]/.test(word)) {
        globalClean += cleanLookalikes(word)
      }
    }

    for (let i = 0; i <= globalClean.length - 12; i++) {
      const candidate = globalClean.substring(i, i + 12)
      if (validateVerhoeff(candidate)) {
        console.log(`[Aadhaar OCR] Found valid Aadhaar via global sliding window: ${candidate}`)
        return candidate
      }
    }

    // 4. Ultimate Fallback: Just look for any 12-digit sequence in digits only, even if it fails Verhoeff
    const digitsOnly = text.replace(/[^0-9]/g, "")
    const match = digitsOnly.match(/\d{12}/)
    if (match) {
      console.warn(`[Aadhaar OCR Warning] Found 12-digit candidate ${match[0]} but it failed Verhoeff verification. Using as fallback.`)
      return match[0]
    }

    return null
  }

  // Passport info extraction helper
  const extractPassportDetails = (text: string) => {
    const lines = text.split('\n').map(line => line.trim().toUpperCase());
    
    let passportNum: string | null = null;
    let country: string | null = null;
    let expiry: string | null = null;

    // Search for passport number labeled in text
    const labelRegex = /(?:PASSPORT|DOC|DOCUMENT)\s*(?:NO|NUMBER|NUM)?\s*[:\-\s]+([A-Z0-9]{8,12})/i;
    const labelMatch = text.match(labelRegex);
    if (labelMatch) {
      passportNum = labelMatch[1].replace(/</g, "").trim();
    }

    // Check for MRZ lines
    const mrzLines = lines.filter(l => l.includes('<') && l.length >= 30);
    
    let mrzLine1 = mrzLines.find(l => l.startsWith('P<') || l.startsWith('P1') || l.startsWith('PO') || l.startsWith('P0'));
    let mrzLine2 = mrzLines.find(l => {
      return !l.startsWith('P<') && !l.startsWith('P1') && l.match(/[A-Z0-9<]{9}\d[A-Z<]{3}\d{6}/);
    });

    if (mrzLine1) {
      const countryCode = mrzLine1.substring(2, 5).replace(/</g, "").trim();
      if (countryCode && countryCode.length === 3) {
        country = countryCode;
      }
    }

    if (mrzLine2) {
      if (!passportNum) {
        passportNum = mrzLine2.substring(0, 9).replace(/</g, "").trim();
      }
      
      const expiryRaw = mrzLine2.substring(21, 27);
      if (/^\d{6}$/.test(expiryRaw)) {
        const yy = expiryRaw.substring(0, 2);
        const mm = expiryRaw.substring(2, 4);
        const dd = expiryRaw.substring(4, 6);
        expiry = `20${yy}-${mm}-${dd}`;
      }

      if (!country) {
        const natCode = mrzLine2.substring(10, 13).replace(/</g, "").trim();
        if (natCode && natCode.length === 3) {
          country = natCode;
        }
      }
    }

    // Fallbacks
    if (!passportNum) {
      const genericMatch = text.match(/\b([A-Z][0-9]{7,8})\b/i);
      if (genericMatch) {
        passportNum = genericMatch[1].toUpperCase();
      }
    }

    if (!expiry) {
      const expiryRegex = /(?:EXPIRY|EXP|VAL|VALID)\s*(?:DATE|UNTIL)?\s*[:\-\s]+(\d{2}[/\-.]\d{2}[/\-.]\d{4})/i;
      const expiryMatch = text.match(expiryRegex);
      if (expiryMatch) {
        const dateStr = expiryMatch[1].replace(/[./]/g, "-");
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            expiry = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
          } else if (parts[0].length === 4) {
            expiry = `${parts[0]}-${parts[1]}-${parts[2]}`; // YYYY-MM-DD
          }
        }
      }
    }

    return { passportNum, country, expiry };
  }

  // Upload file helper
  const handleFileUpload = async (key: keyof KYCDocuments, file: File) => {
    if (!file) return

    setIsUploading(prev => ({ ...prev, [key]: true }))
    setUploadProgress(prev => ({ ...prev, [key]: 0 }))
    setOcrResult(prev => ({ ...prev, [key]: { success: false, message: "" } }))

    try {
      // 1. Upload to Supabase Storage via our upload API
      const result = await uploadWithProgress(file, { folder: "kyc" }, (loaded, total) => {
        const percent = Math.round((loaded / total) * 100)
        setUploadProgress(prev => ({ ...prev, [key]: percent }))
      })

      if (!result?.url) throw new Error("Upload response did not contain public URL")

      // Update documents state
      setDocuments(prev => {
        const updated = { ...prev, [key]: result.url }
        // Update KYC status automatically to 'submitted' if a document is uploaded and it's 'pending'
        if (kycStatus === 'pending') {
          setKycStatus('submitted')
        }
        return updated
      })

      const docLabel = key === 'aadhar_front'
        ? 'Aadhaar Front'
        : key === 'aadhar_back'
          ? 'Aadhaar Back'
          : 'Passport'
      toast.success(`${docLabel} uploaded successfully.`)

      // 2. Perform multi-pass client-side OCR analysis (3 preprocessed versions in parallel)
      if (file.type.startsWith("image/")) {
        setOcrLoading(prev => ({ ...prev, [key]: true }))
        
        let clientSuccess = false
        
        try {
          console.log("[OCR Consensus Engine] Preprocessing 3 versions of the document image in parallel...")
          const [img1, img2, img3] = await Promise.all([
            preprocessVersion(file, 'grayscale'),
            preprocessVersion(file, 'threshold', 105),
            preprocessVersion(file, 'threshold', 135)
          ])

          console.log("[OCR Consensus Engine] Executing 3 parallel OCR passes...")
          const [res1, res2, res3] = await Promise.all([
            Tesseract.recognize(img1, 'eng'),
            Tesseract.recognize(img2, 'eng'),
            Tesseract.recognize(img3, 'eng')
          ])

          const text1 = res1?.data?.text || ""
          const text2 = res2?.data?.text || ""
          const text3 = res3?.data?.text || ""

          console.log("[OCR Pass 1 Text]:", text1)
          console.log("[OCR Pass 2 Text]:", text2)
          console.log("[OCR Pass 3 Text]:", text3)

          if (key === 'aadhar_front' || key === 'aadhar_back') {
            const parsed1 = extractAadhaarNumber(text1)
            const parsed2 = extractAadhaarNumber(text2)
            const parsed3 = extractAadhaarNumber(text3)

            console.log("[OCR Aadhaar Candidates]:", { pass1: parsed1, pass2: parsed2, pass3: parsed3 })

            const votes: { [num: string]: { count: number; verified: boolean } } = {}
            const addVote = (num: string | null) => {
              if (!num) return
              if (votes[num]) {
                votes[num].count++
                votes[num].verified = true
              } else {
                votes[num] = { count: 1, verified: true }
              }
            }

            addVote(parsed1)
            addVote(parsed2)
            addVote(parsed3)

            let bestNum: string | null = null
            let bestCount = 0
            let isVerified = false

            for (const num in votes) {
              const vote = votes[num]
              if (
                vote.count > bestCount || 
                (vote.count === bestCount && vote.verified && !isVerified)
              ) {
                bestNum = num
                bestCount = vote.count
                isVerified = vote.verified
              }
            }

            if (bestNum) {
              clientSuccess = true
              setAadharNumber(bestNum)
              const formatted = bestNum.replace(/(\d{4})/g, '$1 ').trim()
              setOcrResult(prev => ({
                ...prev,
                [key]: { 
                  success: isVerified, 
                  message: `Consensus Aadhaar: ${formatted} (${bestCount}/3 scans agreed${isVerified ? ', Verified Checksum' : ''})`
                }
              }))
              if (isVerified) {
                toast.success(`Aadhaar number detected and verified!`)
              } else {
                toast.warning(`Aadhaar number detected but failed checksum verification. Please confirm digits.`)
              }
            }
          } else if (key === 'passport') {
            const parsed1 = extractPassportDetails(text1)
            const parsed2 = extractPassportDetails(text2)
            const parsed3 = extractPassportDetails(text3)

            console.log("[OCR Passport Candidates]:", { pass1: parsed1, pass2: parsed2, pass3: parsed3 })

            const votes: { [num: string]: { count: number; country: string | null; expiry: string | null } } = {}
            const addVote = (candidate: { passportNum: string | null; country: string | null; expiry: string | null }) => {
              if (!candidate.passportNum) return
              const num = candidate.passportNum
              if (votes[num]) {
                votes[num].count++
                if (!votes[num].country && candidate.country) votes[num].country = candidate.country
                if (!votes[num].expiry && candidate.expiry) votes[num].expiry = candidate.expiry
              } else {
                votes[num] = { count: 1, country: candidate.country, expiry: candidate.expiry }
              }
            }

            addVote(parsed1)
            addVote(parsed2)
            addVote(parsed3)

            let bestNum: string | null = null
            let bestCount = 0
            let bestCountry: string | null = null
            let bestExpiry: string | null = null

            for (const num in votes) {
              const vote = votes[num]
              if (vote.count > bestCount) {
                bestNum = num
                bestCount = vote.count
                bestCountry = vote.country
                bestExpiry = vote.expiry
              }
            }

            if (bestNum) {
              clientSuccess = true
              setPassportNumber(bestNum)
              if (bestCountry) setPassportCountry(bestCountry)
              if (bestExpiry) setPassportExpiry(bestExpiry)

              const details = [
                `Passport: ${bestNum}`,
                bestCountry ? `Country: ${bestCountry}` : null,
                bestExpiry ? `Expiry: ${bestExpiry}` : null
              ].filter(Boolean).join(", ")

              setOcrResult(prev => ({
                ...prev,
                [key]: { success: true, message: `Consensus Passport: ${details} (${bestCount}/3 scans agreed)` }
              }))
              toast.success(`Passport details auto-filled via consensus scan!`)
            }
          }
        } catch (ocrErr) {
          console.warn("[OCR Consensus Error] Parallel client-side OCR failed, trying server-side fallback:", ocrErr)
        }

        // If client-side failed to extract the target data, trigger the backend API OCR fallback!
        if (!clientSuccess) {
          console.log(`[OCR Fallback] Triggering backend server-side OCR fallback for url: ${result.url}`)
          try {
            const res = await fetch("/api/kyc/read-document", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: result.url,
                docType: key === 'passport' ? 'passport' : 'aadhaar'
              })
            })

            if (res.ok) {
              const ocrData = await res.json()
              if (ocrData.success && ocrData.data) {
                if (key === 'aadhar_front' || key === 'aadhar_back') {
                  const val = ocrData.data.aadharNumber
                  const isVerified = ocrData.data.isVerified
                  setAadharNumber(val)
                  const formatted = val.replace(/(\d{4})/g, '$1 ').trim()
                  setOcrResult(prev => ({
                    ...prev,
                    [key]: { 
                      success: isVerified, 
                      message: isVerified
                        ? `Detected Aadhaar: ${formatted} (Server-side Verified Checksum)` 
                        : `Detected Aadhaar: ${formatted} (Server-side Checksum Failed)`
                    }
                  }))
                  toast.success(`Aadhaar number detected via server-side OCR fallback!`)
                } else if (key === 'passport') {
                  const { passportNumber: pn, country: pc, expiry: pe } = ocrData.data
                  if (pn) setPassportNumber(pn)
                  if (pc) setPassportCountry(pc)
                  if (pe) setPassportExpiry(pe)
                  
                  const details = [
                    `Passport: ${pn}`,
                    pc ? `Country: ${pc}` : null,
                    pe ? `Expiry: ${pe}` : null
                  ].filter(Boolean).join(", ")
                  
                  setOcrResult(prev => ({
                    ...prev,
                    [key]: { success: true, message: `Detected (Server OCR) - ${details}` }
                  }))
                  toast.success(`Passport details detected via server-side OCR fallback!`)
                }
              } else {
                setOcrResult(prev => ({
                  ...prev,
                  [key]: { success: false, message: "Aadhaar number not detected. Please verify or enter manually." }
                }))
              }
            } else {
              throw new Error(`Server responded with status ${res.status}`)
            }
          } catch (fallbackErr: any) {
            console.error("[OCR Fallback Error] Server-side fallback failed:", fallbackErr)
            setOcrResult(prev => ({
              ...prev,
              [key]: { success: false, message: "OCR scan failed on both client and server. Please enter manually." }
            }))
          } finally {
            setOcrLoading(prev => ({ ...prev, [key]: false }))
          }
        } else {
          setOcrLoading(prev => ({ ...prev, [key]: false }))
        }
      }

    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error(err.message || "File upload failed")
    } finally {
      setIsUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  // Copy to clipboard & Open UIDAI
  const handleVerifyOnUIDAI = () => {
    if (!aadharNumber || aadharNumber.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number first")
      return
    }

    navigator.clipboard.writeText(aadharNumber)
    toast.success("Aadhaar number copied to clipboard!")
    
    // Open UIDAI portal in new window
    window.open("https://myaadhaar.uidai.gov.in/verifyAadhaar", "_blank")
  }

  // Save KYC Info
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validations
    if (residentType === 'national') {
      if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
        toast.error("Aadhaar Number must be exactly 12 digits")
        return
      }
    } else {
      if (!passportNumber.trim()) {
        toast.error("Passport Number is required for international residents")
        return
      }
      if (!passportCountry.trim()) {
        toast.error("Issuing Country is required for international residents")
        return
      }
    }

    setLoading(true)
    try {
      let payload: any = {}
      if (residentType === 'national') {
        payload = {
          kyc_status: kycStatus,
          aadhar_number: aadharNumber || null,
          pan_number: null,
          kyc_document_url: Object.keys(documents).length > 0 ? JSON.stringify({
            aadhar_front: documents.aadhar_front || null,
            aadhar_back: documents.aadhar_back || null
          }) : null,
          kyc_notes: kycNotes || null
        }
      } else {
        payload = {
          kyc_status: kycStatus,
          aadhar_number: passportNumber || null,
          pan_number: passportCountry || null,
          kyc_document_url: JSON.stringify({
            passport: documents.passport || null,
            passport_expiry: passportExpiry || null
          }),
          kyc_notes: kycNotes || null
        }
      }

      console.log(`[KYC Dialog] Saving payload for customer ${customer.id}:`, payload)

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update" }))
        throw new Error(errorData.error || "Update request failed")
      }

      const result = await response.json()
      if (!result.success || !result.data) {
        throw new Error(result.error || "Invalid response schema")
      }

      toast.success("KYC details saved successfully!")
      if (onKYCUpdated) {
        onKYCUpdated(result.data)
      }
      onOpenChange(false)
    } catch (err: any) {
      console.error("Save KYC error:", err)
      toast.error(err.message || "Failed to save KYC details")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-100 rounded-2xl shadow-xl">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer KYC Verification</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase">
              {customer?.customer_code || 'No Code'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Review KYC documents, extract document numbers, and update the status for <strong>{customer?.name}</strong> (+{customer?.phone}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Status Selection */}
          <div className="grid grid-cols-2 gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                KYC Status
              </Label>
              <Select 
                value={kycStatus} 
                onValueChange={(val: any) => setKycStatus(val)}
              >
                <SelectTrigger className="bg-white border-slate-200 h-9 text-sm focus:ring-1 focus:ring-slate-400 rounded-lg">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-lg">
                  <SelectItem value="pending">🟡 Pending Verification</SelectItem>
                  <SelectItem value="submitted">🔵 Documents Submitted</SelectItem>
                  <SelectItem value="verified">🟢 Verified / Approved</SelectItem>
                  <SelectItem value="rejected">🔴 Rejected / Action Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-right text-xs text-slate-400 mt-5">
              Linked Lead ID: {customer?.lead_id ? "✅ Connected" : "❌ Manual Profile"}
            </div>
          </div>

          {/* Resident Type Tabs */}
          <div className="flex p-1 bg-slate-100/80 rounded-xl max-w-md border border-slate-200/50">
            <button
              type="button"
              onClick={() => setResidentType('national')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                residentType === 'national'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🇮🇳 National (Aadhaar)
            </button>
            <button
              type="button"
              onClick={() => setResidentType('international')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                residentType === 'international'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🌐 International (Passport)
            </button>
          </div>

          {residentType === 'national' ? (
            <>
              {/* Sandbox Aadhaar OTP Verification */}
              <div className="border border-slate-100 bg-slate-50/20 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-indigo-500" />
                    Aadhaar OTP Verification (via Sandbox.co.in)
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {aadharNumber ? `${aadharNumber.replace(/(\d{4})/g, '$1 ').trim()}` : "Enter 12-digit Aadhaar first"}
                  </span>
                </div>

                {otpVerified ? (
                  <div className="bg-emerald-50 text-emerald-800 text-xs p-4 rounded-lg border border-emerald-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <strong>Aadhaar Verified Successfully via Sandbox!</strong>
                    </div>
                    
                    {verifiedDetails && (
                      <div className="mt-2 pl-7 space-y-1 text-slate-700 text-[11px] border-l border-emerald-200">
                        <p><strong>Name on Aadhaar:</strong> {verifiedDetails.name || "N/A"}</p>
                        <p><strong>DOB / Gender:</strong> {verifiedDetails.date_of_birth || "N/A"} / {verifiedDetails.gender || "N/A"}</p>
                        {verifiedDetails.address && (
                          <p>
                            <strong>Address:</strong> {
                              [
                                verifiedDetails.address.house,
                                verifiedDetails.address.street,
                                verifiedDetails.address.district,
                                verifiedDetails.address.state,
                                verifiedDetails.address.pincode
                              ].filter(Boolean).join(", ")
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] text-slate-500 max-w-[360px]">
                        UIDAI will automatically send a secure verification OTP to the mobile number registered under this Aadhaar card.
                      </span>

                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={isSendingOtp || cooldown > 0 || !aadharNumber || aadharNumber.trim().length !== 12}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3 rounded-md text-xs font-semibold shrink-0"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Send Aadhaar OTP"}
                      </Button>
                    </div>

                    {otpSent && (
                      <div className="flex items-end gap-3 bg-white p-3 rounded-lg border border-slate-100">
                        <div className="space-y-1.5 flex-1">
                          <Label htmlFor="otpCode" className="text-[10px] font-semibold text-slate-500 uppercase">
                            6-Digit Aadhaar Verification OTP
                          </Label>
                          <Input
                            id="otpCode"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit OTP code"
                            maxLength={6}
                            className="h-8 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-md text-xs font-mono tracking-widest text-center"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={isVerifyingOtp || otpCode.length !== 6}
                          className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-4 rounded-md text-xs font-semibold"
                        >
                          {isVerifyingOtp ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          Verify OTP
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Document Uploads Grid */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Identity Proof Documents (Upload to scan)
                </Label>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Aadhaar Front */}
                  <DocumentUploader
                    label="Aadhaar Card Front"
                    docKey="aadhar_front"
                    url={documents.aadhar_front}
                    progress={uploadProgress.aadhar_front}
                    isUploading={isUploading.aadhar_front}
                    ocrLoading={ocrLoading.aadhar_front}
                    ocrResult={ocrResult.aadhar_front}
                    onFileSelected={(file) => handleFileUpload("aadhar_front", file)}
                  />

                  {/* Aadhaar Back */}
                  <DocumentUploader
                    label="Aadhaar Card Back"
                    docKey="aadhar_back"
                    url={documents.aadhar_back}
                    progress={uploadProgress.aadhar_back}
                    isUploading={isUploading.aadhar_back}
                    ocrLoading={ocrLoading.aadhar_back}
                    ocrResult={ocrResult.aadhar_back}
                    onFileSelected={(file) => handleFileUpload("aadhar_back", file)}
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4">
                {/* Aadhaar No */}
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Aadhaar Card Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="aadharNumber"
                      value={aadharNumber}
                      onChange={(e) => setAadharNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
                      placeholder="12-digit Aadhaar Number"
                      className="h-9 pr-24 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleVerifyOnUIDAI}
                      disabled={!aadharNumber || aadharNumber.length !== 12}
                      className="absolute right-1 top-1 h-7 text-[10px] px-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Verify UIDAI</span>
                    </Button>
                  </div>
                  
                  {aadharNumber && aadharNumber.length === 12 && (
                    <div className="bg-emerald-50 text-[10px] text-emerald-800 p-2 rounded-md border border-emerald-100 flex items-start gap-1.5 mt-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        Aadhaar formatted: <strong>{aadharNumber.replace(/(\d{4})/g, '$1 ').trim()}</strong>.
                        <br />
                        Click <strong>Verify UIDAI</strong> to copy and load the portal for instant Captcha verification.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Passport Document Upload */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Passport Document (Upload to scan)
                </Label>
                <div className="grid grid-cols-1">
                  <DocumentUploader
                    label="Passport Info Page"
                    docKey="passport"
                    url={documents.passport}
                    progress={uploadProgress.passport}
                    isUploading={isUploading.passport}
                    ocrLoading={ocrLoading.passport}
                    ocrResult={ocrResult.passport}
                    onFileSelected={(file) => handleFileUpload("passport", file)}
                  />
                </div>
              </div>

              {/* Passport Details Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                {/* Passport Number */}
                <div className="space-y-2">
                  <Label htmlFor="passportNumber" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Passport Number
                  </Label>
                  <Input
                    id="passportNumber"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                    placeholder="Passport Number"
                    className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
                  />
                </div>

                {/* Issuing Country */}
                <div className="space-y-2">
                  <Label htmlFor="passportCountry" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Issuing Country
                  </Label>
                  <Input
                    id="passportCountry"
                    value={passportCountry}
                    onChange={(e) => setPassportCountry(e.target.value.toUpperCase())}
                    placeholder="Country Code (e.g. USA, IND)"
                    className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="passportExpiry" className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Expiry Date
                  </Label>
                  <Input
                    id="passportExpiry"
                    type="date"
                    value={passportExpiry}
                    onChange={(e) => setPassportExpiry(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Copy-Paste Text Fallback (Method 3) */}
          <div className="space-y-1.5 border-t border-slate-100 pt-4">
            <Label htmlFor="rawTextPaste" className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span>📋 Paste Document Text (Alternative)</span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">(Fast extract from PDF/Text)</span>
            </Label>
            <Input
              id="rawTextPaste"
              placeholder="Paste raw text here to extract details..."
              onChange={(e) => {
                const pasted = e.target.value
                if (pasted.trim()) {
                  if (residentType === 'national') {
                    const result = extractAadhaarNumber(pasted)
                    if (result) {
                      setAadharNumber(result)
                      toast.success(`Aadhaar number extracted from pasted text!`)
                    } else {
                      toast.error(`Could not find a 12-digit Aadhaar number in pasted text.`)
                    }
                  } else {
                    const detected = extractPassportDetails(pasted)
                    if (detected.passportNum) {
                      setPassportNumber(detected.passportNum)
                      if (detected.country) setPassportCountry(detected.country)
                      if (detected.expiry) setPassportExpiry(detected.expiry)
                      toast.success(`Passport details extracted from pasted text!`)
                    } else {
                      toast.error(`Could not find passport number in pasted text.`)
                    }
                  }
                }
              }}
              className="h-8 bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-md text-xs"
            />
          </div>

          {/* Audit Notes */}
          <div className="space-y-1.5 border-t border-slate-100 pt-4">
            <Label htmlFor="kycNotes" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verification Notes / Issues
            </Label>
            <Textarea
              id="kycNotes"
              value={kycNotes}
              onChange={(e) => setKycNotes(e.target.value)}
              placeholder="Record any details, e.g., missing name match, failed captcha checks, or rejected reasons."
              rows={3}
              className="bg-slate-50/50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 px-4 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <span>Save KYC Details</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DocumentUploaderProps {
  label: string
  docKey: string
  url?: string
  progress?: number
  isUploading?: boolean
  ocrLoading?: boolean
  ocrResult?: { success: boolean; message: string }
  onFileSelected: (file: File) => void
}

function DocumentUploader({
  label,
  docKey,
  url,
  progress = 0,
  isUploading = false,
  ocrLoading = false,
  ocrResult,
  onFileSelected
}: DocumentUploaderProps) {
  const triggerFileInput = () => {
    document.getElementById(`file-${docKey}`)?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-between text-center min-h-[180px] bg-slate-50/30 hover:bg-slate-50/70 transition-colors">
      <input
        type="file"
        id={`file-${docKey}`}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
      />
      
      <span className="text-xs font-semibold text-slate-700 block mb-2">{label}</span>
      
      {/* Dynamic State Display */}
      {isUploading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-4">
          <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
          <span className="text-[10px] text-slate-500 font-medium">Uploading: {progress}%</span>
          <div className="w-20 bg-slate-200 h-1 rounded-full overflow-hidden">
            <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : ocrLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-4">
          <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
          <span className="text-[10px] text-indigo-600 font-semibold animate-pulse">Scanning OCR Text...</span>
        </div>
      ) : url ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-2 w-full">
          {url.match(/\.(pdf)/i) ? (
            <div className="h-14 w-14 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <FileText className="h-8 w-8" />
            </div>
          ) : (
            <div className="relative group h-14 w-28 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={label} className="object-cover h-full w-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={triggerFileInput}
                  className="h-7 w-7 text-white hover:text-slate-200"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => window.open(url, "_blank")}
            className="text-[10px] h-4 text-slate-500 hover:text-slate-800 p-0 flex items-center gap-1"
          >
            <span>View Document</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <Button
            type="button"
            variant="outline"
            onClick={triggerFileInput}
            className="h-16 w-16 rounded-full border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-1 hover:border-slate-400 hover:bg-slate-50 group"
          >
            <Upload className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
            <span className="text-[9px] text-slate-400 font-semibold tracking-wide">Upload</span>
          </Button>
        </div>
      )}

      {/* OCR Scan Result Status */}
      {ocrResult?.message && (
        <div className={`mt-2 w-full p-1.5 rounded text-[9px] leading-tight flex items-start gap-1 text-left ${
          ocrResult.success 
            ? "bg-emerald-50/80 text-emerald-800 border border-emerald-100" 
            : "bg-amber-50/80 text-amber-800 border border-amber-100"
        }`}>
          {ocrResult.success ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium break-all">{ocrResult.message}</span>
        </div>
      )}
    </div>
  )
}
