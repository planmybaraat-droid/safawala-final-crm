"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import KycWorkflow from "@/app/portal/hr/kyc/page"

/** Desktop HR workspace entry point for the shared KYC document workflow. */
export default function HRKycPage() {
  return (
    <DashboardLayout>
      <div className="hr-payroll-ui">
      <KycWorkflow />
      </div>
    </DashboardLayout>
  )
}
