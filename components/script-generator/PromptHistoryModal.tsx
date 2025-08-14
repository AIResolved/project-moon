'use client'

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SavedPrompt {
  id: string
  prompt?: string
  title?: string
  theme?: string
  audience?: string
  additional_context?: string
  POV?: string
  format?: string
}

interface PromptHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  savedPrompts: SavedPrompt[]
  loadingPrompts: boolean
  onApplyPrompt: (prompt: SavedPrompt) => void
}

export function PromptHistoryModal({
  isOpen,
  onClose,
  savedPrompts,
  loadingPrompts,
  onApplyPrompt
}: PromptHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saved Prompt Templates</DialogTitle>
          <DialogDescription>
            Select a saved prompt template to apply to your script generator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {(() => {
            console.log('🔍 Modal rendering - loadingPrompts:', loadingPrompts, 'savedPrompts.length:', savedPrompts.length);
            
            if (loadingPrompts) {
              console.log('📱 Rendering loading state');
              return (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Loading saved prompts...</p>
                  </div>
                </div>
              );
            } else if (savedPrompts.length === 0) {
              console.log('📱 Rendering empty state');
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No saved prompts found.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Prompts are managed by administrators and will appear here when available.
                  </p>
                </div>
              );
            } else {
              console.log('📱 Rendering prompts list with', savedPrompts.length, 'prompts');
              return savedPrompts.map((prompt) => (
                <div 
                  key={prompt.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors" 
                  onClick={() => onApplyPrompt(prompt)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-lg">{prompt.prompt || 'Untitled Prompt'}</h4>
                    <Button
                      size="sm"
                      variant="outline" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onApplyPrompt(prompt); 
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {prompt.title && (
                      <div>
                        <span className="font-medium">Title:</span> {prompt.title}
                      </div>
                    )}
                    {prompt.theme && (
                      <div>
                        <span className="font-medium">Theme:</span> {prompt.theme}
                      </div>
                    )}
                    {prompt.POV && (
                      <div>
                        <span className="font-medium">POV:</span> {prompt.POV}
                      </div>
                    )}
                    {prompt.format && (
                      <div>
                        <span className="font-medium">Format:</span> {prompt.format}
                      </div>
                    )}
                  </div>
                  {prompt.audience && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-600">Audience:</span> {prompt.audience}
                    </div>
                  )}
                  {prompt.additional_context && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-600">Context:</span>
                      <p className="text-xs bg-gray-100 p-2 rounded mt-1">{prompt.additional_context}</p>
                    </div>
                  )}
                </div>
              ));
            }
          })()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 