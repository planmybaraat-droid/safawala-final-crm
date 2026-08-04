/**
 * Distance Calculation Service
 * 
 * Provides accurate distance calculation between pincodes
 * Uses external API for precise geographic distance
 */

interface DistanceResult {
  distanceKm: number
  success: boolean
  error?: string
}

interface PincodeCoordinates {
  pincode: string
  latitude: number
  longitude: number
  city?: string
  state?: string
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
 * Get coordinates for a pincode using India Post API
 */
async function getPincodeCoordinates(pincode: string): Promise<PincodeCoordinates | null> {
  try {
    // Try India Post API first
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const data = await response.json()
    
    if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0]
      // India Post API doesn't provide coordinates directly
      // We'll need to use a different approach
      
      // For now, return with city and state info
      return {
        pincode,
        latitude: 0, // Will be resolved later
        longitude: 0,
        city: postOffice.District,
        state: postOffice.State
      }
    }
  } catch (error) {
    console.warn('India Post API error:', error)
  }
  
  return null
}

/**
 * Get coordinates using Nominatim OpenStreetMap API
 */
async function getCoordinatesFromOSM(pincode: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'SafawalaCRM/1.0' // Required by Nominatim
        }
      }
    )
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }
  } catch (error) {
    console.warn('OSM API error:', error)
  }
  
  return null
}

/**
 * Calculate distance between two pincodes
 * 
 * @param fromPincode Source pincode (your store: 390001)
 * @param toPincode Destination pincode (customer's location)
 * @returns Distance in kilometers
 */
export async function calculateDistance(
  fromPincode: string,
  toPincode: string
): Promise<DistanceResult> {
  try {
    // Clean pincodes
    const from = fromPincode.trim()
    const to = toPincode.trim()
    
    if (!from || !to) {
      return { distanceKm: 0, success: false, error: 'Invalid pincodes' }
    }
    
    // Same pincode = 0 distance
    if (from === to) {
      return { distanceKm: 0, success: true }
    }
    
    // Get coordinates for both pincodes
    const [fromCoords, toCoords] = await Promise.all([
      getCoordinatesFromOSM(from),
      getCoordinatesFromOSM(to)
    ])
    
    if (!fromCoords || !toCoords) {
      // Fallback to estimation if API fails
      return fallbackDistanceEstimate(from, to)
    }
    
    // Calculate distance using Haversine formula
    const distance = haversineDistance(
      fromCoords.lat,
      fromCoords.lon,
      toCoords.lat,
      toCoords.lon
    )
    
    return {
      distanceKm: distance,
      success: true
    }
  } catch (error) {
    console.error('Distance calculation error:', error)
    return fallbackDistanceEstimate(fromPincode, toPincode)
  }
}

/**
 * Fallback distance estimation based on pincode patterns
 * Indian pincodes: First digit = region, first 2 digits = sub-region
 */
function fallbackDistanceEstimate(from: string, to: string): DistanceResult {
  const fromNum = parseInt(from)
  const toNum = parseInt(to)
  
  if (isNaN(fromNum) || isNaN(toNum)) {
    return { distanceKm: 0, success: false, error: 'Invalid pincode format' }
  }
  
  // Get first two digits (sub-region)
  const fromRegion = Math.floor(fromNum / 10000)
  const toRegion = Math.floor(toNum / 10000)
  
  // Rough estimation based on region difference
  let estimatedKm: number
  
  if (fromRegion === toRegion) {
    // Same sub-region: 0-100 km
    estimatedKm = Math.abs(fromNum - toNum) / 100
  } else {
    // Different regions: Use larger multiplier
    const regionDiff = Math.abs(fromRegion - toRegion)
    estimatedKm = regionDiff * 200 // Approximately 200 km per region difference
  }
  
  return {
    distanceKm: Math.round(estimatedKm),
    success: false, // Indicate this is an estimate
    error: 'Using fallback estimation'
  }
}

/**
 * Cache for distance calculations to avoid repeated API calls
 */
const distanceCache = new Map<string, { distance: number; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Calculate distance with caching
 */
export async function calculateDistanceWithCache(
  fromPincode: string,
  toPincode: string
): Promise<number> {
  const cacheKey = `${fromPincode}-${toPincode}`
  
  // Check cache
  const cached = distanceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.distance
  }
  
  // Calculate distance
  const result = await calculateDistance(fromPincode, toPincode)
  
  // Cache result
  if (result.success) {
    distanceCache.set(cacheKey, {
      distance: result.distanceKm,
      timestamp: Date.now()
    })
  }
  
  return result.distanceKm
}

/**
 * Batch calculate distances for multiple pincodes
 */
export async function calculateDistances(
  fromPincode: string,
  toPincodes: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>()
  
  // Process in batches to avoid rate limiting
  const batchSize = 5
  for (let i = 0; i < toPincodes.length; i += batchSize) {
    const batch = toPincodes.slice(i, i + batchSize)
    const distances = await Promise.all(
      batch.map(to => calculateDistanceWithCache(fromPincode, to))
    )
    
    batch.forEach((pincode, index) => {
      results.set(pincode, distances[index])
    })
    
    // Small delay between batches
    if (i + batchSize < toPincodes.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  return results
}

export default {
  calculateDistance,
  calculateDistanceWithCache,
  calculateDistances
}
