'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, updateScriptSection, type ScriptSection, type CallToAction, type Hook } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Zap, RotateCcw, Upload, Edit3, RefreshCw, Plus, Target, Sparkles } from 'lucide-react'
import { ScriptUploadModal } from '../ScriptUploadModal'
import { CTAModal } from '../../script-generator/CTAModal'
import { HookModal } from '../../script-generator/HookModal'

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

  // Hook & CTA state
  const [hooks, setHooks] = useState<Hook[]>([])
  const [ctas, setCtas] = useState<CallToAction[]>([])
  const [isHookModalOpen, setIsHookModalOpen] = useState(false)
  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false)
  const [editingHook, setEditingHook] = useState<Hook | null>(null)
  const [editingCta, setEditingCta] = useState<CallToAction | null>(null)
  
  // Hook modal state
  const [hookText, setHookText] = useState('')
  const [hookStyle, setHookStyle] = useState<'question' | 'statement' | 'story' | 'statistic' | 'custom'>('question')
  const [hookAdditionalInstructions, setHookAdditionalInstructions] = useState('')

  // CTA modal state
  const [ctaText, setCtaText] = useState('')
  const [ctaPlacement, setCtaPlacement] = useState<'beginning' | 'middle' | 'end' | 'custom'>('end')
  const [ctaCustomPlacement, setCtaCustomPlacement] = useState('')
  const [ctaAdditionalInstructions, setCtaAdditionalInstructions] = useState('')

  // Section editing state
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null)
  const [editingSectionText, setEditingSectionText] = useState('')
  const [regeneratingSectionIndex, setRegeneratingSectionIndex] = useState<number | null>(null)

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
          ctas: ctas.filter(c => c.enabled),
          hooks: hooks.filter(h => h.enabled),
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
          additionalPrompt,
          ctas: ctas.filter(c => c.enabled),
          hooks: hooks.filter(h => h.enabled)
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

  // Hook handlers
  const handleOpenHookModal = () => {
    setEditingHook(null)
    setHookText('')
    setHookStyle('question')
    setHookAdditionalInstructions('')
    setIsHookModalOpen(true)
  }

  const handleEditHook = (hook: Hook) => {
    setEditingHook(hook)
    setHookText(hook.text)
    setHookStyle(hook.style || 'question')
    setHookAdditionalInstructions(hook.additionalInstructions || '')
    setIsHookModalOpen(true)
  }

  const handleSaveHook = () => {
    if (!hookText.trim()) return
    
    const newHook: Hook = {
      id: editingHook?.id || Date.now().toString(),
      text: hookText,
      style: hookStyle,
      additionalInstructions: hookAdditionalInstructions,
      enabled: true
    }

    if (editingHook) {
      setHooks(hooks.map(h => h.id === editingHook.id ? newHook : h))
    } else {
      setHooks([...hooks, newHook])
    }

    setIsHookModalOpen(false)
    setEditingHook(null)
  }

  const handleDeleteHook = (hookId: string) => {
    setHooks(hooks.filter(h => h.id !== hookId))
  }

  const handleToggleHook = (hookId: string) => {
    setHooks(hooks.map(h => h.id === hookId ? { ...h, enabled: !h.enabled } : h))
  }

  // CTA handlers
  const handleOpenCtaModal = () => {
    setEditingCta(null)
    setCtaText('')
    setCtaPlacement('end')
    setCtaCustomPlacement('')
    setCtaAdditionalInstructions('')
    setIsCtaModalOpen(true)
  }

  const handleEditCta = (cta: CallToAction) => {
    setEditingCta(cta)
    setCtaText(cta.text)
    setCtaPlacement(cta.placement)
    setCtaCustomPlacement(cta.customPlacement || '')
    setCtaAdditionalInstructions(cta.additionalInstructions || '')
    setIsCtaModalOpen(true)
  }

  const handleSaveCta = () => {
    if (!ctaText.trim()) return

    const newCta: CallToAction = {
      id: editingCta?.id || Date.now().toString(),
      text: ctaText,
      placement: ctaPlacement,
      customPlacement: ctaCustomPlacement,
      additionalInstructions: ctaAdditionalInstructions,
      enabled: true
    }

    if (editingCta) {
      setCtas(ctas.map(c => c.id === editingCta.id ? newCta : c))
    } else {
      setCtas([...ctas, newCta])
    }

    setIsCtaModalOpen(false)
    setEditingCta(null)
  }

  const handleDeleteCta = (ctaId: string) => {
    setCtas(ctas.filter(c => c.id !== ctaId))
  }

  const handleToggleCta = (ctaId: string) => {
    setCtas(ctas.map(c => c.id === ctaId ? { ...c, enabled: !c.enabled } : c))
  }

  // Section editing handlers
  const handleStartEditingSection = (index: number) => {
    setEditingSectionIndex(index)
    setEditingSectionText(scriptSections[index].writingInstructions)
  }

  const handleSaveEditingSection = () => {
    if (editingSectionIndex !== null) {
      const updatedSection = {
        ...scriptSections[editingSectionIndex],
        writingInstructions: editingSectionText
      }
      dispatch(updateScriptSection({ index: editingSectionIndex, section: updatedSection }))
      setEditingSectionIndex(null)
      setEditingSectionText('')
    }
  }

  const handleCancelEditingSection = () => {
    setEditingSectionIndex(null)
    setEditingSectionText('')
  }

  const handleRegenerateSection = async (index: number) => {
    setRegeneratingSectionIndex(index)
    try {
      const response = await fetch('/api/regenerate-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionIndex: index,
          sectionContent: scriptSections[index].writingInstructions,
          title,
          theme,
          additionalPrompt,
          modelName: selectedModel
        })
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate section')
      }

      const data = await response.json()
      const updatedSection = {
        ...scriptSections[index],
        writingInstructions: data.regeneratedContent
      }
      dispatch(updateScriptSection({ index, section: updatedSection }))
    } catch (error) {
      console.error('Regeneration failed:', error)
    } finally {
      setRegeneratingSectionIndex(null)
    }
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

          {/* Hook & CTA Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-400">Hook & CTA</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleOpenHookModal}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Add Hook
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenCtaModal}>
                  <Target className="h-4 w-4 mr-1" />
                  Add CTA
                </Button>
              </div>
            </div>

            {/* Display Hooks */}
            {hooks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hooks ({hooks.filter(h => h.enabled).length} active)</Label>
                <div className="space-y-2">
                  {hooks.map((hook) => (
                    <div key={hook.id} className="flex items-center justify-between p-2 border rounded bg-white">
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="checkbox"
                          checked={hook.enabled}
                          onChange={() => handleToggleHook(hook.id)}
                          className="rounded"
                        />
                        <div className="flex-1 truncate">
                          <span className="text-sm">{hook.text}</span>
                          <span className="text-xs text-gray-500 ml-2">({hook.style})</span>
                          {hook.wordCount && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                              {hook.wordCount} words
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditHook(hook)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteHook(hook.id)} className="text-red-600">
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display CTAs */}
            {ctas.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">CTAs ({ctas.filter(c => c.enabled).length} active)</Label>
                <div className="space-y-2">
                  {ctas.map((cta) => (
                    <div key={cta.id} className="flex items-center justify-between p-2 border rounded bg-white">
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="checkbox"
                          checked={cta.enabled}
                          onChange={() => handleToggleCta(cta.id)}
                          className="rounded"
                        />
                        <div className="flex-1 truncate">
                          <span className="text-sm">{cta.text}</span>
                          <span className="text-xs text-gray-500 ml-2">({cta.placement})</span>
                          {cta.wordCount && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                              {cta.wordCount} words
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCta(cta)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCta(cta.id)} className="text-red-600">
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hooks.length === 0 && ctas.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No hooks or CTAs added. Use the buttons above to add engaging hooks and call-to-action elements.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline}>
              {isGeneratingOutline ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Zap className="h-4 w-4 mr-2" />Generate Outline</>)}
            </Button>
            <Button variant="outline" onClick={() => setIsScriptUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
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
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{i + 1}. {s.title}</div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleStartEditingSection(i)}
                      disabled={editingSectionIndex === i || regeneratingSectionIndex === i}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRegenerateSection(i)}
                      disabled={editingSectionIndex === i || regeneratingSectionIndex !== null}
                    >
                      {regeneratingSectionIndex === i ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {editingSectionIndex === i ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingSectionText}
                      onChange={(e) => setEditingSectionText(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEditingSection}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEditingSection}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {s.writingInstructions}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerateAllScripts} disabled={isGeneratingAll}>
                {isGeneratingAll ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Zap className="h-4 w-4 mr-2" />Generate Full Script</>)}
              </Button>
              <Button variant="outline" onClick={handleGenerateOutline}>
                <RotateCcw className="h-4 w-4 mr-2" />Regenerate Outline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ScriptUploadModal
        isOpen={isScriptUploadOpen}
        onClose={() => setIsScriptUploadOpen(false)}
        onScriptUpload={handleScriptUpload}
      />

      <HookModal
        isOpen={isHookModalOpen}
        onClose={() => setIsHookModalOpen(false)}
        editingHook={editingHook}
        hookText={hookText}
        hookStyle={hookStyle}
        hookAdditionalInstructions={hookAdditionalInstructions}
        onHookTextChange={setHookText}
        onHookStyleChange={setHookStyle}
        onHookAdditionalInstructionsChange={setHookAdditionalInstructions}
        onSave={handleSaveHook}
      />

      <CTAModal
        isOpen={isCtaModalOpen}
        onClose={() => setIsCtaModalOpen(false)}
        editingCta={editingCta}
        ctaText={ctaText}
        ctaPlacement={ctaPlacement}
        ctaCustomPlacement={ctaCustomPlacement}
        ctaAdditionalInstructions={ctaAdditionalInstructions}
        onCtaTextChange={setCtaText}
        onCtaPlacementChange={setCtaPlacement}
        onCtaCustomPlacementChange={setCtaCustomPlacement}
        onCtaAdditionalInstructionsChange={setCtaAdditionalInstructions}
        onSave={handleSaveCta}
      />
    </div>
  )
}


