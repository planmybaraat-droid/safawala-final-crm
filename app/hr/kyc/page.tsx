"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import KycWorkflow from "@/app/portal/hr/kyc/page"

/** Desktop HR workspace entry point for the shared KYC document workflow. */
export default function HRKycPage() {
  return (
    <DashboardLayout>
      <div className="crm-workspace-shell hr-payroll-ui hr-module-ui hr-workflow-page">
      <KycWorkflow />
      </div>
    </DashboardLayout>
  )
}
