'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '../../lib/hooks'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ProviderModelSelector } from './ProviderModelSelector'
import { VideoSceneExtraction } from './VideoSceneExtraction'
import { VIDEO_PROVIDERS, ExtractedVideoScene } from '../../types/text-image-video-generation'
import { 
  Plus, 
  Trash2, 
  Video, 
  Clock,
  Zap,
  RefreshCw,
  X,
  Grid,
  CheckSquare,
  Square,
  FileText,
  Edit3
} from 'lucide-react'

interface TextToVideoTabProps {
  defaultDuration: 5 | 10
  isGenerating: boolean
  onGenerate: (prompts: string[], duration: 5 | 10) => Promise<void>
  onDurationChange: (duration: 5 | 10) => void
}

export function TextToVideoTab({
  defaultDuration,
  isGenerating,
  onGenerate,
  onDurationChange
}: TextToVideoTabProps) {
  // Get Redux state
  const { selectedProvider, selectedModel } = useAppSelector(state => state.textImageVideo)
  const { fullScript } = useAppSelector(state => state.scripts)
  
  // Local state (only for manual prompts)
  const [prompts, setPrompts] = useState<string[]>([''])
  const [duration, setDuration] = useState<5 | 10>(defaultDuration)
  const [bulkPrompts, setBulkPrompts] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  
  // Scene extraction state
  const [scriptInput, setScriptInput] = useState('')
  const [numberOfScenesToExtract, setNumberOfScenesToExtract] = useState(5)
  const [isExtractingScenes, setIsExtractingScenes] = useState(false)
  const [sceneExtractionError, setSceneExtractionError] = useState<string | null>(null)
  const [extractedScenes, setExtractedScenes] = useState<ExtractedVideoScene[]>([])
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'script'>('manual')
  
  // Update duration when defaultDuration changes
  useEffect(() => {
    setDuration(defaultDuration)
  }, [defaultDuration])

  // Auto-populate script input when fullScript is available
  useEffect(() => {
    if (fullScript?.scriptWithMarkdown && !scriptInput.trim()) {
      setScriptInput(fullScript.scriptWithMarkdown)
      // Automatically switch to script tab when script is loaded
      setActiveTab('script')
    }
  }, [fullScript?.scriptWithMarkdown, scriptInput])

  // Helper function to get script for extraction
  const getScriptForExtraction = () => {
    if (scriptInput.trim()) {
      return scriptInput.trim()
    }
    return fullScript?.scriptWithMarkdown?.trim() || null
  }

  // Get script source info for display
  const getScriptSourceInfo = () => {
    const scriptToUse = getScriptForExtraction()
    if (!scriptToUse) {
      return { source: 'No script', count: 0, type: 'available' }
    }
    if (scriptInput.trim()) {
      return { source: 'Manual input', count: scriptInput.trim().split('\n').length, type: 'lines' }
    }
    return { source: 'Generated script', count: fullScript?.scriptWithMarkdown?.split('\n').length || 0, type: 'lines' }
  }

  // Scene extraction functions
  const handleExtractScenes = async () => {
    const scriptToUse = getScriptForExtraction()
    
    if (!scriptToUse) {
      setSceneExtractionError('No script available. Please generate a script first or paste one in the script input.')
      return
    }

    setIsExtractingScenes(true)
    setSceneExtractionError(null)

    try {
      const response = await fetch('/api/extract-video-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptToUse,
          numberOfScenes: numberOfScenesToExtract,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract video scenes')
      }

      const data = await response.json()
      setExtractedScenes(data.scenes || [])
      // Auto-select all extracted scenes
      setSelectedScenes(data.scenes ? data.scenes.map((_: any, index: number) => index) : [])
    } catch (error) {
      console.error('Error extracting video scenes:', error)
      setSceneExtractionError(
        error instanceof Error ? error.message : 'Failed to extract video scenes'
      )
    } finally {
      setIsExtractingScenes(false)
    }
  }

  const handleToggleSceneSelection = (index: number) => {
    setSelectedScenes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleUpdateScenePrompt = (index: number, newPrompt: string) => {
    setExtractedScenes(prev => 
      prev.map((scene, i) => 
        i === index ? { ...scene, videoPrompt: newPrompt } : scene
      )
    )
  }

  const handleAddCustomScene = (prompt: string, title: string) => {
    const newScene: ExtractedVideoScene = {
      chunkIndex: extractedScenes.length,
      originalText: title,
      videoPrompt: prompt,
      searchQuery: '',
      summary: title,
    }
    setExtractedScenes(prev => [...prev, newScene])
    setSelectedScenes(prev => [...prev, extractedScenes.length])
  }

  const handleClearSceneError = () => {
    setSceneExtractionError(null)
  }

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts]
    newPrompts[index] = value
    setPrompts(newPrompts)
  }

  const addPrompt = () => {
    setPrompts([...prompts, ''])
  }

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index))
    }
  }

  const handleBulkPromptsSubmit = () => {
    if (bulkPrompts.trim()) {
      const newPrompts = bulkPrompts
        .split('\n')
        .map(prompt => prompt.trim())
        .filter(prompt => prompt.length > 0)
      
      if (newPrompts.length > 0) {
        setPrompts(newPrompts)
        setBulkPrompts('')
        setShowBulkInput(false)
      }
    }
  }

  const handleGenerate = async () => {
    let validPrompts: string[] = []
    
    if (activeTab === 'manual') {
      // Filter out empty prompts from manual input
      validPrompts = prompts.filter(p => p.trim())
    } else if (activeTab === 'script') {
      // Get prompts from selected scenes
      validPrompts = selectedScenes.map(index => extractedScenes[index].videoPrompt)
    }
    
    if (validPrompts.length === 0) return

    onDurationChange(duration)
    await onGenerate(validPrompts, duration)
  }

  const getProviderConfig = () => {
    return VIDEO_PROVIDERS[selectedProvider]
  }

  const getModelConfig = () => {
    const providerConfig = getProviderConfig()
    if (!providerConfig?.textToVideoModels) return null
    return providerConfig.textToVideoModels[selectedModel as keyof typeof providerConfig.textToVideoModels] as any
  }

  const modelConfig = getModelConfig()
  const supportedDurations = modelConfig?.supportedDurations || [5, 10]

  return (
    <div className="space-y-6">
      {/* Provider & Model Selection */}
      <ProviderModelSelector mode="text-to-video" />

      {/* Video Generation Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'script')} className="space-y-6">
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-400" />
              Text to Video Generation
            </CardTitle>
            <CardDescription className="text-gray-300">
              Create videos from text prompts manually or extract scenes from your script automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Manual Prompts
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Script Extraction
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="manual" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Manual Video Prompts</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkInput(!showBulkInput)}
                  className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                >
                  <Grid className="h-4 w-4 mr-1" />
                  {showBulkInput ? 'Single Mode' : 'Bulk Mode'}
                </Button>
              </div>
              <CardDescription className="text-gray-300">
                Enter descriptive prompts for video generation. Be specific about scenes, actions, and visual details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showBulkInput ? (
                // Bulk input mode
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bulk Prompts (one per line)</Label>
                    <Textarea
                      placeholder="Enter multiple prompts, one per line&#10;Example:&#10;A serene sunset over ocean waves&#10;A bustling city street at night&#10;A peaceful forest with morning light"
                      value={bulkPrompts}
                      onChange={(e) => setBulkPrompts(e.target.value)}
                      rows={8}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkPromptsSubmit}>
                      Apply Prompts
                    </Button>
                    <Button variant="outline" onClick={() => setBulkPrompts('')}>
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                // Individual prompt inputs
                <div className="space-y-4">
                  {prompts.map((prompt, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm text-gray-300">Prompt {index + 1}</Label>
                        <Textarea
                          placeholder="Describe the video you want to generate in detail..."
                          value={prompt}
                          onChange={(e) => updatePrompt(index, e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-col gap-1 mt-6">
                        {prompts.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePrompt(index)}
                            className="text-red-400 border-red-400 hover:bg-red-400/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={addPrompt}
                      className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Prompt
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-6">
          <VideoSceneExtraction
            scriptInput={scriptInput}
            onScriptInputChange={setScriptInput}
            numberOfScenesToExtract={numberOfScenesToExtract}
            onNumberOfScenesChange={setNumberOfScenesToExtract}
            isExtractingScenes={isExtractingScenes}
            sceneExtractionError={sceneExtractionError}
            extractedScenes={extractedScenes}
            selectedScenes={selectedScenes}
            onToggleSceneSelection={handleToggleSceneSelection}
            onExtractScenes={handleExtractScenes}
            onClearError={handleClearSceneError}
            onUpdateScenePrompt={handleUpdateScenePrompt}
            onAddCustomScene={handleAddCustomScene}
            scriptSourceInfo={getScriptSourceInfo()}
          />
        </TabsContent>

        {/* Duration & Generation Controls */}
        <Card className="bg-gray-900 border-gray-700 text-white">
          <CardContent className="space-y-4 pt-6">
            {/* Duration Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <Label>Video Duration</Label>
                <Badge variant="outline" className="text-xs">
                  {modelConfig?.name || selectedModel}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                {supportedDurations.map((dur: number) => (
                  <Button
                    key={dur}
                    variant={duration === dur ? 'default' : 'outline'}
                    onClick={() => {
                      setDuration(dur as 5 | 10)
                      onDurationChange(dur as 5 | 10)
                    }}
                    disabled={isGenerating}
                    className="flex-1 h-12"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {dur}s
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-600" />

            {/* Generation Controls */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || (activeTab === 'manual' && prompts.every(p => p.trim().length === 0)) || (activeTab === 'script' && selectedScenes.length === 0)}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Videos...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Videos ({activeTab === 'manual' ? prompts.filter(p => p.trim().length > 0).length : selectedScenes.length})
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {activeTab === 'manual' ? prompts.filter(p => p.trim().length > 0).length : selectedScenes.length} prompt(s) × {duration}s duration
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}
