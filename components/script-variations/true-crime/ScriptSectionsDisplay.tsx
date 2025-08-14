'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { 
  type ScriptSection,
  type CallToAction,
  type Hook
} from "@/lib/features/scripts/scriptsSlice"

interface ScriptSectionsDisplayProps {
  scriptSections: ScriptSection[]
  hasScriptSections: boolean
  editingSectionIndex: number | null
  editingSectionData: ScriptSection | null
  
  // Section editing handlers
  onStartEditingSection: (index: number) => void
  onSaveEditingSection: () => void
  onCancelEditingSection: () => void
  onUpdateEditingSectionField: (field: keyof ScriptSection, value: string) => void
  onRegenerateSegment: (sectionIndex: number) => void
  
  // CTA/Hook handlers
  onOpenCtaModal: (sectionIndex: number, existingCta?: CallToAction) => void
  onOpenHookModal: (sectionIndex: number, existingHook?: Hook) => void
  onRemoveCta: (sectionIndex: number, ctaId: string) => void
  onRemoveHook: (sectionIndex: number) => void
}

export function ScriptSectionsDisplay({
  scriptSections,
  hasScriptSections,
  editingSectionIndex,
  editingSectionData,
  onStartEditingSection,
  onSaveEditingSection,
  onCancelEditingSection,
  onUpdateEditingSectionField,
  onRegenerateSegment,
  onOpenCtaModal,
  onOpenHookModal,
  onRemoveCta,
  onRemoveHook
}: ScriptSectionsDisplayProps) {
  if (!hasScriptSections) {
    return null
  }

  return (
    <div className="w-full space-y-6 p-6 bg-card rounded-lg border shadow-sm">
      <div className="space-y-2 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Script Sections</h2>
          <p className="text-muted-foreground">
            Review your script outline. Click "Generate Full Script" when ready.
          </p>
        </div>
        <div className="text-sm font-medium bg-primary/10 px-3 py-1 rounded-full">
          {scriptSections.length} Sections
        </div>
      </div>
      
      <div className="space-y-4">
        {scriptSections.map((section, index) => (
          <div key={index} className="border rounded-lg p-4 bg-background">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-foreground">
                Section {index + 1}: {section.title}
              </h3>
              <div className="flex gap-2">
                {/* Hook button for first section (intro) */}
                {index === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenHookModal(index, section.hook)}
                    className="border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700"
                  >
                    <Plus size={14} className="mr-1" />
                    {section.hook ? 'Edit Hook' : 'Add Hook'}
                  </Button>
                )}
                
                {/* CTA button for all sections */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCtaModal(index)}
                  className="border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700"
                >
                  <Plus size={14} className="mr-1" />
                  Add CTA
                </Button>
              
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStartEditingSection(index)}
                >
                  <RefreshCw size={14} className="mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRegenerateSegment(index)}
                  className="border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                >
                  <RefreshCw size={14} className="mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Display Hook (for intro section) */}
            {section.hook && (
              <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium text-purple-800">🎣 Hook</h4>
                  <div className="flex gap-1">
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenHookModal(index, section.hook)}
                      className="h-6 w-6 p-0 text-purple-600 hover:text-purple-800"
                    >
                      <Edit size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveHook(index)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-purple-700 font-medium">
                  {section.hook.style.charAt(0).toUpperCase() + section.hook.style.slice(1)} Hook: "{section.hook.text}"
                </p>
                {section.hook.additionalInstructions && (
                  <p className="text-xs text-purple-600 mt-1">
                    Instructions: {section.hook.additionalInstructions}
                  </p>
                )}
              </div>
            )}

            {/* Display CTAs */}
            {section.ctas && section.ctas.length > 0 && (
              <div className="mb-3 space-y-2">
                {section.ctas.map((cta, ctaIndex) => (
                  <div key={cta.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-blue-800">
                        📢 CTA {ctaIndex + 1} ({cta.placement === 'custom' ? cta.customPlacement : cta.placement})
                      </h4>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenCtaModal(index, cta)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveCta(index, cta.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 font-medium">"{cta.text}"</p>
                    {cta.additionalInstructions && (
                      <p className="text-xs text-blue-600 mt-1">
                        Instructions: {cta.additionalInstructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* View Mode - only show when not editing */}
            {editingSectionIndex !== index && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Writing Instructions:</h4>
                  <p className="text-sm text-foreground bg-muted p-3 rounded whitespace-pre-wrap">
                    {section.writingInstructions}
                  </p>
                </div>
                

              </div>
            )}
            
            {/* Editing Mode */}
            {editingSectionIndex === index && editingSectionData && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground">Edit Section:</h4>
                
                <div className="space-y-2">
                  <Label htmlFor={`edit-title-${index}`}>Section Title:</Label>
                  <Input
                    id={`edit-title-${index}`}
                    value={editingSectionData.title}
                    onChange={(e) => onUpdateEditingSectionField('title', e.target.value)}
                    placeholder="Enter section title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`edit-instructions-${index}`}>Writing Instructions:</Label>
                  <Textarea
                    id={`edit-instructions-${index}`}
                    value={editingSectionData.writingInstructions}
                    onChange={(e) => onUpdateEditingSectionField('writingInstructions', e.target.value)}
                    placeholder="Enter detailed writing instructions for this section"
                    className="min-h-[120px]"
                  />
                </div>
                


                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={onSaveEditingSection}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Save Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelEditingSection}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 