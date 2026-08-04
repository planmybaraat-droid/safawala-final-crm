"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, X, Percent, IndianRupee, Loader2, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Offer {
  id: string;
  code: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active: boolean;
}

interface FormData {
  code: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active: boolean;
}

interface ManageOffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageOffersDialog({ open, onOpenChange }: ManageOffersDialogProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    discount_type: 'percent',
    discount_value: 0,
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      fetchOffers();
    }
  }, [open]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/offers', { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (response.ok) {
        setOffers(data.offers || []);
      } else {
        toast.error(data.error || data.details || 'Failed to fetch offers');
      }
    } catch {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      discount_type: 'percent',
      discount_value: 0,
      is_active: true,
    });
    setEditingOffer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Offer code is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Offer name is required');
      return;
    }
    if (formData.discount_value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (formData.discount_type === 'percent' && formData.discount_value > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    try {
      setLoading(true);
      const method = editingOffer ? 'PUT' : 'POST';
      const body = editingOffer ? { id: editingOffer.id, ...formData } : formData;

      const response = await fetch('/api/offers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(editingOffer ? 'Offer updated' : 'Offer created');
        resetForm();
        fetchOffers();
      } else {
        toast.error(data.error || 'Failed to save offer');
      }
    } catch {
      toast.error('Failed to save offer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      code: offer.code,
      name: offer.name,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      is_active: offer.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    setOfferToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!offerToDelete) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/offers?id=${offerToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Offer deleted');
        fetchOffers();
      } else {
        toast.error(data.error || 'Failed to delete offer');
      }
    } catch {
      toast.error('Failed to delete offer');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    const nextActive = !offer.is_active;
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: nextActive } : o)));
    try {
      const response = await fetch('/api/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, is_active: nextActive }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: offer.is_active } : o)));
        toast.error(data.error || 'Failed to update offer');
      }
    } catch {
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: offer.is_active } : o)));
      toast.error('Failed to update offer');
    }
  };

  const activeCount = offers.filter((o) => o.is_active).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Manage Offers</DialogTitle>
                <DialogDescription>
                  Create, edit, and manage discount codes for bookings
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto">
            {/* Form Section */}
            <div className="px-6 py-5 border-b bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  {editingOffer ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      Editing "{editingOffer.code}"
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      New Offer
                    </>
                  )}
                </h3>
                {editingOffer && (
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="h-7 px-2 text-xs">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SAVE10"
                      disabled={!!editingOffer}
                      className="mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Summer Sale"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percent' | 'fixed') =>
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">
                          <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Percentage</span>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" /> Fixed amount</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Value * ({formData.discount_type === 'percent' ? '%' : '₹'})</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
                  <div>
                    <Label htmlFor="active" className="cursor-pointer">Active</Label>
                    <p className="text-xs text-muted-foreground">Customers can redeem this offer immediately</p>
                  </div>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} size="sm" className="min-w-24">
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : editingOffer ? (
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {loading ? 'Saving...' : editingOffer ? 'Update Offer' : 'Create Offer'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Offers List */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">All Offers</h3>
                <span className="text-xs text-muted-foreground">
                  {offers.length} total &middot; {activeCount} active
                </span>
              </div>
              <div className="space-y-2">
                {loading && offers.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="text-sm">Loading offers...</span>
                  </div>
                ) : offers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg">
                    <PackageOpen className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No offers yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Create your first discount code above</p>
                  </div>
                ) : (
                  offers.map((offer) => (
                    <div
                      key={offer.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 border rounded-lg transition",
                        offer.is_active ? "bg-background hover:border-primary/30" : "bg-muted/30 opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
                          offer.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {offer.discount_type === 'percent'
                            ? <Percent className="w-4 h-4" />
                            : <IndianRupee className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">
                              {offer.code}
                            </code>
                            <span className="text-sm font-medium">
                              {offer.discount_type === 'percent'
                                ? `${offer.discount_value}% off`
                                : `₹${offer.discount_value} off`
                              }
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{offer.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleActive(offer)}
                          className="mr-1"
                          aria-label={offer.is_active ? 'Deactivate offer' : 'Activate offer'}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(offer)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offer.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If customers have used this offer, consider deactivating instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
