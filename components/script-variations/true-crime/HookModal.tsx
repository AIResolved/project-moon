'use client'

import { Button } from "@/components/ui/button"
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
import { type Hook } from "@/lib/features/scripts/scriptsSlice"

interface HookModalProps {
  isOpen: boolean
  onClose: () => void
  editingHook: Hook | null
  hookText: string
  hookStyle: 'question' | 'statement' | 'story' | 'statistic' | 'custom'
  hookAdditionalInstructions: string
  onHookTextChange: (value: string) => void
  onHookStyleChange: (value: 'question' | 'statement' | 'story' | 'statistic' | 'custom') => void
  onHookAdditionalInstructionsChange: (value: string) => void
  onSave: () => void
}

export function HookModal({
  isOpen,
  onClose,
  editingHook,
  hookText,
  hookStyle,
  hookAdditionalInstructions,
  onHookTextChange,
  onHookStyleChange,
  onHookAdditionalInstructionsChange,
  onSave
}: HookModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingHook ? 'Edit Hook' : 'Add Hook'}</DialogTitle>
          <DialogDescription>
            Add a compelling hook to grab attention at the beginning of your intro section.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hook-text">Hook Text *</Label>
            <Textarea
              id="hook-text"
              placeholder="e.g., 'What if I told you that everything you know about success is wrong?'"
              value={hookText}
              onChange={(e) => onHookTextChange(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Make it compelling and attention-grabbing.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hook-style">Hook Style</Label>
            <Select value={hookStyle} onValueChange={onHookStyleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select hook style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question">Question Hook</SelectItem>
                <SelectItem value="statement">Bold Statement</SelectItem>
                <SelectItem value="story">Story Hook</SelectItem>
                <SelectItem value="statistic">Statistic Hook</SelectItem>
                <SelectItem value="custom">Custom Style</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hook-additional-instructions">Additional Instructions (Optional)</Label>
            <Textarea
              id="hook-additional-instructions"
              placeholder="e.g., 'deliver with dramatic pause', 'build suspense', 'use conversational tone'"
              value={hookAdditionalInstructions}
              onChange={(e) => onHookAdditionalInstructionsChange(e.target.value)}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              Add style, tone, or delivery instructions for this hook.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onSave} disabled={!hookText.trim()} className="flex-1">
              {editingHook ? 'Save Changes' : 'Add Hook'}
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