import { NextRequest, NextResponse } from 'next/server'

interface OSMResult {
  lat: string
  lon: string
  display_name: string
}

interface PostalPincodeResult {
  Message: string
  Status: string
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
    Latitude: string
    Longitude: string
  }>
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance)
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Get coordinates from India Post Pincode API (most accurate for Indian pincodes)
 */
async function getCoordinatesFromIndiaPost(pincode: string): Promise<{ lat: number; lon: number; location: string } | null> {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    
    if (!response.ok) {
      return null
    }
    
    const data: PostalPincodeResult[] = await response.json()
    
    if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0]
      
      // India Post API provides lat/lon in some cases
      if (postOffice.Latitude && postOffice.Longitude) {
        const lat = parseFloat(postOffice.Latitude)
        const lon = parseFloat(postOffice.Longitude)
        
        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          return {
            lat,
            lon,
            location: `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}`
          }
        }
      }
      
      // If no coordinates, try to geocode using district and state
      return await geocodeLocation(postOffice.District, postOffice.State)
    }
  } catch (error) {
    console.error('India Post API error:', error)
  }
  
  return null
}

/**
 * Geocode a location (district, state) to coordinates
 */
async function geocodeLocation(district: string, state: string): Promise<{ lat: number; lon: number; location: string } | null> {
  try {
    const query = `${district}, ${state}, India`
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'SafawalaCRM/1.0'
        }
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data: OSMResult[] = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        location: data[0].display_name
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  
  return null
}

/**
 * Get coordinates using Nominatim OpenStreetMap API (fallback)
 */
async function getCoordinatesFromOSM(pincode: string): Promise<{ lat: number; lon: number; location: string } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'SafawalaCRM/1.0'
        }
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data: OSMResult[] = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        location: data[0].display_name
      }
    }
  } catch (error) {
    console.error('OSM API error:', error)
  }
  
  return null
}

/**
 * Fallback distance estimation based on pincode region patterns
 */
function fallbackEstimate(fromPincode: string, toPincode: string): number {
  const fromNum = parseInt(fromPincode)
  const toNum = parseInt(toPincode)
  
  if (isNaN(fromNum) || isNaN(toNum)) {
    return 0
  }
  
  // Get first two digits (region code)
  const fromRegion = Math.floor(fromNum / 10000)
  const toRegion = Math.floor(toNum / 10000)
  
  if (fromRegion === toRegion) {
    // Same region (e.g., 39xxxx to 39xxxx): smaller distances
    return Math.round(Math.abs(fromNum - toNum) / 100)
  } else {
    // Different regions: approximate 200 km per region difference
    const regionDiff = Math.abs(fromRegion - toRegion)
    return regionDiff * 200
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromPincode = searchParams.get('from')
    const toPincode = searchParams.get('to')
    
    if (!fromPincode || !toPincode) {
      return NextResponse.json(
        { success: false, error: 'Missing pincodes' },
        { status: 400 }
      )
    }
    
    // Same pincode = 0 distance
    if (fromPincode === toPincode) {
      return NextResponse.json({
        success: true,
        distanceKm: 0,
        method: 'exact'
      })
    }
    
    // Try India Post API first (most accurate for Indian pincodes)
    let fromCoords = await getCoordinatesFromIndiaPost(fromPincode)
    let toCoords = await getCoordinatesFromIndiaPost(toPincode)
    
    // Fallback to OSM if India Post doesn't have coordinates
    if (!fromCoords) {
      fromCoords = await getCoordinatesFromOSM(fromPincode)
    }
    if (!toCoords) {
      toCoords = await getCoordinatesFromOSM(toPincode)
    }
    
    if (fromCoords && toCoords) {
      // Calculate actual distance
      const distance = haversineDistance(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon
      )
      
      return NextResponse.json({
        success: true,
        distanceKm: distance,
        method: 'geolocation',
        from: fromCoords.location,
        to: toCoords.location,
        coordinates: {
          from: { lat: fromCoords.lat, lon: fromCoords.lon },
          to: { lat: toCoords.lat, lon: toCoords.lon }
        }
      })
    }
    
    // Fallback to estimation
    const estimatedDistance = fallbackEstimate(fromPincode, toPincode)
    
    return NextResponse.json({
      success: true,
      distanceKm: estimatedDistance,
      method: 'estimation',
      note: 'Geolocation unavailable, using region-based estimation'
    })
    
  } catch (error) {
    console.error('Distance calculation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        distanceKm: 0
      },
      { status: 500 }
    )
  }
}
