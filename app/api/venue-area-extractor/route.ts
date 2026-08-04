/**
 * Venue & Area Extraction API
 * Extracts venue name and area from address strings based on pattern:
 * [Number] [Venue Name] [Area] [City]
 * 
 * Examples:
 * "123 Radisson Blu Sector 15 Noida" → { venue: "Radisson Blu", area: "Sector 15" }
 * "789 Wedding Hall Bandra Mumbai" → { venue: "Wedding Hall", area: "Bandra" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'

// List of all Indian areas and regions (can be expanded)
// This includes popular areas, sectors, colonies, neighborhoods
const INDIAN_AREAS = new Set([
  // Delhi Areas
  'Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 6', 'Sector 7', 'Sector 8', 'Sector 9', 'Sector 10',
  'Sector 11', 'Sector 12', 'Sector 13', 'Sector 14', 'Sector 15', 'Sector 16', 'Sector 17', 'Sector 18', 'Sector 19', 'Sector 20',
  'Sector 21', 'Sector 22', 'Sector 23', 'Sector 24', 'Sector 25', 'Sector 26', 'Sector 27', 'Sector 28', 'Sector 29', 'Sector 30',
  'Sector 31', 'Sector 32', 'Sector 33', 'Sector 34', 'Sector 35', 'Sector 36', 'Sector 37', 'Sector 38', 'Sector 39', 'Sector 40',
  'Sector 41', 'Sector 42', 'Sector 43', 'Sector 44', 'Sector 45', 'Sector 46', 'Sector 47', 'Sector 48', 'Sector 49', 'Sector 50',
  'Panchsheel Park', 'Green Park', 'Safdarjung', 'Vasant Kunj', 'Malviya Nagar', 'Hauz Khas', 'Greater Kailash', 'Saket', 'Dwarka',
  'Rohini', 'Paschim Vihar', 'Punjabi Bagh', 'West Delhi', 'East Delhi', 'South Delhi', 'North Delhi', 'New Delhi', 'Old Delhi',
  'Connaught Place', 'Karol Bagh', 'Chandni Chowk', 'Defence Colony', 'Nehroo Place', 'Lajpat Nagar', 'INA Market',
  'Nehru Nagar', 'Gurgaon', 'Noida', 'Faridabad', 'Gurugram',

  // Mumbai Areas
  'Bandra', 'Andheri', 'Worli', 'Marine Drive', 'Colaba', 'Fort', 'Kala Ghoda', 'Chembur', 'Vile Parle', 'Dadar',
  'Mahim', 'Santa Cruz', 'Borivali', 'Thane', 'Navi Mumbai', 'Powai', 'Malad', 'Kandivali', 'Kharghar', 'Belapur',
  'Dombivali', 'Kalyan', 'Pune', 'Nashik', 'Aurangabad',

  // Bangalore Areas
  'Whitefield', 'Koramangala', 'Indiranagar', 'JP Nagar', 'HSR Layout', 'Marathahalli', 'Sarjapur', 'Bannerghatta',
  'Bellandur', 'MG Road', 'Brigade Road', 'Cubbon Park', 'Jayanagar', 'Malleswaram', 'Frazer Town', 'Basavanagudi',
  'Yelahanka', 'Hebbal', 'Varthur', 'Hoodi', 'Electronic City', 'Rajajinagar', 'Bommanahalli',

  // Hyderabad Areas
  'Hitech City', 'Gachibowli', 'Jubilee Hills', 'Banjara Hills', 'Kondapur', 'Madhapur', 'Kukatpally', 'Secunderabad',
  'Charminar', 'Abids', 'Begumpet', 'Somajiguda', 'Tank Bund', 'Lakdikapool', 'Khairatabad', 'KPHB',

  // Chennai Areas
  'Anna Nagar', 'T. Nagar', 'Nungambakkam', 'Adyar', 'Besant Nagar', 'Thiruvanmiyur', 'Velachery', 'Perambur',
  'Ashok Nagar', 'Teynampet', 'Alwarpet', 'Mylapore', 'Kalakshetra', 'Raj Bhavan', 'Boat Club', 'Mount Road',

  // Pune Areas
  'Kalyani Nagar', 'Koregaon Park', 'Viman Nagar', 'Hinjewadi', 'Magarpatta', 'Wakad', 'Baner', 'Pune City',
  'Deccan', 'Shivaji Nagar', 'Kothrud', 'Kharadi', 'Hadapsar', 'Aundh', 'Camp', 'Katraj',

  // Kolkata Areas
  'Salt Lake', 'Bidhannagar', 'Ballygunge', 'Alipore', 'Behala', 'Howrah', 'Park Circus', 'Jadavpur', 'Tolygunge',
  'Rajarhat', 'New Town', 'Tangra', 'Shyambazar', 'Chandni Chowk',

  // Chandigarh Areas
  'Sector 1', 'Sector 8', 'Sector 17', 'Sector 35', 'Sector 40', 'Sector 43', 'Sector 44', 'Sector 45', 'Sector 46', 'Sector 47',
  'Zirakpur', 'Mohali', 'Panchkula',

  // Jaipur Areas
  'C Scheme', 'M I Road', 'Bani Park', 'Sanganeri Gate', 'Civil Lines', 'Amer', 'Mansarover', 'Vaishali Nagar',
  'Satyaniketan', 'Shyam Nagar', 'Adarsh Nagar',

  // Lucknow Areas
  'Gomti Nagar', 'Indira Nagar', 'Aliganj', 'Hazratganj', 'Charbagh', 'Aminabad', 'Kapoorthala',

  // Ahmedabad Areas
  'Satellite', 'Bodakdev', 'Navrangpura', 'Paldi', 'Vasna', 'Ranip', 'Nikol', 'Thaltej', 'Paldi', 'Ishan',

  // Generic area types
  'North', 'South', 'East', 'West', 'Central', 'Downtown', 'Uptown', 'Midtown',
])

// Common venue type keywords to help identify venue names
const VENUE_KEYWORDS = [
  'hall', 'resort', 'hotel', 'manor', 'palace', 'fort', 'garden', 'club', 'center', 'centre',
  'plaza', 'mall', 'ground', 'park', 'lawn', 'banquet', 'palace', 'heritage', 'villa',
  'plot', 'farm', 'farmhouse', 'haveli', 'bungalow', 'mansion', 'cottage', 'auditorium',
  'theatre', 'convention', 'ballroom', 'lounge', 'pavilion', 'tent', 'marquee'
]

interface ExtractionResult {
  venue_name: string
  area_name: string
  raw_input: string
}

function extractVenueAndArea(address: string): ExtractionResult {
  if (!address || address === 'Not Specified') {
    return {
      venue_name: 'Not Specified',
      area_name: 'Not Specified',
      raw_input: address || '',
    }
  }

  // Clean the address
  const cleaned = address.trim()
  
  // Split by common delimiters
  const parts = cleaned.split(/[,\n;]+/).map(p => p.trim()).filter(p => p.length > 0)
  
  if (parts.length === 0) {
    return {
      venue_name: cleaned,
      area_name: 'Not Specified',
      raw_input: address,
    }
  }

  let venue_name = 'Not Specified'
  let area_name = 'Not Specified'

  // Strategy: Find the first part that looks like an area/sector
  // Everything before it is venue name, everything after is area
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    
    // Check if this part is a known area
    if (INDIAN_AREAS.has(part) || /^Sector \d+/.test(part)) {
      // Found an area!
      area_name = part
      
      // Venue name is everything before the area
      if (i > 0) {
        venue_name = parts.slice(0, i).join(', ')
      } else if (i + 1 < parts.length) {
        // If area is first, check if there's something after it
        venue_name = 'Not Specified'
      }
      break
    }
  }

  // If no area found, use smart heuristics
  if (area_name === 'Not Specified') {
    // Check if first part looks like a number (street number)
    if (/^\d+/.test(parts[0]) && parts.length > 1) {
      // Skip the number and use next part as venue
      venue_name = parts.slice(1).join(', ')
    } else {
      // Use first part as venue name
      venue_name = parts[0]
      
      // Try to find area in remaining parts
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i]
          if (INDIAN_AREAS.has(part) || /^Sector \d+/.test(part)) {
            area_name = part
            break
          }
        }
      }
    }
  }

  // Clean up venue name (remove extra whitespace)
  venue_name = venue_name.replace(/\s+/g, ' ').trim()

  return {
    venue_name: venue_name || 'Not Specified',
    area_name: area_name || 'Not Specified',
    raw_input: address,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'staff')
    if (!auth.success) {
      return NextResponse.json(auth.response, { status: 401 })
    }

    const { address, addresses } = await request.json()

    // Handle single address
    if (address) {
      const result = extractVenueAndArea(address)
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    // Handle multiple addresses (batch processing)
    if (Array.isArray(addresses)) {
      const results = addresses.map(addr => extractVenueAndArea(addr))
      return NextResponse.json({
        success: true,
        data: results,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Please provide either "address" or "addresses" in request body',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Venue Extractor] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
