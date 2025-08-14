'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit, RefreshCw } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface FullScript {
  scriptWithMarkdown: string
  scriptCleaned: string
  title: string
  theme: string
  wordCount: number
}

interface FullScriptDisplayProps {
  fullScript: FullScript | null
  scriptWordCount: number
  isGeneratingScript: boolean
  isLoading: boolean
  scriptSegments: string[]
  editingSegmentIndex: number | null
  editingSegmentText: string
  
  // Handlers
  onStartEditingSegment: (index: number) => void
  onSaveEditingSegment: () => void
  onCancelEditingSegment: () => void
  onEditingSegmentTextChange: (text: string) => void
  onDirectRegeneration: (index: number, segmentContent: string) => void
}

export function FullScriptDisplay({
  fullScript,
  scriptWordCount,
  isGeneratingScript,
  isLoading,
  scriptSegments,
  editingSegmentIndex,
  editingSegmentText,
  onStartEditingSegment,
  onSaveEditingSegment,
  onCancelEditingSegment,
  onEditingSegmentTextChange,
  onDirectRegeneration
}: FullScriptDisplayProps) {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Full Script</h2>
          <p className="text-muted-foreground">
            The complete script based on your outline.
          </p>
        </div>
        {fullScript && (
          <div className="text-sm font-medium bg-primary/10 px-3 py-1 rounded-full">
            Word Count: {scriptWordCount}
          </div>
        )}
      </div>
      
      {!fullScript ? (
        <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {isGeneratingScript || isLoading
              ? "Generating your script..." 
              : "Click 'Generate Script' to create your content"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-card shadow-sm overflow-y-auto max-h-[600px]">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h1 className="text-xl font-bold mb-4">{fullScript.title}</h1>
              {/* Use ReactMarkdown for proper markdown rendering */}
              <ReactMarkdown
                components={{
                  // Remove h1, h2, h3 headers from the output
                  h1: () => null,
                  h2: () => null,
                  h3: () => null,
                  // Make strong text bold for CTAs and hooks
                  strong: ({ children }) => <strong className="font-bold text-blue-600">{children}</strong>
                }}
              >
                {fullScript.scriptWithMarkdown}
              </ReactMarkdown>
            </div>
          </div>
          
          {scriptSegments.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Script Segments</h3>
              <p className="text-sm text-muted-foreground">
                The script is divided into segments of approximately 500 words each for easier editing.
              </p>
              
              {scriptSegments.map((segment, index) => (
                <div key={index} className="border rounded-lg p-4 bg-card shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Segment {index + 1}</h4>
                    <div className="flex gap-2">
                      {editingSegmentIndex === index ? (
                        <>
                          <Button
                            size="sm"
                            onClick={onSaveEditingSegment}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={onCancelEditingSegment}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStartEditingSegment(index)}
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDirectRegeneration(index, segment)}
                            disabled={isGeneratingScript}
                          >
                            <RefreshCw size={14} className="mr-2" />
                            Regenerate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {editingSegmentIndex === index ? (
                    <Textarea
                      value={editingSegmentText}
                      onChange={(e) => onEditingSegmentTextChange(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Edit your segment text here..."
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          // Make strong text bold for CTAs and hooks
                          strong: ({ children }) => <strong className="font-bold text-blue-600">{children}</strong>
                        }}
                      >
                        {segment}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 