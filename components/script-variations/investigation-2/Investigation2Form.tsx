'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button as ShadButton } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

// A simplified Investigation v2 form matching the provided look
export function Investigation2Form() {
  const dispatch = useAppDispatch()
  const { scriptSections } = useAppSelector(state => state.scripts)

  const [title, setTitle] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [desiredWordCount, setDesiredWordCount] = useState<number | ''>('')
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)

  const handleGenerateOutline = async () => {
    if (!title.trim()) return
    setIsGeneratingOutline(true)
    try {
      // Reuse investigation endpoints to avoid backend changes
      const response = await fetch('/api/script-outline-variations/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          additionalContext,
          forbiddenWords,
          selectedModel: model,
          wordCount: desiredWordCount || 2400
        })
      })
      if (!response.ok) throw new Error('Failed to generate outline')
      const data = await response.json()
      const sections: ScriptSection[] = (data.sections || []).map((s: any) => ({
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

  const handleGenerateScript = async () => {
    if (!scriptSections.length) return
    setIsGeneratingScript(true)
    try {
      // Reuse investigation full-script endpoint
      const response = await fetch('/api/full-script-variations/investigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          sections: scriptSections,
          selectedModel: model,
          selectedView: '3rd',
          excludedWords: forbiddenWords,
          desiredWordCount: desiredWordCount || '',
          additionalData: additionalContext
        })
      })
      if (!response.ok) throw new Error('Failed to generate script')
      const data = await response.json()
      dispatch(setFullScript({
        scriptWithMarkdown: data.scriptWithMarkdown,
        scriptCleaned: data.scriptCleaned || data.scriptWithMarkdown,
        title: title || 'Investigation Script',
        theme: 'Investigation-2',
        wordCount: data.wordCount || 0
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingScript(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Enter title for your script" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Additional Context (optional)</Label>
            <Textarea placeholder="Enter any additional context or information you'd like to include" value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Forbidden Words (optional)</Label>
            <Textarea placeholder="Enter words to exclude from generation, separated by commas" value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} />
            <p className="text-xs text-muted-foreground">Words listed here will be avoided in the generated content. Separate multiple words with commas.</p>
          </div>

          <div className="space-y-2">
            <Label>AI Model</Label>
            <select className="border rounded px-3 py-2 bg-background" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4o-mini">GPT-4o Mini (Fast & Economical)</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Desired Word Count (optional)</Label>
            <Input placeholder="e.g., 1000" type="number" value={desiredWordCount} onChange={(e) => setDesiredWordCount(e.target.value ? parseInt(e.target.value) : '')} />
          </div>

          <div className="flex flex-col gap-3">
            <ShadButton onClick={handleGenerateOutline} disabled={isGeneratingOutline} className="bg-purple-600 hover:bg-purple-700">
              {isGeneratingOutline ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Outline</>) : 'Generate Outline'}
            </ShadButton>
            <ShadButton onClick={handleGenerateScript} disabled={isGeneratingScript} className="bg-blue-600 hover:bg-blue-700">
              {isGeneratingScript ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Script</>) : 'Generate Script'}
            </ShadButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


