'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload } from "lucide-react"

interface AdvancedOptionsTabProps {
  inspirationalTranscript: string
  forbiddenWords: string
  onInspirationalTranscriptChange: (value: string) => void
  onForbiddenWordsChange: (value: string) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AdvancedOptionsTab({
  inspirationalTranscript,
  forbiddenWords,
  onInspirationalTranscriptChange,
  onForbiddenWordsChange,
  onFileUpload
}: AdvancedOptionsTabProps) {
  return (
    <div className="w-full space-y-6 p-6 bg-card rounded-lg border shadow-sm">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Advanced Options</h2>
        <p className="text-muted-foreground">
          Fine-tune your script generation with these advanced settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inspirationalTranscript">Inspirational Video Transcript</Label>
          <Textarea
            id="inspirationalTranscript"
            placeholder="Paste a transcript from a video that you'd like to use as inspiration"
            value={inspirationalTranscript}
            onChange={(e) => onInspirationalTranscriptChange(e.target.value)}
            className="min-h-[150px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="forbiddenWords">Forbidden Words (comma-separated)</Label>
          <Input
            id="forbiddenWords"
            placeholder="Words to avoid in the generated script, separated by commas"
            value={forbiddenWords}
            onChange={(e) => onForbiddenWordsChange(e.target.value)}
          />
        </div>
      
        <div className="space-y-2">
          <Label htmlFor="uploadScript">Upload Existing Script</Label>
          <div className="flex items-center gap-2">
            <Input
              id="uploadScript"
              type="file"
              accept=".txt,.md,.docx"
              onChange={onFileUpload}
              className="flex-1"
            />
            <Button variant="outline" className="gap-2">
              <Upload size={16} />
              Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 