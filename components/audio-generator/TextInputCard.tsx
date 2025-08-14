'use client'

import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

interface TextInputCardProps {
  inputText: string
  onInputTextChange: (value: string) => void
}

export function TextInputCard({
  inputText,
  onInputTextChange
}: TextInputCardProps) {
  return (
    <Card className="bg-gray-800 shadow-sm border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="h-5 w-5" />
          Text Input
        </CardTitle>
        <CardDescription className="text-gray-300">
          Enter custom text or use generated scripts below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Custom Text</Label>
            <textarea
              value={inputText}
              onChange={(e) => onInputTextChange(e.target.value)}
              placeholder="Enter your text here to generate audio..."
              className="w-full h-32 p-3 border border-gray-600 bg-gray-700 text-white rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
            />
            {inputText.trim() && (
              <p className="text-sm text-gray-400 mt-1">
                {inputText.trim().split(/\s+/).length} words, {inputText.length} characters
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 