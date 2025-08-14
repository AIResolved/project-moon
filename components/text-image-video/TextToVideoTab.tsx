'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ScriptBasedVideoPrompts } from './ScriptBasedVideoPrompts'
import { ProviderModelSelector } from './ProviderModelSelector'
import { useAppSelector, useAppDispatch } from '../../lib/hooks'
import { 
  setScriptInput,
  setNumberOfScenesToExtract,
  startSceneExtraction,
  setExtractedScenes,
  setSceneExtractionError,
  clearSceneExtractionError,
  toggleSceneSelection,
  updateScenePrompt,
  addCustomScene
} from '../../lib/features/textImageVideo/textImageVideoSlice'
import { 
  Plus, 
  Trash2, 
  Video, 
  Wand2, 
  Clock,
  Zap,
  RefreshCw,
  Info,
  FileText
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
  const dispatch = useAppDispatch()
  
  // Local state (only for manual prompts)
  const [prompts, setPrompts] = useState<string[]>([''])
  const [duration, setDuration] = useState<5 | 10>(defaultDuration)
  const [bulkPrompts, setBulkPrompts] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)

  // Get state from Redux
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)
  const { scriptBasedPrompts } = useAppSelector(state => state.textImageVideo)
  
  // Destructure script-based prompt state from Redux
  const {
    scriptInput,
    numberOfScenesToExtract,
    isExtractingScenes,
    sceneExtractionError,
    extractedScenes,
    selectedScenes,
    scriptSummary
  } = scriptBasedPrompts

  // Handle individual prompt changes
  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts]
    newPrompts[index] = value
    setPrompts(newPrompts)
  }

  // Add new prompt
  const addPrompt = () => {
    setPrompts([...prompts, ''])
  }

  // Remove prompt
  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index))
    }
  }

  // Process bulk prompts
  const processBulkPrompts = () => {
    const lines = bulkPrompts.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (lines.length > 0) {
      setPrompts(lines)
      setBulkPrompts('')
      setShowBulkInput(false)
    }
  }

  // Handle generation
  const handleGenerate = async () => {
    const validPrompts = prompts.filter(p => p.trim().length > 0)
    if (validPrompts.length === 0) return

    // Immediate user notification
    alert('✅ Generation started! You can track progress under the "Current Generation" tab.')

    onDurationChange(duration)
    await onGenerate(validPrompts, duration)
  }

  // Get example prompts
  const getExamplePrompts = () => {
    const examples = [
      "Close-up of a 25-year-old woman with long brown hair in white dress walking through colorful flower garden, soft morning light, camera following",
      "Wide shot of powerful ocean waves crashing on sandy beach at golden sunset, seagulls flying overhead, dramatic lighting, slow motion",
      "Medium shot of a 30-year-old man in black jacket dancing in heavy rain on wet city street, neon lights reflecting, camera circling around",
      "Magical scene of hundreds of fireflies glowing in dark enchanted forest at midnight, misty atmosphere, camera slowly panning through trees",
      "Aerial shot of bright red hot air balloon floating over snow-capped mountains, clear blue sky, camera tracking alongside balloon"
    ]
    return examples
  }

  const loadExamplePrompts = () => {
    setPrompts(getExamplePrompts())
  }

  // Script-based handler functions
  const getScriptForExtraction = () => {
    if (scriptInput.trim()) {
      return scriptInput.trim()
    }
    if (fullScript?.scriptWithMarkdown) {
      return fullScript.scriptWithMarkdown
    }
    if (scriptSections.length > 0) {
      const sectionPrompts = scriptSections
        .map((s: any) => s.writingInstructions || '')
        .filter(Boolean)
      return sectionPrompts.join('\n\n')
    }
    return ''
  }

  const getScriptSourceInfo = () => {
    if (scriptInput.trim()) {
      return { source: 'custom', count: scriptInput.length, type: 'Custom script input' }
    }
    if (fullScript?.scriptWithMarkdown) {
      return { source: 'full', count: fullScript.scriptWithMarkdown.length, type: 'Full generated script' }
    }
    if (scriptSections.length > 0) {
      const sectionsText = scriptSections
        .map((s: any) => s.writingInstructions || '')
        .filter(Boolean)
        .join('\n\n')
      return { source: 'sections', count: sectionsText.length, type: `${scriptSections.length} section prompts` }
    }
    return { source: 'none', count: 0, type: 'No script available' }
  }

  const handleExtractVideoScenes = async () => {
    const scriptToExtract = getScriptForExtraction()
    if (!scriptToExtract) {
      dispatch(setSceneExtractionError('No script available to extract scenes from'))
      return
    }

    dispatch(startSceneExtraction())

    try {
      const response = await fetch('/api/extract-video-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptToExtract,
          numberOfScenes: numberOfScenesToExtract,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract video scenes')
      }

      const data = await response.json()
      dispatch(setExtractedScenes({
        scenes: data.scenes || [],
        scriptSummary: data.scriptSummary
      }))

    } catch (error) {
      console.error('Error extracting video scenes:', error)
      dispatch(setSceneExtractionError(error instanceof Error ? error.message : 'Failed to extract video scenes'))
    }
  }

  const handleToggleSceneSelection = (index: number) => {
    dispatch(toggleSceneSelection(index))
  }

  const handleClearSceneError = () => {
    dispatch(clearSceneExtractionError())
  }

  const handleUpdateScenePrompt = (index: number, newPrompt: string) => {
    dispatch(updateScenePrompt({ index, newPrompt }))
  }

  const handleAddCustomScene = (prompt: string, title: string) => {
    dispatch(addCustomScene({ prompt, title }))
  }

  const handleGenerateFromScript = async (videoPrompts: string[]) => {
    if (videoPrompts.length === 0) return
    
    // Immediate user notification
    alert('✅ Generation started! You can track progress under the "Current Generation" tab.')

    onDurationChange(duration)
    await onGenerate(videoPrompts, duration)
  }

  const validPrompts = prompts.filter(p => p.trim().length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Text to Video Generation
          </CardTitle>
          <CardDescription>
            Generate videos from text descriptions or script scenes using AI. Each prompt will create a {duration}-second video.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Provider and Model Selection */}
      <ProviderModelSelector mode="text-to-video" />

      {/* Tabs for Manual vs Script-based */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Manual Prompts
          </TabsTrigger>
          <TabsTrigger value="script" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Script-Based
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">{/* Manual prompt content */}

      {/* Duration Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-4 w-4 text-green-600" />
            Video Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={duration === 5 ? 'default' : 'outline'}
              onClick={() => setDuration(5)}
              disabled={isGenerating}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              5 Seconds
              <Badge variant="secondary" className="ml-2">Fast</Badge>
            </Button>
            <Button
              variant={duration === 10 ? 'default' : 'outline'}
              onClick={() => setDuration(10)}
              disabled={isGenerating}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              10 Seconds
              <Badge variant="secondary" className="ml-2">Detailed</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Input Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wand2 className="h-4 w-4 text-purple-600" />
            Video Prompts
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={!showBulkInput ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowBulkInput(false)}
            >
              Individual Prompts
            </Button>
            <Button
              variant={showBulkInput ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowBulkInput(true)}
            >
              Bulk Input
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadExamplePrompts}
              disabled={isGenerating}
            >
              Load Examples
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showBulkInput ? (
            // Individual prompts
            <div className="space-y-3">
              {prompts.map((prompt, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      Prompt {index + 1}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="e.g., Close-up of a 20-year-old blonde woman in red dress walking through park..."
                        value={prompt}
                        onChange={(e) => updatePrompt(index, e.target.value)}
                        disabled={isGenerating}
                      />
                      {prompts.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePrompt(index)}
                          disabled={isGenerating}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addPrompt}
                disabled={isGenerating || prompts.length >= 10}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Prompt {prompts.length >= 10 ? '(Max 10)' : ''}
              </Button>
            </div>
          ) : (
            // Bulk input
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Bulk Prompts (one per line)
              </Label>
              <Textarea
                placeholder="Enter detailed prompts, one per line:
Close-up of a 25-year-old woman with brown hair in white dress walking through garden
Wide shot of ocean waves crashing on beach at golden sunset, dramatic lighting
Medium shot of 30-year-old man in black jacket dancing in rain on city street"
                value={bulkPrompts}
                onChange={(e) => setBulkPrompts(e.target.value)}
                disabled={isGenerating}
                rows={6}
              />
              <Button
                onClick={processBulkPrompts}
                disabled={isGenerating || !bulkPrompts.trim()}
              >
                Process Bulk Prompts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Summary */}
      {validPrompts.length > 0 && (
        <Card className="bg-blue-900/20 border-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{validPrompts.length} Videos</Badge>
                  <Badge variant="secondary">{duration}s Each</Badge>
                  <Badge variant="secondary">
                    {Math.ceil(validPrompts.length / 5)} Batch{Math.ceil(validPrompts.length / 5) !== 1 ? 'es' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-blue-700">
                  Total generation time: ~{validPrompts.length * 30} seconds + batch delays
                </p>
              </div>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || validPrompts.length === 0}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate {validPrompts.length} Video{validPrompts.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips and Info */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Text-to-Video Tips</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Be very specific about character details: age, gender, appearance, clothing</li>
                <li>• Include precise actions, settings, and visual details</li>
                <li>• Include camera movements like "close-up", "wide shot", "panning", "tracking"</li>
                <li>• Mention lighting conditions: "sunset", "soft lighting", "dramatic shadows"</li>
                <li>• Videos are processed in batches of 5 with 1-minute delays between batches</li>
                <li>• Detailed prompts (20-35 words) with character specifics produce better results</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-6">
          {/* Duration Selection for Script-based */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-4 w-4 text-green-600" />
                Video Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={duration === 5 ? 'default' : 'outline'}
                  onClick={() => setDuration(5)}
                  disabled={isGenerating || isExtractingScenes}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  5 Seconds
                  <Badge variant="secondary" className="ml-2">Fast</Badge>
                </Button>
                <Button
                  variant={duration === 10 ? 'default' : 'outline'}
                  onClick={() => setDuration(10)}
                  disabled={isGenerating || isExtractingScenes}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  10 Seconds
                  <Badge variant="secondary" className="ml-2">Detailed</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Script-based Video Prompts Component */}
          <ScriptBasedVideoPrompts
            scriptInput={scriptInput}
            onScriptInputChange={(value: string) => dispatch(setScriptInput(value))}
            numberOfScenesToExtract={numberOfScenesToExtract}
            onNumberOfScenesChange={(value: number) => dispatch(setNumberOfScenesToExtract(value))}
            isExtractingScenes={isExtractingScenes}
            sceneExtractionError={sceneExtractionError}
            extractedScenes={extractedScenes}
            selectedScenes={selectedScenes}
            onToggleSceneSelection={handleToggleSceneSelection}
            onExtractScenes={handleExtractVideoScenes}
            onClearError={handleClearSceneError}
            onUpdateScenePrompt={handleUpdateScenePrompt}
            onAddCustomScene={handleAddCustomScene}
            scriptSourceInfo={getScriptSourceInfo()}
            onGenerateVideos={handleGenerateFromScript}
          />

          {/* Script-based Tips */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">Script-Based Video Generation Tips</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Script summary provides context for each scene's video prompt</li>
                    <li>• Each chunk is processed with full story context for narrative consistency</li>
                    <li>• Video prompts include specific character details (age, gender, appearance, clothing)</li>
                    <li>• Prompts focus on actions, movements, camera work, and detailed environments</li>
                    <li>• You can edit individual prompts to adjust character descriptions before generating</li>
                    <li>• Add custom scenes with specific character details for moments not captured in extraction</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 