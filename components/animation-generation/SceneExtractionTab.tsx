'use client'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  Plus,
  Trash2,
  X,
  Edit,
  Check
} from 'lucide-react'

interface ExtractedAnimationScene {
  id: string
  title: string
  prompt: string
  duration?: number
  effects?: string[]
}

interface SceneExtractionTabProps {
  scriptInput: string
  setScriptInput: (script: string) => void
  numberOfScenesToExtract: number
  setNumberOfScenesToExtract: (count: number) => void
  isExtractingScenes: boolean
  sceneExtractionError: string | null
  allPrompts: ExtractedAnimationScene[]
  mainContext: string
  setMainContext: (context: string) => void
  onExtractScenes: () => void
  onAddManualPrompt: () => void
  onRemovePrompt: (promptId: string) => void
  onEditPrompt: (promptId: string) => void
  onUsePromptForGeneration: (prompt: string) => void
  onClearAllPrompts: () => void
  animationPrompt: string
  setAnimationPrompt: (prompt: string) => void
  getScriptSourceInfo: () => { source: string; count: number; type: string }
  editingPromptId: string | null
  editingPromptText: string
  setEditingPromptText: (text: string) => void
  onSaveEditedPrompt: () => void
  onCancelEdit: () => void
}

export function SceneExtractionTab({
  scriptInput,
  setScriptInput,
  numberOfScenesToExtract,
  setNumberOfScenesToExtract,
  isExtractingScenes,
  sceneExtractionError,
  allPrompts,
  mainContext,
  setMainContext,
  onExtractScenes,
  onAddManualPrompt,
  onRemovePrompt,
  onEditPrompt,
  onUsePromptForGeneration,
  onClearAllPrompts,
  animationPrompt,
  setAnimationPrompt,
  getScriptSourceInfo,
  editingPromptId,
  editingPromptText,
  setEditingPromptText,
  onSaveEditedPrompt,
  onCancelEdit
}: SceneExtractionTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Extract & Manage Animation Prompts
        </CardTitle>
        <CardDescription>
          Extract prompts from scripts and manage your animation queue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Context Field */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Image/Character Context</Label>
          <Textarea
            placeholder="Describe what's in your reference image (e.g., 'a stickman figure on a white background', 'a red sports car in a garage')"
            value={mainContext}
            onChange={(e) => setMainContext(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <strong>💡 Tip:</strong> This context will be applied to all extracted scene prompts to ensure they match your reference image.
          </div>
        </div>

        {/* Scene Extraction Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <Label className="text-base font-medium">Extract Prompts from Script</Label>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Script Content</Label>
              {getScriptSourceInfo().count > 0 && (
                <Badge variant="outline" className="text-xs">
                  {getScriptSourceInfo().source}: {getScriptSourceInfo().count} {getScriptSourceInfo().type}
                </Badge>
              )}
            </div>
            <Textarea
              placeholder="Paste your script here to extract animation scenes..."
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              disabled={isExtractingScenes}
              rows={4}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">Number of Scenes</Label>
              <Input
                type="number"
                value={numberOfScenesToExtract}
                onChange={(e) => setNumberOfScenesToExtract(parseInt(e.target.value) || 5)}
                min={1}
                max={20}
                disabled={isExtractingScenes}
                className="text-sm"
              />
            </div>
            <Button
              onClick={onExtractScenes}
              disabled={isExtractingScenes || !scriptInput.trim()}
              size="default"
            >
              {isExtractingScenes ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Scenes
                </>
              )}
            </Button>
          </div>

          {sceneExtractionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 text-sm">Extraction Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{sceneExtractionError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Prompt Addition */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <Label className="text-base font-medium">Add Manual Prompt</Label>
          </div>
          
          <div className="space-y-3">
            <Textarea
              placeholder="Describe how you want the reference image to animate (e.g., 'slow zoom in with particles floating around')"
              value={animationPrompt}
              onChange={(e) => setAnimationPrompt(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <Button
              onClick={onAddManualPrompt}
              disabled={!animationPrompt.trim()}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Prompt List
            </Button>
          </div>
        </div>

        {/* Unified Prompt List */}
        {allPrompts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Animation Prompts ({allPrompts.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAllPrompts}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-3">
              {allPrompts.map((prompt, index) => (
                <div key={prompt.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm text-gray-900">{prompt.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {prompt.effects?.[0] === 'manual' ? '✍️ Manual' : '🤖 Extracted'}
                        </Badge>
                        {prompt.duration && (
                          <Badge variant="outline" className="text-xs">
                            {prompt.duration}s
                          </Badge>
                        )}
                      </div>
                      {editingPromptId === prompt.id ? (
                        <div className="mb-2">
                          <Textarea
                            value={editingPromptText}
                            onChange={(e) => setEditingPromptText(e.target.value)}
                            rows={3}
                            className="text-sm mb-2"
                            placeholder="Edit the prompt..."
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onSaveEditedPrompt}
                              className="text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={onCancelEdit}
                              className="text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          {prompt.prompt}
                        </p>
                      )}
                      {prompt.effects && prompt.effects.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {prompt.effects.slice(1).map((effect, effectIndex) => (
                            <Badge key={effectIndex} variant="secondary" className="text-xs">
                              {effect}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUsePromptForGeneration(prompt.prompt)}
                        className="text-xs"
                      >
                        Use for Generation
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEditPrompt(prompt.id)}
                        className="text-xs"
                        disabled={editingPromptId !== null}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemovePrompt(prompt.id)}
                        className="text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}