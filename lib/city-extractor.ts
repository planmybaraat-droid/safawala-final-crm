/**
 * City Extraction Utility
 * Automatically extracts city name from venue addresses
 * 
 * Supports multiple Indian address formats:
 * - "123 Main St, Andheri, Mumbai, Maharashtra 400001" → "Mumbai"
 * - "Plot 45, Sector 21, Gurgaon, Haryana" → "Gurgaon"
 * - "Royal Gardens, Delhi" → "Delhi"
 * - "Grand Palace, Bangalore - 560001" → "Bangalore"
 */

// Common Indian cities and metro areas for better extraction
const INDIAN_CITIES = new Set([
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata',
  'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal',
  'visakhapatnam', 'pimpri-chinchwad', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra',
  'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan-dombivali', 'vasai-virar', 'varanasi',
  'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj',
  'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai',
  'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur', 'hubballi-dharwad', 'tiruchirappalli',
  'tiruppur', 'moradabad', 'mysore', 'mysuru', 'bareilly', 'gurgaon', 'gurugram', 'aligarh',
  'jalandhar', 'bhubaneswar', 'salem', 'mira-bhayandar', 'warangal', 'thiruvananthapuram',
  'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati', 'noida', 'jamshedpur',
  'bhilai', 'cuttack', 'firozabad', 'kochi', 'cochin', 'nellore', 'bhavnagar', 'dehradun',
  'durgapur', 'asansol', 'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar',
  'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu', 'sangli-miraj-kupwad',
  'mangalore', 'erode', 'belgaum', 'belagavi', 'ambattur', 'tirunelveli', 'malegaon', 'gaya'
])

// Common Indian states for filtering
const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'chandigarh', 'puducherry'
])

/**
 * Extract city name from address string
 * @param address - Full venue address
 * @returns City name or "N/A" if not found
 */
export function extractCityFromAddress(address: string | null | undefined): string {
  if (!address || address.trim() === '') {
    return 'N/A'
  }

  const cleanAddress = address.trim()
  
  // Split by common separators
  const parts = cleanAddress
    .split(/[,\n]/)
    .map(part => part.trim())
    .filter(part => part.length > 0)

  // Strategy 1: Look for known city names in parts
  for (const part of parts) {
    const lowerPart = part.toLowerCase()
      .replace(/\s*-\s*\d{6}$/, '') // Remove pincode like "Mumbai - 400001"
      .replace(/\d{6}$/, '') // Remove standalone pincode
      .trim()
    
    if (INDIAN_CITIES.has(lowerPart)) {
      return toTitleCase(lowerPart)
    }
  }

  // Strategy 2: Check parts before state names
  // Address often follows: [Area], [City], [State] [Pincode]
  for (let i = 0; i < parts.length; i++) {
    const currentPart = parts[i].toLowerCase()
      .replace(/\s*-\s*\d{6}$/, '')
      .replace(/\d{6}$/, '')
      .trim()
    
    // Check if next part is a state
    if (i < parts.length - 1) {
      const nextPart = parts[i + 1].toLowerCase().replace(/\d{6}$/, '').trim()
      if (INDIAN_STATES.has(nextPart)) {
        // Current part is likely the city
        const cityCandidate = currentPart
        if (cityCandidate.length > 2 && !INDIAN_STATES.has(cityCandidate)) {
          return toTitleCase(cityCandidate)
        }
      }
    }
  }

  // Strategy 3: Extract from common patterns
  // Pattern: "Venue Name, City"
  if (parts.length === 2) {
    const secondPart = parts[1]
      .replace(/\s*-\s*\d{6}$/, '')
      .replace(/\d{6}$/, '')
      .trim()
    if (secondPart.length > 2 && !isLikelyPincode(secondPart)) {
      return toTitleCase(secondPart)
    }
  }

  // Strategy 4: Look at second-to-last part (often city before state/pincode)
  if (parts.length >= 3) {
    const cityCandidate = parts[parts.length - 2]
      .replace(/\s*-\s*\d{6}$/, '')
      .replace(/\d{6}$/, '')
      .trim()
      .toLowerCase()
    
    if (cityCandidate.length > 2 && !INDIAN_STATES.has(cityCandidate) && !isLikelyPincode(cityCandidate)) {
      return toTitleCase(cityCandidate)
    }
  }

  // Strategy 5: Return second part if it looks like a city (fallback)
  if (parts.length >= 2) {
    const fallbackCity = parts[1]
      .replace(/\s*-\s*\d{6}$/, '')
      .replace(/\d{6}$/, '')
      .trim()
    if (fallbackCity.length > 2 && !isLikelyPincode(fallbackCity)) {
      return toTitleCase(fallbackCity)
    }
  }

  // If all strategies fail, return N/A
  return 'N/A'
}

/**
 * Format venue display with city
 * @param venueName - Venue name
 * @param venueAddress - Venue address
 * @returns Formatted string like "Grand Palace, Mumbai" or "No Venue"
 */
export function formatVenueWithCity(
  venueName: string | null | undefined,
  venueAddress: string | null | undefined
): string {
  if (!venueName || venueName.trim() === '') {
    return 'No Venue'
  }

  const city = extractCityFromAddress(venueAddress)
  
  if (city === 'N/A') {
    return venueName.trim()
  }

  return `${venueName.trim()}, ${city}`
}

/**
 * Check if string looks like a pincode (6 digits)
 */
function isLikelyPincode(str: string): boolean {
  return /^\d{6}$/.test(str.trim())
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => {
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Get city for CSV export (separate column)
 */
export function getCityForExport(venueAddress: string | null | undefined): string {
  const city = extractCityFromAddress(venueAddress)
  return city === 'N/A' ? '' : city
}

/**
 * Get venue name for CSV export (separate column)
 */
export function getVenueNameForExport(venueName: string | null | undefined): string {
  return venueName?.trim() || ''
}
