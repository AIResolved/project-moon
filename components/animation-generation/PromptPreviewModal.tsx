'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Edit, Save, X, Eye } from 'lucide-react'

interface PromptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  title?: string
  onSave?: (updatedPrompt: string, updatedTitle?: string) => void
  readOnly?: boolean
}

export function PromptPreviewModal({
  isOpen,
  onClose,
  prompt,
  title,
  onSave,
  readOnly = false
}: PromptPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(prompt)
  const [editedTitle, setEditedTitle] = useState(title || '')

  // Reset state when modal opens or prompt changes
  useEffect(() => {
    setEditedPrompt(prompt)
    setEditedTitle(title || '')
    setIsEditing(false)
  }, [prompt, title, isOpen])

  const handleSave = () => {
    if (onSave) {
      onSave(editedPrompt.trim(), editedTitle.trim() || undefined)
    }
    setIsEditing(false)
    onClose()
  }

  const handleCancel = () => {
    setEditedPrompt(prompt)
    setEditedTitle(title || '')
    setIsEditing(false)
  }

  const handleClose = () => {
    if (isEditing) {
      handleCancel()
    }
    onClose()
  }

  const wordCount = editedPrompt.trim().split(/\s+/).filter(Boolean).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Animation Prompt
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                Animation Prompt Preview
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edit the animation prompt and title as needed.'
              : 'Full view of the animation prompt. Click edit to make changes.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Field */}
          {(title || isEditing) && (
            <div className="space-y-2">
              <Label htmlFor="prompt-title" className="text-sm font-medium">
                Scene Title
              </Label>
              {isEditing ? (
                <Input
                  id="prompt-title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Enter scene title..."
                  className="text-sm"
                />
              ) : (
                <div className="text-sm font-medium text-foreground p-3 bg-muted rounded-lg">
                  {title || 'Untitled Scene'}
                </div>
              )}
            </div>
          )}

          {/* Prompt Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="prompt-text" className="text-sm font-medium">
                Animation Prompt
              </Label>
              <div className="text-xs text-muted-foreground">
                {wordCount} words
              </div>
            </div>
            {isEditing ? (
              <Textarea
                id="prompt-text"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Enter animation prompt..."
                rows={12}
                className="text-sm resize-y"
              />
            ) : (
              <div className="text-sm text-foreground p-4 bg-muted rounded-lg border min-h-[200px] whitespace-pre-wrap leading-relaxed">
                {prompt}
              </div>
            )}
          </div>

          {/* Character/Word Count Info */}
          <div className="text-xs text-muted-foreground">
            Characters: {editedPrompt.length}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {isEditing && (
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            
            {!readOnly && (
              <>
                {isEditing ? (
                  <Button onClick={handleSave} disabled={!editedPrompt.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}






