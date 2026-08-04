import { toast } from "sonner"

interface PincodeData {
  PostOffice: Array<{
    Name: string
    Description: string | null
    BranchType: string
    DeliveryStatus: string
    Circle: string
    District: string
    Division: string
    Region: string
    Block: string
    State: string
    Country: string
    Pincode: string
  }>
  Message: string
  Status: string
}

// Simple in-memory cache for pincode lookups
const pincodeCache = new Map<string, { area: string; city: string; state: string }>()

// Fallback data for common cities if API fails or for testing
const fallbackPincodes: { [key: string]: { area: string; city: string; state: string } } = {
  "110001": { area: "Connaught Place", city: "New Delhi", state: "Delhi" },
  "400001": { area: "Fort", city: "Mumbai", state: "Maharashtra" },
  "560001": { area: "Bangalore GPO", city: "Bangalore", state: "Karnataka" },
  "600001": { area: "Chennai GPO", city: "Chennai", state: "Tamil Nadu" },
  "700001": { area: "Kolkata GPO", city: "Kolkata", state: "West Bengal" },
  "380001": { area: "Ahmedabad GPO", city: "Ahmedabad", state: "Gujarat" },
  "500001": { area: "Hyderabad GPO", city: "Hyderabad", state: "Telangana" },
  "141001": { area: "Ludhiana GPO", city: "Ludhiana", state: "Punjab" },
  "208001": { area: "Kanpur GPO", city: "Kanpur", state: "Uttar Pradesh" },
  "302001": { area: "Jaipur GPO", city: "Jaipur", state: "Rajasthan" },
  "411001": { area: "Pune GPO", city: "Pune", state: "Maharashtra" },
  "682001": { area: "Kochi GPO", city: "Kochi", state: "Kerala" },
  "781001": { area: "Guwahati GPO", city: "Guwahati", state: "Assam" },
  "800001": { area: "Patna GPO", city: "Patna", state: "Bihar" },
  "226001": { area: "Lucknow GPO", city: "Lucknow", state: "Uttar Pradesh" },
  "390001": { area: "Vadodara GPO", city: "Vadodara", state: "Gujarat" },
  "390011": { area: "Subhanpura", city: "Vadodara", state: "Gujarat" },
}

export async function lookupPincode(pincode: string, showToast: boolean = true): Promise<{ area: string; city: string; state: string } | null> {
  console.log("PincodeService.lookupPincode called with:", pincode)
  
  if (!/^\d{6}$/.test(pincode)) {
    console.log("Invalid pincode format:", pincode)
    return null // Not a valid 6-digit pincode
  }

  // Check cache first
  if (pincodeCache.has(pincode)) {
    console.log("Returning cached result for:", pincode)
    return pincodeCache.get(pincode)!
  }

  console.log("Attempting API lookup for:", pincode)

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const data: PincodeData[] = await response.json()

    if (data && data.length > 0 && data[0].Status === "Success" && data[0].PostOffice.length > 0) {
      const postOffice = data[0].PostOffice[0]
      const result = {
        area: postOffice.Name,
        city: postOffice.District,
        state: postOffice.State,
      }
      pincodeCache.set(pincode, result) // Cache the result
      if (showToast) {
        toast.success(`Location auto-filled: ${result.area}, ${result.city}, ${result.state}`)
      }
      return result
    } else {
      // Fallback to local data if API returns no success or no post office
      console.log("API lookup failed, checking fallback data for:", pincode)
      const fallback = fallbackPincodes[pincode]
      console.log("Fallback result:", fallback)
      if (fallback) {
        if (showToast) {
          toast.success(`Location auto-filled: ${fallback.area}, ${fallback.city}, ${fallback.state}`)
        }
        return fallback
      }
      console.log("No fallback data found for:", pincode)
      if (showToast) {
        toast.error("Could not find area, city and state for this pincode. Please enter manually.")
      }
      return null
    }
  } catch (error) {
    console.error("Error looking up pincode:", error)
    console.log("Checking fallback data for:", pincode)
    // Fallback to local data on network error
    const fallback = fallbackPincodes[pincode]
    console.log("Fallback result:", fallback)
    if (fallback) {
      if (showToast) {
        toast.success(`Location auto-filled: ${fallback.area}, ${fallback.city}, ${fallback.state}`)
      }
      return fallback
    }
    console.log("No fallback data found for:", pincode)
    if (showToast) {
      toast.error("Failed to lookup pincode. Please enter area, city and state manually.")
    }
    return null
  }
}

export class PincodeService {
  static async lookup(pincode: string, showToast: boolean = true): Promise<{ area: string; city: string; state: string } | null> {
    return lookupPincode(pincode, showToast)
  }

  static validate(pincode: string): boolean {
    return /^\d{6}$/.test(pincode)
  }

  static getFallbackData(): { [key: string]: { area: string; city: string; state: string } } {
    return fallbackPincodes
  }
}
