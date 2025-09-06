'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, File, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ScriptUploadProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadedScript: string
  onManualEntry: (script: string) => void
}

export function ScriptUpload({
  onFileUpload,
  uploadedScript,
  onManualEntry
}: ScriptUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')
  const [textScript, setTextScript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUploadWrapper = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type
    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a .txt or .docx file')
      return
    }

    setIsProcessing(true)

    try {
      let content = ''

      if (file.type === 'text/plain') {
        // Handle .txt files
        content = await file.text()
        
        if (!content.trim()) {
          toast.error('The uploaded file appears to be empty')
          return
        }

        // Create a synthetic event for the parent handler
        const syntheticEvent = {
          target: {
            files: [file],
            result: content.trim()
          }
        } as any

        // Call the parent's file upload handler
        onFileUpload(event)
        toast.success('File uploaded successfully!')
        
      } else {
        // Handle .docx files using an API endpoint
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/utils/parse-docx', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to parse document')
        }

        const data = await response.json()
        content = data.content

        if (!content.trim()) {
          toast.error('The uploaded document appears to be empty')
          return
        }

        // Call the manual entry handler for docx content
        onManualEntry(content.trim())
        toast.success('Document processed and uploaded successfully!')
      }
      
    } catch (error: any) {
      console.error('Error processing file:', error)
      toast.error(error.message || 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = () => {
    if (!textScript.trim()) {
      toast.error('Please enter a script')
      return
    }

    onManualEntry(textScript.trim())
    toast.success('Script uploaded successfully!')
    setTextScript('')
  }

  const scriptToDisplay = uploadedScript || textScript

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Final Script
          </CardTitle>
          <CardDescription>
            Upload a completed script file (.txt or .docx) or paste your script text directly
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Upload Method Selection */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${
            uploadMethod === 'file' 
              ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600' 
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
          }`}
          onClick={() => setUploadMethod('file')}
        >
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Upload File
            </CardTitle>
            <CardDescription className="text-xs">
              Upload .txt or .docx file
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors ${
            uploadMethod === 'text' 
              ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-600' 
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
          }`}
          onClick={() => setUploadMethod('text')}
        >
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm flex items-center justify-center gap-2">
              <File className="h-4 w-4" />
              Paste Text
            </CardTitle>
            <CardDescription className="text-xs">
              Paste script directly
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* File Upload Section */}
      {uploadMethod === 'file' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Script File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.doc"
                onChange={handleFileUploadWrapper}
                className="hidden"
                disabled={isProcessing}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">
                    {isProcessing ? 'Processing...' : 'Click to upload .txt or .docx file'}
                  </span>
                </div>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: .txt (plain text), .docx (Word document)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Text Input Section */}
      {uploadMethod === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Script Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="script-text">Paste your script here</Label>
              <Textarea
                id="script-text"
                value={textScript}
                onChange={(e) => setTextScript(e.target.value)}
                placeholder="Paste your complete script here..."
                className="min-h-40 resize-y"
                rows={10}
              />
            </div>
            <Button 
              onClick={handleTextSubmit}
              disabled={!textScript.trim()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Use This Script
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {scriptToDisplay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Script Preview
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Script Ready
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted border rounded-lg p-4 max-h-40 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {scriptToDisplay.length > 500 
                  ? `${scriptToDisplay.substring(0, 500)}...\n\n[Script continues for ${scriptToDisplay.length - 500} more characters]`
                  : scriptToDisplay
                }
              </pre>
            </div>
            <p className="text-xs text-muted-foreground">
              Script length: {scriptToDisplay.length} characters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}






