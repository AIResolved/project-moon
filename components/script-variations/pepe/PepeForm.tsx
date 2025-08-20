'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Zap, RotateCcw, Upload } from 'lucide-react'
import { ScriptUploadModal } from '../ScriptUploadModal'

export function PepeForm() {
  const dispatch = useAppDispatch()
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)

  const [title, setTitle] = useState('')
  const [wordCount, setWordCount] = useState(1000)
  const [theme, setTheme] = useState('')
  const [sectionPrompt, setSectionPrompt] = useState('')
  const [scriptPrompt, setScriptPrompt] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-5')

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isScriptUploadOpen, setIsScriptUploadOpen] = useState(false)

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
          theme,
          sectionPrompt,
          additionalPrompt,
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
          theme,
          scriptPrompt,
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

  const handleScriptUpload = (script: string) => {
    dispatch(setFullScript({
      scriptWithMarkdown: script,
      scriptCleaned: script,
      title: title || "Uploaded Script",
      theme,
      wordCount: script.split(/\s+/).filter(Boolean).length
    }))
    setIsScriptUploadOpen(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Story Niche</CardTitle>
          <CardDescription>Create AI-driven story scripts with a minimal, focused setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a title for your script" />
              <p className="text-xs text-muted-foreground">Required for regeneration</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="words">Word Count</Label>
              <Input id="words" type="number" value={wordCount} onChange={(e) => setWordCount(parseInt(e.target.value) || 1000)} />
              <p className="text-xs text-muted-foreground">This will generate {Math.max(1, Math.floor((Number(wordCount) || 0) / 1000))} script sections</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Story Theme</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="E.g., Mystery, Romance, Sci-Fi" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Section Generation Instructions (Optional)</Label>
            <Textarea rows={3} value={sectionPrompt} onChange={(e) => setSectionPrompt(e.target.value)} placeholder="Specific instructions for how the AI should create and structure the script sections/outline" />
            <p className="text-xs text-muted-foreground">Controls how the script is divided into sections and the overall structure</p>
          </div>

          <div className="space-y-2">
            <Label>Script Writing Instructions (Optional)</Label>
            <Textarea rows={3} value={scriptPrompt} onChange={(e) => setScriptPrompt(e.target.value)} placeholder="Specific instructions for how the AI should write the actual script content" />
            <p className="text-xs text-muted-foreground">Controls the writing style, tone, and content approach for the final script</p>
          </div>

          <div className="space-y-2">
            <Label>General Instructions (Optional)</Label>
            <Textarea rows={3} value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} placeholder="Any other general instructions that apply to both section generation and script writing" />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline}>
              {isGeneratingOutline ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Zap className="h-4 w-4 mr-2" />Generate Outline</>)}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsScriptUploadOpen(true)}
              className="gap-2 bg-blue-900/20 border-blue-600 text-blue-300 hover:bg-blue-900/40"
            >
              <Upload className="h-4 w-4" />
              Upload Script
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

      <ScriptUploadModal
        isOpen={isScriptUploadOpen}
        onClose={() => setIsScriptUploadOpen(false)}
        onScriptUpload={handleScriptUpload}
      />
    </div>
  )
}


