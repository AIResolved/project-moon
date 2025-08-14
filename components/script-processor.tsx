'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { 
  setPastedScript, 
  setUploadedFile, 
  setVisualStyle, 
  setMood, 
  setLighting,
  setCustomParameters,
  setChunks,
  setSelectedSceneCount,
  startProcessing,
  updateProcessingProgress,
  setPrompts,
  updatePrompt,
  completeProcessing,
  setError,
  clearError,
  clearScript,
  ScriptChunk,
  GeneratedPrompt
} from '@/lib/features/scriptProcessor/scriptProcessorSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Upload, 
  Scissors, 
  Wand2, 
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Copy
} from 'lucide-react'
import mammoth from 'mammoth'

const VISUAL_STYLE_OPTIONS = [
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'artistic', label: 'Artistic/Painterly' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'cartoon', label: 'Cartoon/Animated' },
  { value: 'vintage', label: 'Vintage/Retro' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'fantasy', label: 'Fantasy/Surreal' }
]

const MOOD_OPTIONS = [
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'bright-cheerful', label: 'Bright & Cheerful' },
  { value: 'dark-moody', label: 'Dark & Moody' },
  { value: 'peaceful-serene', label: 'Peaceful & Serene' },
  { value: 'energetic', label: 'Energetic & Dynamic' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'intense', label: 'Intense & Powerful' }
]

const LIGHTING_OPTIONS = [
  { value: 'natural', label: 'Natural Lighting' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'dramatic', label: 'Dramatic Lighting' },
  { value: 'soft', label: 'Soft Lighting' },
  { value: 'neon', label: 'Neon/Artificial' },
  { value: 'backlit', label: 'Backlit' },
  { value: 'studio', label: 'Studio Lighting' },
  { value: 'ambient', label: 'Ambient/Atmospheric' }
]

export function ScriptProcessor() {
  const dispatch = useAppDispatch()
  const {
    pastedScript,
    fileName,
    visualStyle,
    mood,
    lighting,
    customParameters,
    chunks,
    selectedSceneCount,
    maxScenes,
    prompts,
    hasGeneratedPrompts,
    isProcessing,
    processingProgress,
    lastProcessedAt,
    error
  } = useAppSelector(state => state.scriptProcessor)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  // Text chunking function
  const chunkTextByWords = useCallback((text: string, numChunks: number): ScriptChunk[] => {
    if (!text.trim()) return []
    
    const words = text.trim().split(/\s+/)
    const wordsPerChunk = Math.ceil(words.length / numChunks)
    const chunks: ScriptChunk[] = []
    
    for (let i = 0; i < numChunks; i++) {
      const startIndex = i * wordsPerChunk
      const endIndex = Math.min(startIndex + wordsPerChunk, words.length)
      const chunkWords = words.slice(startIndex, endIndex)
      
      if (chunkWords.length > 0) {
        chunks.push({
          id: `chunk-${i + 1}`,
          text: chunkWords.join(' '),
          wordCount: chunkWords.length,
          chunkIndex: i
        })
      }
    }
    
    return chunks
  }, [])

  // Auto-chunk when script or scene count changes
  useEffect(() => {
    const scriptText = pastedScript || (fileName ? 'File uploaded - content will be processed' : '')
    if (scriptText.trim()) {
      const newChunks = chunkTextByWords(scriptText, selectedSceneCount)
      dispatch(setChunks(newChunks))
    }
  }, [pastedScript, selectedSceneCount, fileName, chunkTextByWords, dispatch])

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.docx')) {
      showMessage('Please upload a .docx file', 'error')
      return
    }

    try {
      dispatch(clearError())
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      if (result.value.trim()) {
        dispatch(setPastedScript(result.value))
        dispatch(setUploadedFile(file.name))
        showMessage(`Successfully loaded ${file.name}`, 'success')
      } else {
        showMessage('No text content found in the document', 'error')
      }
    } catch (error) {
      console.error('Error processing DOCX file:', error)
      showMessage('Failed to process DOCX file', 'error')
    }
  }

  // Handle script paste
  const handleScriptChange = (value: string) => {
    dispatch(setPastedScript(value))
  }

  // Process and generate prompts
  const handleProcessAndGenerate = async () => {
    console.log('🚀 Starting process and generate...')
    console.log('Chunks length:', chunks.length)
    console.log('Pasted script length:', pastedScript.length)
    console.log('File name:', fileName)
    console.log('Has script content:', hasScriptContent)
    console.log('Pasted script preview:', pastedScript.substring(0, 100) + '...')
    
    if (chunks.length === 0) {
      console.log('❌ No chunks available')
      showMessage('No script chunks available to process', 'error')
      return
    }

    if (!pastedScript || pastedScript.trim() === '') {
      console.log('❌ No script content found')
      showMessage('No script content found to process', 'error')
      return
    }

    console.log('✅ All checks passed, starting processing...')
    dispatch(startProcessing())
    dispatch(clearError())

    try {
      // Use the script that's already in state (either pasted or from uploaded file)
      const finalChunks = chunkTextByWords(pastedScript, selectedSceneCount)
      dispatch(setChunks(finalChunks))

      console.log('📝 Final chunks:', finalChunks.length)

      const totalChunks = finalChunks.length

      // Create all API requests asynchronously
      const apiRequests = finalChunks.map(async (chunk, i) => {
        console.log(`🔄 Starting request for chunk ${i + 1}/${totalChunks}`)
        
        try {
          const response = await fetch('/api/process-script', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chunkText: chunk.text,
              chunkIndex: i,
              totalChunks: totalChunks,
              visualStyle: visualStyle,
              mood: mood,
              lighting: lighting,
              customParameters: customParameters,
              chunkId: chunk.id
            }),
          })

          console.log(`📡 API response status for chunk ${i + 1}:`, response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ API error for chunk ${i + 1}:`, errorText)
            throw new Error(`Failed to process chunk ${i + 1}: ${response.status} ${errorText}`)
          }

          const data = await response.json()
          console.log(`✅ API response data for chunk ${i + 1}:`, data)
          
          return {
            chunkId: chunk.id,
            prompt: data.prompt || `Generated prompt for chunk ${i + 1}`,
            searchQuery: data.searchQuery || '',
            generated: true,
            index: i
          }
          
        } catch (error) {
          console.error(`❌ Error processing chunk ${i + 1}:`, error)
          return {
            chunkId: chunk.id,
            prompt: `Error processing chunk ${i + 1}: ${(error as Error).message}`,
            searchQuery: '',
            generated: false,
            index: i
          }
        }
      })

      // Execute all requests in parallel and update progress as they complete
      const results = await Promise.allSettled(apiRequests)
      
      // Process results and update state
      const generatedPrompts: GeneratedPrompt[] = []
      let completedCount = 0

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const prompt = result.value
          generatedPrompts.push({
            chunkId: prompt.chunkId,
            prompt: prompt.prompt,
            searchQuery: prompt.searchQuery,
            generated: prompt.generated
          })
          dispatch(updatePrompt({
            chunkId: prompt.chunkId,
            prompt: prompt.prompt,
            searchQuery: prompt.searchQuery,
            generated: prompt.generated
          }))
        } else {
          // Handle rejected promises
          const chunk = finalChunks[index]
          const errorPrompt = {
            chunkId: chunk.id,
            prompt: `Error processing chunk ${index + 1}: ${result.reason}`,
            searchQuery: '',
            generated: false
          }
          generatedPrompts.push(errorPrompt)
          dispatch(updatePrompt(errorPrompt))
        }
        
        completedCount++
        const progress = Math.round((completedCount / totalChunks) * 100)
        dispatch(updateProcessingProgress(progress))
      })

      dispatch(setPrompts(generatedPrompts))
      dispatch(completeProcessing())
      
      const successCount = generatedPrompts.filter(p => p.generated).length
      showMessage(`Successfully generated prompts for ${successCount} out of ${totalChunks} chunks`, 'success')

    } catch (error) {
      console.error('💥 Error during processing:', error)
      dispatch(setError((error as Error).message))
      showMessage('Failed to process script: ' + (error as Error).message, 'error')
    }
  }

  // Copy prompt to clipboard
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    showMessage('Prompt copied to clipboard', 'success')
  }

  // Download prompts as text file
  const downloadPrompts = () => {
    if (prompts.length === 0) return

    const content = prompts.map((prompt: any, index: number) => 
      `Chunk ${index + 1}:\n${prompt.prompt}\n\n---\n\n`
    ).join('')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `script-prompts-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasScriptContent = pastedScript.trim() || fileName
  const totalWords = pastedScript ? pastedScript.trim().split(/\s+/).length : 0

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Script Processor</h1>
        <p className="text-gray-600">
          Upload a DOCX file or paste your script, then generate visual prompts for each scene
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <Alert className={messageType === 'error' ? 'border-red-200 bg-red-50' : 
                         messageType === 'success' ? 'border-green-200 bg-green-50' : 
                         'border-blue-200 bg-blue-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Script Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Script Input
          </CardTitle>
          <CardDescription>
            Upload a DOCX file or paste your script directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload DOCX File</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              {fileName && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{fileName}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatch(clearScript())}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Text Input */}
          <div className="space-y-2">
            <Label>Or Paste Script</Label>
            <Textarea
              placeholder="Paste your script here..."
              value={pastedScript}
              onChange={(e) => handleScriptChange(e.target.value)}
              className="min-h-[200px]"
            />
            {totalWords > 0 && (
              <p className="text-sm text-gray-500">{totalWords} words</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Parameters */}
      {hasScriptContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Image Generation Parameters
            </CardTitle>
            <CardDescription>
              Configure the visual style and characteristics for the images you want to generate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Visual Style</Label>
                <Select value={visualStyle} onValueChange={(value: string) => dispatch(setVisualStyle(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUAL_STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mood & Atmosphere</Label>
                <Select value={mood} onValueChange={(value: string) => dispatch(setMood(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lighting Style</Label>
                <Select value={lighting} onValueChange={(value: string) => dispatch(setLighting(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIGHTING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Visual Instructions (Optional)</Label>
              <Textarea
                placeholder="e.g., 'high resolution, detailed textures, wide angle shot, vibrant colors, professional photography'..."
                value={customParameters}
                onChange={(e) => dispatch(setCustomParameters(e.target.value))}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scene Configuration */}
      {hasScriptContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Scene Configuration
            </CardTitle>
            <CardDescription>
              Split your script into scenes and configure the number of visual prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Scenes: {selectedSceneCount}</Label>
                <Slider
                  value={[selectedSceneCount]}
                  onValueChange={(value) => dispatch(setSelectedSceneCount(value[0]))}
                  max={maxScenes}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1 scene</span>
                  <span>{maxScenes} scenes (max)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Button */}
      {hasScriptContent && chunks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleProcessAndGenerate}
              disabled={isProcessing || chunks.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing... ({processingProgress}%)
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Process & Generate Prompts ({chunks.length} scenes)
                </>
              )}
            </Button>

            {isProcessing && (
              <div className="mt-4">
                <Progress value={processingProgress} className="w-full" />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Generating prompts for script chunks...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Prompts */}
      {prompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Generated Prompts
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPrompts}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download All
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {prompts.filter((p: any) => p.generated).length} of {prompts.length} prompts generated successfully
              {lastProcessedAt && (
                <span className="block text-xs text-gray-400 mt-1">
                  Last processed: {new Date(lastProcessedAt).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prompts.map((promptData: any, index: number) => (
                <div key={promptData.chunkId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Scene {index + 1}</span>
                      <Badge variant={promptData.generated ? "default" : "destructive"}>
                        {promptData.generated ? "Generated" : "Error"}
                      </Badge>
                    </div>
                    {promptData.generated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPrompt(promptData.prompt)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm whitespace-pre-wrap">{promptData.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
} 