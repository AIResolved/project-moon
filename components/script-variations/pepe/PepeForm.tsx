'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Zap, RotateCcw } from 'lucide-react'

export function PepeForm() {
  const dispatch = useAppDispatch()
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)

  const [title, setTitle] = useState('')
  const [wordCount, setWordCount] = useState(2400)
  const [audience, setAudience] = useState('')
  const [emotionalTone, setEmotionalTone] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-5')

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)

  const handleGenerateOutline = async () => {
    if (!title.trim()) return
    setIsGeneratingOutline(true)
    try {
      const response = await fetch('/api/script-outline-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          wordCount: Math.max(800, wordCount),
          themeId: '',
          additionalPrompt,
          emotionalTone,
          targetAudience: audience,
          forbiddenWords: '',
          selectedModel,
          uploadedStyle: '',
          ctas: [],
          inspirationalTranscript: '',
          researchData: null,
          generateQuote: false
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate sections')
      }
      const data = await response.json()

      const sections: ScriptSection[] = data.sections.map((s: any) => ({
        title: s.title,
        writingInstructions: s.writingInstructions
      }))
      dispatch(setScriptSections(sections))
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  const handleGenerateAllScripts = async () => {
    if (!scriptSections.length) return
    setIsGeneratingAll(true)
    try {
      const response = await fetch('/api/full-script-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          sections: scriptSections,
          selectedModel,
          emotionalTone,
          targetAudience: audience,
          forbiddenWords: '',
          additionalPrompt
        })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate scripts')
      }
      const data = await response.json()
      if (data.scriptWithMarkdown) {
        dispatch(setFullScript({
          scriptWithMarkdown: data.scriptWithMarkdown,
          scriptCleaned: data.scriptCleaned || data.scriptWithMarkdown,
          title: title || 'Pepe Script',
          theme: '',
          wordCount: data.wordCount || 0
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pepe Variant — Configuration</CardTitle>
          <CardDescription>Outline and full script generation using the Pepe prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Video Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="words">Target Word Count</Label>
              <Input id="words" type="number" value={wordCount} onChange={(e) => setWordCount(parseInt(e.target.value) || 2400)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Emotional Tone</Label>
              <Input value={emotionalTone} onChange={(e) => setEmotionalTone(e.target.value)} placeholder="e.g., urgent, intimate" />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g., entrepreneurs" />
            </div>
            <div className="space-y-2">
            <Label>Model</Label>
            <select className="border rounded px-3 py-2 bg-background" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-5-mini">GPT-5 Mini</option>
              <option value="gpt-5-nano">GPT-5 Nano</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Instructions</Label>
            <Textarea rows={3} value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="Guidance for this variant" />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline}>
              {isGeneratingOutline ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Zap className="h-4 w-4 mr-2" />Generate Outline</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {scriptSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outline</CardTitle>
            <CardDescription>{scriptSections.length} sections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scriptSections.map((s, i) => (
              <div key={i} className="p-3 border rounded">
                <div className="font-semibold mb-1">{i + 1}. {s.title}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{s.writingInstructions}</div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerateAllScripts} disabled={isGeneratingAll}>
                {isGeneratingAll ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Zap className="h-4 w-4 mr-2" />Generate Full Script</>)}
              </Button>
              <Button variant="outline" onClick={handleGenerateOutline}><RotateCcw className="h-4 w-4 mr-2" />Regenerate Outline</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


