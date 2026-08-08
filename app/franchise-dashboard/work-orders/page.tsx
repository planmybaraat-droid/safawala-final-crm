import { redirect } from 'next/navigation'

// The legacy work-orders UI has been retired in favor of the new Job system.
export default function Page() {
  redirect('/portal/warehouse/jobs')
}
