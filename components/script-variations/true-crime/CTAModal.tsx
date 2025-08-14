'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type CallToAction } from "@/lib/features/scripts/scriptsSlice"

interface CTAModalProps {
  isOpen: boolean
  onClose: () => void
  editingCta: CallToAction | null
  ctaText: string
  ctaPlacement: 'beginning' | 'middle' | 'end' | 'custom'
  ctaCustomPlacement: string
  ctaAdditionalInstructions: string
  onCtaTextChange: (value: string) => void
  onCtaPlacementChange: (value: 'beginning' | 'middle' | 'end' | 'custom') => void
  onCtaCustomPlacementChange: (value: string) => void
  onCtaAdditionalInstructionsChange: (value: string) => void
  onSave: () => void
}

export function CTAModal({
  isOpen,
  onClose,
  editingCta,
  ctaText,
  ctaPlacement,
  ctaCustomPlacement,
  ctaAdditionalInstructions,
  onCtaTextChange,
  onCtaPlacementChange,
  onCtaCustomPlacementChange,
  onCtaAdditionalInstructionsChange,
  onSave
}: CTAModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingCta ? 'Edit Call-to-Action' : 'Add Call-to-Action'}</DialogTitle>
          <DialogDescription>
            Add a call-to-action to engage viewers. Be specific about placement and additional instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cta-text">CTA Text *</Label>
            <Textarea
              id="cta-text"
              placeholder="e.g., 'Don't forget to subscribe and turn on notifications for more amazing content like this!'"
              value={ctaText}
              onChange={(e) => onCtaTextChange(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what action you want viewers to take.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cta-placement">Placement</Label>
            <Select value={ctaPlacement} onValueChange={onCtaPlacementChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginning">Beginning of section</SelectItem>
                <SelectItem value="middle">Middle of section</SelectItem>
                <SelectItem value="end">End of section</SelectItem>
                <SelectItem value="custom">Custom placement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {ctaPlacement === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="cta-custom-placement">Custom Placement Description</Label>
              <Input
                id="cta-custom-placement"
                placeholder="e.g., 'after the main point', 'before the conclusion', 'between the examples'"
                value={ctaCustomPlacement}
                onChange={(e) => onCtaCustomPlacementChange(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cta-additional-instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="cta-additional-instructions"
              placeholder="e.g., 'make it sound natural and enthusiastic', 'include a pause before the CTA', 'add a joke at the end'"
              value={ctaAdditionalInstructions}
              onChange={(e) => onCtaAdditionalInstructionsChange(e.target.value)}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              Add style, tone, or delivery instructions for this CTA.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onSave} disabled={!ctaText.trim()} className="flex-1">
              {editingCta ? 'Save Changes' : 'Add CTA'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 