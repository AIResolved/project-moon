'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { History, Database, Bot, User, Send, Upload } from "lucide-react"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  onOpenScriptUpload?: () => void
  
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
  onOpenScriptUpload,
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

  // Simple assistant state (local-only)
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string; ts: number }>>([
    { role: 'assistant', content: "Hello! I'm your script generation assistant. I can help you with writing techniques, character development, story structure, and any questions about the script generation process. How can I assist you today?", ts: Date.now() }
  ])
  const [assistantInput, setAssistantInput] = useState("")
  const handleAssistantSend = async () => {
    const text = assistantInput.trim()
    if (!text) return
    const ts = Date.now()
    setAssistantMessages(prev => [...prev, { role: 'user', content: text, ts }])
    setAssistantInput("")
    try {
      const res = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...assistantMessages.slice(-8),
            { role: 'user', content: text }
          ],
          context: {
            title,
            audience,
            tone,
            theme,
            stylePreferences: stylePrefs
          }
        })
      })
      const data = await res.json()
      const reply = data.reply || 'I was unable to generate a response.'
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch (e) {
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'There was an error contacting the assistant.', ts: Date.now() }])
    }
  }
  const clearAssistant = () => {
    setAssistantMessages([{ role: 'assistant', content: "Cleared. How can I help with your research, outline, or hook ideas?", ts: Date.now() }])
  }
  const suggestionChips = [
    "Summarize my topic into 3 hooks",
    "Draft a 5-section outline",
    "Suggest a stronger title",
    "Refine tone to investigative",
  ]

  // Local controls specific to True Crime variant
  const [tone, setTone] = useState("")
  const [stylePrefs, setStylePrefs] = useState("")
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [enableIntroHook, setEnableIntroHook] = useState(false)
  const [hookWordCount, setHookWordCount] = useState(50)
  const [sectionPromptLocal, setSectionPromptLocal] = useState(sectionPrompt)

  useEffect(() => {
    const parts: string[] = []
    if (sectionPromptLocal?.trim()) parts.push(sectionPromptLocal.trim())
    if (tone.trim()) parts.push(`Writing tone: ${tone.trim()}.`)
    if (stylePrefs.trim()) parts.push(`Style preferences: ${stylePrefs.trim()}.`)
    if (enableIntroHook) parts.push(`INTRO HOOK: Write the first section as an engaging video intro hook no longer than ${hookWordCount} words. The hook should grab attention and set up the case without spoilers.`)
    const composed = parts.join('\n')
    onSectionPromptChange(composed)
    // If custom prompt selected, let it override scriptPrompt
    if (useCustomPrompt) {
      onScriptPromptChange(customPrompt)
    }
  }, [sectionPromptLocal, tone, stylePrefs, enableIntroHook, hookWordCount, useCustomPrompt, customPrompt])

  return (
    <StaggerContainer className="w-full space-y-6 p-6 bg-card rounded-lg border shadow-sm">
      <StaggerItem>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Script Generator</h2>
          <p className="text-muted-foreground">Create a script using AI. Fill in the details below.</p>
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
           
            {/* <ScaleOnHover>
              <Button
                variant="outline"
                onClick={onOpenPromptHistory}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Prompt History
              </Button>
            </ScaleOnHover> */}
          </div>
        </div>
      </StaggerItem>

      <Tabs defaultValue="generator">
        <TabsList className="mb-4">
          <TabsTrigger value="generator">Script Generator</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <div className="space-y-6">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex justify-between">
                <span>Title</span>
                {!title && <span className="text-red-500 text-xs">Required for regeneration</span>}
              </Label>
              <Input id="title" placeholder="Enter a title for your script" value={title} onChange={(e) => onTitleChange(e.target.value)} className={!title ? "border-red-300 focus-visible:ring-red-500" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetSections">Targer word count</Label>
              <Input id="targetSections" type="number" min={2} max={8} step={1} value={targetSections} onChange={(e) => onTargetSectionsChange(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Create {Math.round(targetSections/750)} logical sections with natural story divisions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Select Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="GPT-4.1 Mini (Default)" />
                </SelectTrigger>
                <SelectContent>
                  {models && models.length > 0 && (
                    <>
                      {/* OpenAI models */}
                      {models.filter(m => m.owned_by === 'openai').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>OpenAI</SelectLabel>
                          {models.filter(m => m.owned_by === 'openai').map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Anthropic models */}
                      {models.filter(m => m.owned_by === 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Anthropic</SelectLabel>
                          {models.filter(m => m.owned_by === 'anthropic').map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {/* Custom/Other models */}
                      {models.filter(m => m.owned_by !== 'openai' && m.owned_by !== 'anthropic').length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Custom</SelectLabel>
                          {models.filter(m => m.owned_by !== 'openai' && m.owned_by !== 'anthropic').map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.id}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme" className="flex justify-between"><span>Theme</span></Label>
              <Input id="theme" placeholder="E.g., Mystery, Romance, Sci-Fi" value={theme} onChange={(e) => onThemeChange(e.target.value)} />
            </div>
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input id="audience" placeholder="e.g., Young professionals" value={audience} onChange={(e) => onAudienceChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input id="tone" placeholder="e.g., Professional, Casual" value={tone} onChange={(e) => setTone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stylePrefs">Style Preferences</Label>
              <Input id="stylePrefs" placeholder="e.g., Short sentences, bullet points" value={stylePrefs} onChange={(e) => setStylePrefs(e.target.value)} />
            </div>
          </div>

          {/* Prompt selection */}
          <div className="space-y-2">
            <Label>Select Prompt (Optional)</Label>
            <div className="text-sm text-muted-foreground">Use default prompt or select custom</div>
            <div className="text-xs text-muted-foreground">Choose a custom prompt from your library or use the default style guide</div>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="prompt-mode" checked={!useCustomPrompt} onChange={() => setUseCustomPrompt(false)} /> Default prompt</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="prompt-mode" checked={useCustomPrompt} onChange={() => setUseCustomPrompt(true)} /> Custom prompt</label>
            </div>
            {useCustomPrompt && (<Textarea className="min-h-[80px] mt-2" placeholder="Paste or write your custom prompt here" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />)}
          </div>

          {/* Script Generation Instructions */}
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

          {/* Intro hook */}
          <div className="p-2 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-semibold text-amber-700">
                ⚡ Video Intro Hook (Optional)
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enableIntroHook}
                  onChange={(e) => setEnableIntroHook(e.target.checked)}
                />
                Enable
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              Generate a separate intro hook segment to grab viewer attention. Our intros are typically 30–65 words.
            </div>
            {enableIntroHook && (
              <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-3 mt-2">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="hookWords">Target Word Count</Label>
                  <Input
                    id="hookWords"
                    type="number"
                    min={10}
                    value={hookWordCount}
                    onChange={(e) =>
                      setHookWordCount(Math.max(10, parseInt(e.target.value || "50")))
                    }
                  />
                </div>
                <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-3">
                  {hookWordCount} words
                  <div className="text-xs text-muted-foreground">Standard length</div>
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              The intro hook will be generated as a separate segment before the main script sections.
            </div>
          </div>
       </div>
        </TabsContent>

      <TabsContent value="assistant">
        <Card className="overflow-hidden border">
          <CardHeader className="p-0">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between text-white">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" /> Research Assistant
              </CardTitle>
              <Button size="sm" variant="secondary" onClick={clearAssistant} className="text-indigo-700">Clear Chat</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pt-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestionChips.map((s) => (
                  <button key={s} onClick={() => { setAssistantInput(s); setTimeout(handleAssistantSend, 0) }} className="text-xs bg-muted hover:bg-muted/70 border px-2 py-1 rounded-full">{s}</button>
                ))}
              </div>
            </div>
            <ScrollArea className="h-[360px] px-4">
              <div className="space-y-3 py-2">
                {assistantMessages.map((m) => (
                  <div key={m.ts} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border ${m.role === 'user' ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-background text-foreground border-border'}`}>
                      <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                        {m.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                        <span>{new Date(m.ts).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about research, hooks, structure, titles, tone..."
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAssistantSend() } }}
                  className="rounded-xl"
                />
                <Button onClick={handleAssistantSend} className="rounded-xl">
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>


     
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