'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ResearchPreviewModal } from '@/components/script-generator/ResearchPreviewModal'

const PRESET_TOPICS = [
  'Energy Control',
  'The truth about life, death & the afterlife',
  'Conspiracy Controlling Reality',
  'Escaping Simulation',
  'Time Loops, Alternate Realities'
]

interface OpenAIModel { id: string; owned_by: string }

export function Philosophy2Form() {
  const dispatch = useAppDispatch()
  const scriptSections = useAppSelector(state => state.scripts.scriptSections) as ScriptSection[]

  const [models, setModels] = useState<OpenAIModel[]>([])
  const [model, setModel] = useState('gpt-5')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [title, setTitle] = useState('')
  const [additionalData, setAdditionalData] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState('')
  const [desiredWordCount, setDesiredWordCount] = useState<number>(1000)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const researchSummaries = useAppSelector(state => state.youtube.youtubeResearchSummaries)
  const [isResearchPreviewOpen, setIsResearchPreviewOpen] = useState(false)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models')
        if (!res.ok) return
        const data = await res.json()
        setModels(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0 && !data.find((m: OpenAIModel) => m.id === model)) {
          setModel(data[0].id)
        }
      } catch {}
    }
    fetchModels()
  }, [])

  const handleGenerateOutline = async () => {
    const finalTitle = title.trim() || selectedTopic
    if (!finalTitle) return
    setIsGeneratingOutline(true)
    try {
      const res = await fetch('/api/script-outline-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          wordCount: Math.max(800, desiredWordCount || 1000),
          additionalPrompt: additionalData,
          forbiddenWords,
          selectedModel: model,
          generateQuote: false,
          themeId: '',
          uploadedStyle: '',
          researchData: (Array.isArray(researchSummaries) && researchSummaries.some(r => r.appliedToScript))
            ? { analysis: { context: JSON.stringify(researchSummaries).slice(0, 5000) }, searchResults: [] }
            : null
        })
      })
      if (!res.ok) throw new Error('Failed to generate outline')
      const data = await res.json()
      if (Array.isArray(data.sections)) {
        const sections: ScriptSection[] = data.sections.map((s: any) => ({ title: s.title, writingInstructions: s.writingInstructions }))
        dispatch(setScriptSections(sections))
      }
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  const handleGenerateScript = async () => {
    if (!scriptSections.length) return
    const finalTitle = title.trim() || selectedTopic || 'Script'
    setIsGeneratingScript(true)
    try {
      const res = await fetch('/api/full-script-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          sections: scriptSections,
          selectedModel: model,
          additionalPrompt: additionalData + ((Array.isArray(researchSummaries) && researchSummaries.some(r => r.appliedToScript))
            ? `\n\nRESEARCH CONTEXT:\n${JSON.stringify(researchSummaries).slice(0, 2000)}`
            : ''),
          forbiddenWords,
          desiredWordCount
        })
      })
      if (!res.ok) throw new Error('Failed to generate script')
      const data = await res.json()
      if (data.scriptWithMarkdown) {
        dispatch(setFullScript({
          scriptWithMarkdown: data.scriptWithMarkdown,
          scriptCleaned: data.scriptWithMarkdown,
          title: finalTitle,
          theme: 'Philosophy-2',
          wordCount: data.wordCount || 0
        }))
      }
    } finally {
      setIsGeneratingScript(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div></div>
            <Button variant="outline" onClick={() => setIsResearchPreviewOpen(true)} disabled={!Array.isArray(researchSummaries) || researchSummaries.length === 0}>Research Preview</Button>
          </div>
          <div className="space-y-2">
            <Label>Select AI Model:</Label>
            <select className="border rounded px-3 py-2 bg-background" value={model} onChange={(e) => setModel(e.target.value)}>
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))
              ) : (
                <>
                  <option value="gpt-5">gpt-5</option>
                  <option value="gpt-5-mini">gpt-5-mini</option>
                  <option value="gpt-5-nano">gpt-5-nano</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                  <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
                  <option value="o1-preview">o1-preview</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Choose an Option</h3>
            <div className="space-y-3">
              {PRESET_TOPICS.map((opt) => (
                <label key={opt} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="preset-option"
                    value={opt}
                    checked={selectedTopic === opt}
                    onChange={() => setSelectedTopic(opt)}
                  />
                  <span className="text-lg">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enter the title of the script:</Label>
            <Input placeholder="Enter the script title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Enter additional data (summary, narrative, etc.):</Label>
            <Textarea placeholder="Enter additional data" rows={5} value={additionalData} onChange={(e) => setAdditionalData(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Words to exclude (not guaranteed):</Label>
            <Input placeholder="Enter forbidden words" value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Desired Word Count:</Label>
            <Input type="number" placeholder="1000" value={desiredWordCount} onChange={(e) => setDesiredWordCount(parseInt(e.target.value || '1000'))} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline} className="w-full sm:flex-1">
              {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
            </Button>
            <Button onClick={handleGenerateScript} disabled={isGeneratingScript || !scriptSections.length} className="w-full sm:flex-1">
              {isGeneratingScript ? 'Generating Script...' : 'Generate Full Script'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ResearchPreviewModal
        isOpen={isResearchPreviewOpen}
        onClose={() => setIsResearchPreviewOpen(false)}
        researchContext={Array.isArray(researchSummaries) && researchSummaries.length > 0 ? JSON.stringify(researchSummaries, null, 2).slice(0, 5000) : ''}
        appliedResearchCount={Array.isArray(researchSummaries) ? researchSummaries.filter((r:any)=>r.appliedToScript).length : 0}
      />
    </div>
  )
}


