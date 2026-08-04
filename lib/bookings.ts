import { apiClient } from "./api-client"

type BookingType = 'package_booking' | 'product_order' | 'direct_sales' | 'unified'

/**
 * Try PATCH first, if server or proxy doesn't support PATCH try POST as fallback.
 * Returns the raw apiClient response.
 */
async function _callEndpoint(endpoint: string, payload: any) {
  try {
    const patchRes = await apiClient.patch(endpoint, payload)
    if (patchRes && (patchRes as any).success) return patchRes

    // If patch didn't succeed, try POST as fallback
    const postRes = await apiClient.post(endpoint, payload)
    return postRes
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' }
  }
}

/** Archive a booking by id. Returns api response. */
export async function archiveBooking(id: string, type: BookingType = 'unified') {
  if (!id) return { success: false, error: 'Missing booking id' }
  const endpoint = `/api/bookings/archive`
  return await _callEndpoint(endpoint, { id, type })
}

/** Restore a booking by id. Returns api response. */
export async function restoreBooking(id: string, type: BookingType = 'unified') {
  if (!id) return { success: false, error: 'Missing booking id' }
  const endpoint = `/api/bookings/restore`
  return await _callEndpoint(endpoint, { id, type })
}

export default { archiveBooking, restoreBooking }
