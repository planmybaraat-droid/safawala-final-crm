"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PricingData {
  cost_price: number
  rental_price: number
  regular_price: number
  price: number // sale price
  security_deposit: number
}

interface PricingPanelProps {
  data: PricingData
  onChange: (data: PricingData) => void
  disabled?: boolean
}

export function PricingPanel({ data, onChange, disabled }: PricingPanelProps) {
  const handleChange = (field: keyof PricingData, value: number) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const rentalMargin = data.rental_price > 0 && data.cost_price > 0
    ? Math.round(((data.rental_price - data.cost_price) / data.cost_price) * 100)
    : 0

  const saleMargin = data.price > 0 && data.cost_price > 0
    ? Math.round(((data.price - data.cost_price) / data.cost_price) * 100)
    : 0

  const getMarginColor = (margin: number) => {
    if (margin < 0) return "text-red-600"
    if (margin < 20) return "text-amber-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost Price */}
        <div className="space-y-2">
          <Label htmlFor="cost_price" className="flex items-center gap-1">
            Cost Price
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Cost to you (acquisition/manufacturing cost)</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="cost_price"
              type="number"
              min="0"
              step="0.01"
              value={data.cost_price}
              onChange={(e) => handleChange("cost_price", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
            />
          </div>
        </div>

        {/* Rental Price */}
        <div className="space-y-2">
          <Label htmlFor="rental_price" className="flex items-center gap-1">
            Rental Price
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Daily or per-rental cost</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="rental_price"
              type="number"
              min="0"
              step="0.01"
              value={data.rental_price}
              onChange={(e) => handleChange("rental_price", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
            />
          </div>
          {data.cost_price > 0 && (
            <p className={`text-xs font-semibold ${getMarginColor(rentalMargin)}`}>
              {rentalMargin >= 0 ? "+" : ""}{rentalMargin}% margin
            </p>
          )}
        </div>

        {/* Regular Price */}
        <div className="space-y-2">
          <Label htmlFor="regular_price" className="flex items-center gap-1">
            Regular Price
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Original/list price (shown with strikethrough on labels)</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="regular_price"
              type="number"
              min="0"
              step="0.01"
              value={data.regular_price}
              onChange={(e) => handleChange("regular_price", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
            />
          </div>
        </div>

        {/* Sale Price */}
        <div className="space-y-2">
          <Label htmlFor="price" className="flex items-center gap-1">
            Sale Price
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>One-time purchase price</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={data.price}
              onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
            />
          </div>
          {data.cost_price > 0 && (
            <p className={`text-xs font-semibold ${getMarginColor(saleMargin)}`}>
              {saleMargin >= 0 ? "+" : ""}{saleMargin}% margin
            </p>
          )}
        </div>

        {/* Security Deposit */}
        <div className="space-y-2">
          <Label htmlFor="security_deposit" className="flex items-center gap-1">
            Security Deposit
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Refundable deposit for rentals</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              id="security_deposit"
              type="number"
              min="0"
              step="0.01"
              value={data.security_deposit}
              onChange={(e) => handleChange("security_deposit", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-semibold">Price Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">₹{(data.cost_price || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit:</span>
            <span className="font-medium">₹{(data.security_deposit || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Regular:</span>
            <span className="font-medium">₹{(data.regular_price || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rental:</span>
            <span className="font-medium">₹{(data.rental_price || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground font-semibold">Sale Price:</span>
            <span className="font-bold text-green-600">₹{(data.price || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
