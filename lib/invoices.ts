import { apiClient } from "./api-client"

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

/** Archive an invoice by id. Returns api response. */
export async function archiveInvoice(id: string) {
  if (!id) return { success: false, error: 'Missing invoice id' }
  const endpoint = `/api/invoices/archive`
  return await _callEndpoint(endpoint, { id })
}

/** Restore an invoice by id. Returns api response. */
export async function restoreInvoice(id: string) {
  if (!id) return { success: false, error: 'Missing invoice id' }
  const endpoint = `/api/invoices/restore`
  return await _callEndpoint(endpoint, { id })
}

export default { archiveInvoice, restoreInvoice }
