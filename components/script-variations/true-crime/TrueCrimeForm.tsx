'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export function TrueCrimeForm() {
  const dispatch = useAppDispatch()
  const { scriptSections } = useAppSelector(state => state.scripts)

  const [title, setTitle] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [researchContext, setResearchContext] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState('')
  const [modelName, setModelName] = useState('gpt-4o-mini')
  const [targetSections, setTargetSections] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)

  const generateOutline = async () => {
    if (!title.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/script-outline-variations/true-crime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          targetSections,
          additionalPrompt,
          researchContext,
          forbiddenWords,
          modelName,
          audience: 'general',
          povSelection: '3rd',
          scriptFormat: 'Documentary'
        })
      })
      if (!res.ok) throw new Error('Failed to generate true crime outline')
      const data = await res.json()
      const sections: ScriptSection[] = data.sections.map((s: any) => ({ title: s.title, writingInstructions: s.writingInstructions }))
      dispatch(setScriptSections(sections))
    } finally {
      setIsLoading(false)
    }
  }

  const generateScript = async () => {
    if (!scriptSections.length) return
    setIsGeneratingScript(true)
    try {
      const res = await fetch('/api/full-script-variations/true-crime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          sections: scriptSections,
          additionalPrompt,
          researchContext,
          forbiddenWords,
          selectedModel: modelName,
          povSelection: '3rd',
          audience: 'general'
        })
      })
      if (!res.ok) throw new Error('Failed to generate true crime script')
      const data = await res.json()
      dispatch(setFullScript({
        scriptWithMarkdown: data.scriptWithMarkdown,
        scriptCleaned: data.scriptCleaned || data.scriptWithMarkdown,
        title: title || 'True Crime Script',
        theme: 'True Crime',
        wordCount: data.wordCount || 0
      }))
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Sections</Label>
              <Input type="number" value={targetSections} onChange={(e) => setTargetSections(parseInt(e.target.value)||5)} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Research Context (optional)</Label>
            <Textarea value={researchContext} onChange={(e) => setResearchContext(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Forbidden Words (optional)</Label>
            <Textarea value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} placeholder="comma,separated,words" />
          </div>
          <div className="space-y-2">
            <Label>Additional Instructions (optional)</Label>
            <Textarea value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={generateOutline} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Outline</>) : 'Generate Outline'}
            </Button>
            <Button onClick={generateScript} disabled={isGeneratingScript} className="bg-blue-600 hover:bg-blue-700">
              {isGeneratingScript ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Script</>) : 'Generate Script'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


