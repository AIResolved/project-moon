'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload } from 'lucide-react'
import { ScriptUploadModal } from '../ScriptUploadModal'

export function OriginalForm() {
  const dispatch = useAppDispatch()
  const { scriptSections } = useAppSelector(state => state.scripts)

  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [sectionPrompt, setSectionPrompt] = useState('')
  const [scriptPrompt, setScriptPrompt] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [targetSections, setTargetSections] = useState<number>(2400)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [isScriptUploadOpen, setIsScriptUploadOpen] = useState(false)
  
  // New states for the multi-step process
  const [titleOnlyOutline, setTitleOnlyOutline] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<'form' | 'titles' | 'instructions' | 'script'>('form')

  // Step 1: Generate titles-only outline
  const handleGenerateOutline = async () => {
    if (!title.trim()) return
    setIsGeneratingOutline(true)
    try {
      const response = await fetch('/api/generate-titles-only/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          sectionPrompt,
          additionalPrompt,
          forbiddenWords,
          selectedModel,
          targetSections
        })
      })
      if (!response.ok) throw new Error('Failed to generate outline')
      const data = await response.json()
      setTitleOnlyOutline(data.titles || [])
      setCurrentStep('titles')
    } catch (e) {
      console.error(e)
      alert('Failed to generate outline. Please try again.')
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  // Step 2: Generate writing instructions for approved titles
  const handleGenerateInstructions = async () => {
    if (titleOnlyOutline.length === 0) return
    setIsGeneratingInstructions(true)
    try {
      const response = await fetch('/api/generate-writing-instructions/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          titles: titleOnlyOutline,
          sectionPrompt,
          scriptPrompt,
          additionalPrompt,
          forbiddenWords,
          selectedModel,
          targetSections
        })
      })
      if (!response.ok) throw new Error('Failed to generate writing instructions')
      const data = await response.json()
      const sections: ScriptSection[] = data.sections.map((s: any) => ({
        title: s.title,
        writingInstructions: s.writingInstructions
      }))
      dispatch(setScriptSections(sections))
      setCurrentStep('instructions')
    } catch (e) {
      console.error(e)
      alert('Failed to generate writing instructions. Please try again.')
    } finally {
      setIsGeneratingInstructions(false)
    }
  }

  // Step 3: Generate full script (existing functionality)
  const handleGenerateScript = async () => {
    if (!scriptSections.length) return
    setIsGeneratingScript(true)
    try {
      const response = await fetch('/api/generate-full-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          sections: scriptSections,
          additionalPrompt,
          scriptPrompt,
          forbiddenWords,
          modelName: selectedModel,
          povSelection: '3rd Person',
          scriptFormat: 'Story',
          audience: '',
          inspirationalTranscript: ''
        })
      })
      if (!response.ok) throw new Error('Failed to generate script')
      const data = await response.json()
      dispatch(setFullScript({
        scriptWithMarkdown: data.scriptWithMarkdown,
        scriptCleaned: data.scriptCleaned || data.scriptWithMarkdown,
        title: title || 'NEW Script',
        theme: theme || 'General',
        wordCount: data.wordCount || 0
      }))
      setCurrentStep('script')
    } catch (e) {
      console.error(e)
      alert('Failed to generate script. Please try again.')
    } finally {
      setIsGeneratingScript(false)
    }
  }

  // Helper functions for editing titles
  const handleEditTitle = (index: number, newTitle: string) => {
    const updatedTitles = [...titleOnlyOutline]
    updatedTitles[index] = newTitle
    setTitleOnlyOutline(updatedTitles)
  }

  const handleAddTitle = () => {
    setTitleOnlyOutline([...titleOnlyOutline, 'New Section Title'])
  }

  const handleRemoveTitle = (index: number) => {
    const updatedTitles = titleOnlyOutline.filter((_, i) => i !== index)
    setTitleOnlyOutline(updatedTitles)
  }

  // Navigation helpers
  const handleBackToForm = () => {
    setCurrentStep('form')
  }

  const handleBackToTitles = () => {
    setCurrentStep('titles')
  }

  const handleScriptUpload = (script: string) => {
    dispatch(setFullScript({
      scriptWithMarkdown: script,
      scriptCleaned: script,
      title: title || "Uploaded Script",
      theme: theme || 'General',
      wordCount: script.split(/\s+/).filter(Boolean).length
    }))
    setIsScriptUploadOpen(false)
  }

  // Render different steps based on currentStep
  const renderStep = () => {
    switch (currentStep) {
      case 'form':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Configuration</CardTitle>
              <CardDescription>Set up your script parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Enter title for your script" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Theme (Optional)</Label>
                <Input placeholder="Enter theme or topic for your script" value={theme} onChange={(e) => setTheme(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Section Generation Instructions (Optional)</Label>
                <Textarea placeholder="Specific instructions for how the AI should create and structure the script sections/outline" value={sectionPrompt} onChange={(e) => setSectionPrompt(e.target.value)} />
                <p className="text-xs text-muted-foreground">Controls how the script is divided into sections and the overall structure</p>
              </div>

              <div className="space-y-2">
                <Label>Script Writing Instructions (Optional)</Label>
                <Textarea placeholder="Specific instructions for how the AI should write the actual script content" value={scriptPrompt} onChange={(e) => setScriptPrompt(e.target.value)} />
                <p className="text-xs text-muted-foreground">Controls the writing style, tone, and content approach for the final script</p>
              </div>

              <div className="space-y-2">
                <Label>General Instructions (Optional)</Label>
                <Textarea placeholder="Any other general instructions that apply to both section generation and script writing" value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Forbidden Words (optional)</Label>
                <Textarea placeholder="Enter words to exclude from generation, separated by commas" value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} />
                <p className="text-xs text-muted-foreground">Words listed here will be avoided in the generated content. Separate multiple words with commas.</p>
              </div>

              <div className="space-y-2">
                <Label>AI Model</Label>
                <select className="border rounded px-3 py-2 bg-background" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-5-mini">GPT-5 Mini</option>
                  <option value="gpt-5-nano">GPT-5 Nano</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Economical)</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Target Word Count</Label>
                <Input placeholder="e.g., 2400" type="number" value={targetSections} onChange={(e) => setTargetSections(e.target.value ? parseInt(e.target.value) : 2400)} />
              </div>

              <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline || !title.trim()} className="bg-purple-600 hover:bg-purple-700 w-full">
                {isGeneratingOutline ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Titles...</>) : 'Generate Section Titles'}
              </Button>
            </CardContent>
          </Card>
        );

      case 'titles':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review Section Titles</CardTitle>
              <CardDescription>Review and edit the generated section titles. Once satisfied, proceed to generate writing instructions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {titleOnlyOutline.map((title, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-8">{index + 1}.</span>
                    <Input 
                      value={title}
                      onChange={(e) => handleEditTitle(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRemoveTitle(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" onClick={handleAddTitle} className="w-full">
                + Add Section
              </Button>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToForm}>
                  ← Back to Form
                </Button>
                <Button 
                  onClick={handleGenerateInstructions} 
                  disabled={isGeneratingInstructions || titleOnlyOutline.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  {isGeneratingInstructions ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Instructions...</>) : 'Generate Writing Instructions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'instructions':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Writing Instructions Generated</CardTitle>
              <CardDescription>Writing instructions have been generated for each section. Proceed to generate the full script.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scriptSections.map((section, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm">{index + 1}. {section.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{section.writingInstructions}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToTitles}>
                  ← Back to Titles
                </Button>
                <Button 
                  onClick={handleGenerateScript} 
                  disabled={isGeneratingScript}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {isGeneratingScript ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Script...</>) : 'Generate Full Script'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'script':
        return (
          <Card>
            <CardHeader>
              <CardTitle>✅ Script Generated Successfully!</CardTitle>
              <CardDescription>Your script has been generated and is ready for use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The script has been saved to your workspace. You can view it in the script sections, generate audio, or export it.
              </p>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep('form')} className="flex-1">
                  Generate New Script
                </Button>
                <Button 
                  onClick={() => setIsScriptUploadOpen(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Script
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4 py-4">
        <div className={`flex items-center ${currentStep === 'form' ? 'text-purple-600' : (['titles', 'instructions', 'script'].includes(currentStep)) ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'form' ? 'border-purple-600 bg-purple-100' : (['titles', 'instructions', 'script'].includes(currentStep)) ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Configuration</span>
        </div>
        <div className={`w-8 h-0.5 ${(['titles', 'instructions', 'script'].includes(currentStep)) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'titles' ? 'text-blue-600' : (['instructions', 'script'].includes(currentStep)) ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'titles' ? 'border-blue-600 bg-blue-100' : (['instructions', 'script'].includes(currentStep)) ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Review Titles</span>
        </div>
        <div className={`w-8 h-0.5 ${(['instructions', 'script'].includes(currentStep)) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'instructions' ? 'text-blue-600' : currentStep === 'script' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'instructions' ? 'border-blue-600 bg-blue-100' : currentStep === 'script' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Instructions</span>
        </div>
        <div className={`w-8 h-0.5 ${currentStep === 'script' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'script' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'script' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            4
          </div>
          <span className="ml-2 text-sm font-medium">Script</span>
        </div>
      </div>

      {renderStep()}

      {/* Script Upload Modal */}
      <ScriptUploadModal
        isOpen={isScriptUploadOpen}
        onClose={() => setIsScriptUploadOpen(false)}
        onScriptUpload={handleScriptUpload}
      />
    </div>
  )
}
