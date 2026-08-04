"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface FinancialRevenueChartProps {
  data: Array<{
    month: string
    sales: number
    rentals: number
    total: number
  }>
}

export function FinancialRevenueChart({ data }: FinancialRevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, ""]} />
            <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
            <Bar dataKey="rentals" fill="#10b981" name="Rentals" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
