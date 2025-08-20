'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, File, X, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ScriptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onScriptUpload: (script: string) => void
}

export function ScriptUploadModal({
  isOpen,
  onClose,
  onScriptUpload
}: ScriptUploadModalProps) {
  const [uploadedScript, setUploadedScript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      }

      if (!content.trim()) {
        toast.error('The uploaded file appears to be empty')
        return
      }

      setUploadedScript(content.trim())
      toast.success('File uploaded successfully!')
      
    } catch (error: any) {
      console.error('Error processing file:', error)
      toast.error(error.message || 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = () => {
    if (!uploadedScript.trim()) {
      toast.error('Please provide a script')
      return
    }

    onScriptUpload(uploadedScript.trim())
    toast.success('Script uploaded successfully!')
    onClose()
    
    // Reset state
    setUploadedScript('')
    setUploadMethod('file')
  }

  const handleClose = () => {
    setUploadedScript('')
    setUploadMethod('file')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-950 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5" />
            Upload Final Script
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Upload a completed script file (.txt or .docx) or paste your script text directly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Method Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-colors ${
                uploadMethod === 'file' 
                  ? 'bg-blue-900/30 border-blue-600' 
                  : 'bg-gray-900/50 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setUploadMethod('file')}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-sm text-white flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  Upload File
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Upload .txt or .docx file
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className={`cursor-pointer transition-colors ${
                uploadMethod === 'text' 
                  ? 'bg-green-900/30 border-green-600' 
                  : 'bg-gray-900/50 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setUploadMethod('text')}
            >
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-sm text-white flex items-center justify-center gap-2">
                  <File className="h-4 w-4" />
                  Paste Text
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Paste script directly
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* File Upload Section */}
          {uploadMethod === 'file' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="script-file" className="text-sm font-medium text-white">
                  Choose Script File
                </Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    id="script-file"
                    type="file"
                    accept=".txt,.docx,.doc"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full h-20 border-2 border-dashed border-gray-600 bg-gray-900/50 hover:bg-gray-800/50 text-gray-300"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">
                        {isProcessing ? 'Processing...' : 'Click to upload .txt or .docx file'}
                      </span>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Supported formats: .txt (plain text), .docx (Word document)
                </p>
              </div>
            </div>
          )}

          {/* Text Input Section */}
          {uploadMethod === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="script-text" className="text-sm font-medium text-white">
                Script Content
              </Label>
              <Textarea
                id="script-text"
                value={uploadedScript}
                onChange={(e) => setUploadedScript(e.target.value)}
                placeholder="Paste your complete script here..."
                className="min-h-40 bg-gray-900 border-gray-600 text-white placeholder-gray-400 resize-y"
                rows={10}
              />
            </div>
          )}

          {/* Preview Section */}
          {uploadedScript && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-white">Script Preview</Label>
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Script Ready
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {uploadedScript.length > 500 
                    ? `${uploadedScript.substring(0, 500)}...\n\n[Script continues for ${uploadedScript.length - 500} more characters]`
                    : uploadedScript
                  }
                </pre>
              </div>
              <p className="text-xs text-gray-400">
                Script length: {uploadedScript.length} characters
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!uploadedScript.trim() || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Use This Script
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
