"use client"

import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users, DollarSign, Clock, FileText, UserCheck,
  ChevronRight, ClipboardList, Award
} from "lucide-react"

const HR_SECTIONS = [
  {
    title: "Staff Directory",
    description: "View and manage all staff members, roles, and contact details",
    href: "/staff",
    icon: Users,
    color: "#6366f1",
  },
  {
    title: "Payroll",
    description: "Process monthly salaries, advances, and deductions",
    href: "/payroll",
    icon: DollarSign,
    color: "#22c55e",
  },
  {
    title: "Attendance",
    description: "Track daily attendance, working hours, and leaves",
    href: "/attendance",
    icon: Clock,
    color: "#f59e0b",
  },
  {
    title: "HR Letters",
    description: "Generate offer letters, appointment letters, and experience certificates",
    href: "/hr/letters",
    icon: FileText,
    color: "#a855f7",
  },
  {
    title: "KYC & Documents",
    description: "Manage staff KYC records, ID proofs, and document uploads",
    href: "/customers",
    icon: UserCheck,
    color: "#0891b2",
  },
  {
    title: "Work Orders",
    description: "Assign and track department-wise work tasks",
    href: "/work-orders",
    icon: ClipboardList,
    color: "#ef4444",
  },
]

export default function HRPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-[#6366f1]" />
            HR & Staff
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your team — payroll, attendance, letters, and staff records
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HR_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-150">
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${section.color}18` }}
                  >
                    <section.icon className="w-5 h-5" style={{ color: section.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm flex items-center justify-between">
                      {section.title}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
