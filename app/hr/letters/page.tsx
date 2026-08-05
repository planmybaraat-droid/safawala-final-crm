"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import LettersWorkflow from "@/app/portal/hr/letters/page"

/** Desktop HR workspace entry point. The workflow is shared with the portal
 * so letter generation, templates and print behavior stay consistent. */
export default function HRLettersPage() {
  return (
    <DashboardLayout>
      <LettersWorkflow />
    </DashboardLayout>
  )
}
