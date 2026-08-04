import { redirect } from 'next/navigation'

// This route proxies to the existing fully-featured page.
// The existing page is stable and tested — no need to rebuild.
export default function Page() {
  redirect('/integrations')
}
