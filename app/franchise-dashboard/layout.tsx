import { FranchiseLayout } from '@/components/franchise/layout/franchise-layout'

export const metadata = {
  title: 'Franchise Dashboard — Safawala CRM',
  description: 'Franchise owner portal for Safawala CRM',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FranchiseLayout>{children}</FranchiseLayout>
}
