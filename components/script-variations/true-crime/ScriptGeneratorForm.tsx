'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { History, Database } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StaggerContainer, StaggerItem, ScaleOnHover } from "../../animated-page"

interface OpenAIModel {
  id: string
  owned_by: string
}

interface ScriptGeneratorFormProps {
  // Form values
  title: string
  targetSections: number
  theme: string
  povSelection: string
  scriptFormat: string
  audience: string
  selectedModel: string
  sectionPrompt: string
  scriptPrompt: string
  additionalPrompt: string
  researchContext: string
  
  // Form handlers
  onTitleChange: (value: string) => void
  onTargetSectionsChange: (value: number) => void
  onThemeChange: (value: string) => void
  onPovSelectionChange: (value: string) => void
  onScriptFormatChange: (value: string) => void
  onAudienceChange: (value: string) => void
  onModelChange: (value: string) => void
  onSectionPromptChange: (value: string) => void
  onScriptPromptChange: (value: string) => void
  onAdditionalPromptChange: (value: string) => void
  onResearchContextChange: (value: string) => void
  onClearResearch: () => void
  onPreviewResearch: () => void
  
  // Actions
  onGenerateOutline: () => void
  onGenerateFullScript: () => void
  onDownloadDocx: () => void
  onOpenPromptHistory: () => void
  onOpenLoadCachedData: () => void
  
  // State
  models: OpenAIModel[]
  isLoading: boolean
  isGeneratingScript: boolean
  hasScriptSections: boolean
  hasFullScript: boolean
  scriptGenerationError: string | null
}

export function ScriptGeneratorForm({
  title,
  targetSections,
  theme,
  povSelection,
  scriptFormat,
  audience,
  selectedModel,
  sectionPrompt,
  scriptPrompt,
  additionalPrompt,
  researchContext,
  onTitleChange,
  onTargetSectionsChange,
  onThemeChange,
  onPovSelectionChange,
  onScriptFormatChange,
  onAudienceChange,
  onModelChange,
  onSectionPromptChange,
  onScriptPromptChange,
  onAdditionalPromptChange,
  onResearchContextChange,
  onClearResearch,
  onPreviewResearch,
  onGenerateOutline,
  onGenerateFullScript,
  onDownloadDocx,
  onOpenPromptHistory,
  onOpenLoadCachedData,
  models,
  isLoading,
  isGeneratingScript,
  hasScriptSections,
  hasFullScript,
  scriptGenerationError
}: ScriptGeneratorFormProps) {
  const openAIModels = models.filter(m => m.owned_by === 'openai')
  const anthropicModels = models.filter(m => m.owned_by === 'anthropic')
  const customModels = models.filter(m => m.owned_by !== 'openai' && m.owned_by !== 'anthropic')

  return (
    <StaggerContainer className="w-full space-y-6 p-6 bg-card rounded-lg border shadow-sm">
      <StaggerItem>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Script Generator</h2>
          <p className="text-muted-foreground">
            Create a script using AI. Fill in the details below.
          </p>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <div className="flex gap-2">
            <ScaleOnHover>
              <Button
                variant="outline"
                onClick={onOpenLoadCachedData}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Load Cached Data
              </Button>
            </ScaleOnHover>
            <ScaleOnHover>
              <Button
                variant="outline"
                onClick={onOpenPromptHistory}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Prompt History
              </Button>
            </ScaleOnHover>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="flex justify-between">
            <span>Title</span>
            {!title && <span className="text-red-500 text-xs">Required for regeneration</span>}
          </Label>
          <Input
            id="title"
            placeholder="Enter a title for your script"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={!title ? "border-red-300 focus-visible:ring-red-500" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetSections">Number of Sections</Label>
          <Input
            id="targetSections"
            type="number"
            min={2}
            max={8}
            step={1}
            value={targetSections}
            onChange={(e) => onTargetSectionsChange(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Create {targetSections} logical sections with natural story divisions
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>GPT-5</SelectLabel>
                <SelectItem value="gpt-5">gpt-5</SelectItem>
                <SelectItem value="gpt-5-mini">gpt-5-mini</SelectItem>
                <SelectItem value="gpt-5-nano">gpt-5-nano</SelectItem>
              </SelectGroup>
              {openAIModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>OpenAI</SelectLabel>
                  {openAIModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {anthropicModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Anthropic</SelectLabel>
                  {anthropicModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {customModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Custom</SelectLabel>
                  {customModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id} ({model.owned_by})
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme" className="flex justify-between">
            <span>Story Theme</span>
          </Label>
          <Input
            id="theme"
            placeholder="E.g., Mystery, Romance, Sci-Fi"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
          />
        </div>
        </div>
      </StaggerItem>

      {/* Second row of inputs for new fields */}
      <StaggerItem>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="povSelection">POV Selection</Label>
          <Select value={povSelection} onValueChange={onPovSelectionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select POV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Person">1st Person</SelectItem>
              <SelectItem value="3rd Person">3rd Person</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scriptFormat">Format of Scripting</Label>
          <Select value={scriptFormat} onValueChange={onScriptFormatChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Story">Story</SelectItem>
              <SelectItem value="Facts">Facts</SelectItem>
              <SelectItem value="Documentary">Documentary</SelectItem>
              <SelectItem value="Tutorial">Tutorial</SelectItem>
              <SelectItem value="Interview">Interview</SelectItem>
              <SelectItem value="Presentation">Presentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience</Label>
          <Input
            id="audience"
            placeholder="E.g., Young adults, Professionals, General audience"
            value={audience}
            onChange={(e) => onAudienceChange(e.target.value)}
          />
        </div>
        </div>
      </StaggerItem>

      {/* Research Context Box */}
      {researchContext && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="researchContext" className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Applied Research Context
            </Label>
            <div className="flex gap-2">
              <button
                onClick={onPreviewResearch}
                className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview Research
              </button>
              <button
                onClick={onClearResearch}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Clear Research
              </button>
            </div>
          </div>
          <Textarea
            id="researchContext"
            value={researchContext}
            onChange={(e) => onResearchContextChange(e.target.value)}
            className="min-h-[120px] bg-blue-50 border-blue-200"
            placeholder="Research context will appear here when applied from YouTube Research Assistant"
          />
          <p className="text-xs text-blue-600">
            This research data will be automatically included when generating your script to ensure it's backed by insights and analysis.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sectionPrompt">Section Generation Instructions (Optional)</Label>
          <Textarea
            id="sectionPrompt"
            placeholder="Specific instructions for how the AI should create and structure the script sections/outline"
            value={sectionPrompt}
            onChange={(e) => onSectionPromptChange(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Controls how the script is divided into sections and the overall structure
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scriptPrompt">Script Writing Instructions (Optional)</Label>
          <Textarea
            id="scriptPrompt"
            placeholder="Specific instructions for how the AI should write the actual script content"
            value={scriptPrompt}
            onChange={(e) => onScriptPromptChange(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Controls the writing style, tone, and content approach for the final script
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalPrompt">General Instructions (Optional)</Label>
          <Textarea
            id="additionalPrompt"
            placeholder="Any other general instructions that apply to both section generation and script writing"
            value={additionalPrompt}
            onChange={(e) => onAdditionalPromptChange(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>
      
      <StaggerItem>
        <div className="flex flex-col sm:flex-row gap-3">
          <ScaleOnHover>
            <Button
              className="flex-1 glow-button" 
              onClick={onGenerateOutline}
              disabled={isLoading || isGeneratingScript || !title}
            >
              {isLoading ? "Generating Sections..." : "Generate Sections"}
            </Button>
          </ScaleOnHover>
        
          {hasScriptSections && (
            <ScaleOnHover>
              <Button
                className="flex-1" 
                onClick={onGenerateFullScript}
                disabled={isLoading || isGeneratingScript}
                variant="secondary"
              >
                {isGeneratingScript ? "Generating Script..." : "Generate Full Script"}
              </Button>
            </ScaleOnHover>
          )}

          {hasFullScript && (
            <ScaleOnHover>
              <Button
                variant="outline"
                onClick={onDownloadDocx}
                className="flex-1 gap-2"
              >
                Download DOCX
              </Button>
            </ScaleOnHover>
          )}
        </div>
      </StaggerItem>

      {/* Error Display */}
      {scriptGenerationError && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{scriptGenerationError}</p>
        </div>
      )}
    </StaggerContainer>
  )
} 