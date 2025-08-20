"use client"

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { setCurrentStep, markStepCompleted } from '@/lib/features/scripts/optionsWorkflowSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Lightbulb, Zap, UploadCloud, Search, SlidersHorizontal, ListChecks, Sparkles, Check } from 'lucide-react'
import { ResearchPreviewModal } from '@/components/script-generator/ResearchPreviewModal'
import { ScriptUploadModal } from '../ScriptUploadModal'

interface OpenAIModel { id: string; owned_by: string }

const PRESET_OPTIONS = [
  'Energy Control',
  'The truth about life, death & the afterlife',
  'Conspiracy Controlling Reality',
  'Escaping Simulation',
  'Time Loops, Alternate Realities'
];

export function OptionsGenerator() {
  const dispatch = useAppDispatch();
  const scriptSections = useAppSelector(state => state.scripts.scriptSections) as ScriptSection[]
  const fullScript = useAppSelector(state => state.scripts.fullScript)
  const currentStep = useAppSelector(state => state.optionsWorkflow.currentStep)
  const completedSteps = useAppSelector(state => state.optionsWorkflow.completedSteps)
  const researchSummaries = useAppSelector(state => state.youtube.youtubeResearchSummaries)

  const hasAppliedResearch = Array.isArray(researchSummaries) && researchSummaries.some(r => r.appliedToScript)
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-5');

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [title, setTitle] = useState('');
  const [sectionPrompt, setSectionPrompt] = useState('');
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [desiredWordCount, setDesiredWordCount] = useState<number>(1000);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [uploadedStyleText, setUploadedStyleText] = useState<string>('');
  const [pasteMode, setPasteMode] = useState<boolean>(false);
  const [isResearchPreviewOpen, setIsResearchPreviewOpen] = useState(false);
  const [isScriptUploadOpen, setIsScriptUploadOpen] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (!res.ok) return;
        const data = await res.json();
        setModels(data);
      } catch {}
    };
    fetchModels();
  }, []);

  const handleGenerateOutline = async () => {
    if (!selectedOption && !title.trim()) return;
    setIsGeneratingOutline(true);
    try {
      const response = await fetch('/api/script-outline-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || selectedOption,
          wordCount: Math.max(800, Number(desiredWordCount) || 1000),
          sectionPrompt,
          additionalPrompt: additionalData,
          forbiddenWords,
          selectedModel,
          generateQuote: false,
          themeId: selectedThemeId,
          uploadedStyle: uploadedStyleText,
          // pull research context from Redux (if applied)
          researchData: researchSummaries && researchSummaries.length > 0 ? { analysis: { context: JSON.stringify(researchSummaries).slice(0, 5000) }, searchResults: [] } : null,
        })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      const data = await response.json();
      if (data.sections) {
        dispatch(setScriptSections(data.sections));
        // mark outline node as complete
        dispatch(markStepCompleted(stepIndex.outline))
      }
    } catch (e) {
      console.error('Options generator failed:', e);
      alert('Generation failed. Check console for details.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateFullScript = async () => {
    if (!scriptSections || scriptSections.length === 0) return;
    if (!title.trim() && !selectedOption.trim()) {
      alert('Please enter a title in Configuration before generating the full script.');
      dispatch(setCurrentStep(stepIndex.config));
      return;
    }
    setIsGeneratingScript(true)
    try {
      const response = await fetch('/api/full-script-variations/pepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || selectedOption,
          sections: scriptSections,
          selectedModel,
          emotionalTone: '',
          targetAudience: '',
          scriptPrompt,
          forbiddenWords,
          additionalPrompt: additionalData + ((researchSummaries && researchSummaries.length > 0) ? `\n\nRESEARCH CONTEXT:\n${JSON.stringify(researchSummaries).slice(0, 2000)}` : ''),
        })
      })
      if (!response.ok) {
        let message = 'Request failed'
        try {
          const data = await response.json();
          message = data.error || message
        } catch {
          message = await response.text()
        }
        throw new Error(message)
      }
      const data = await response.json()
      if (data.scriptWithMarkdown) {
        dispatch(setFullScript({
          scriptWithMarkdown: data.scriptWithMarkdown,
          scriptCleaned: data.scriptWithMarkdown,
          title: (title.trim() || selectedOption) || 'Script',
          theme: 'Philosophy',
          wordCount: data.wordCount || 0
        }))
        dispatch(markStepCompleted(stepIndex.generation))
        dispatch(setCurrentStep(stepIndex.generation))
      }
    } catch (e) {
      console.error('Full script generation failed:', e)
      alert('Full script generation failed. Check console for details.')
    } finally {
      setIsGeneratingScript(false)
    }
  }

  const steps = hasAppliedResearch 
    ? ['Research', 'Script Style', 'Configuration', 'Outline', 'Generation'] 
    : ['Script Style', 'Configuration', 'Outline', 'Generation']

  const stepIndex = {
    style: hasAppliedResearch ? 1 : 0,
    config: hasAppliedResearch ? 2 : 1,
    outline: hasAppliedResearch ? 3 : 2,
    generation: hasAppliedResearch ? 4 : 3,
  }

  // If research is applied, auto mark research as completed and start at Script Style
  useEffect(() => {
    if (hasAppliedResearch) {
      dispatch(markStepCompleted(0))
      if (currentStep === 0) {
        dispatch(setCurrentStep(stepIndex.style))
      }
    }
  }, [hasAppliedResearch])

  // Mark 'Script Style' step complete when a style is selected or a custom reference is provided
  useEffect(() => {
    const hasStyle = Boolean(selectedThemeId) || (uploadedStyleText && uploadedStyleText.trim().length > 0)
    const styleStep = stepIndex.style
    if (hasStyle && !completedSteps.includes(styleStep)) {
      dispatch(markStepCompleted(styleStep))
    }
  }, [selectedThemeId, uploadedStyleText, completedSteps, stepIndex.style])

  // Mark 'Configuration' step complete when required fields are provided (title or preset option)
  useEffect(() => {
    const hasConfig = Boolean((title && title.trim()) || (selectedOption && selectedOption.trim()))
    const configStep = stepIndex.config
    if (hasConfig && !completedSteps.includes(configStep)) {
      dispatch(markStepCompleted(configStep))
    }
  }, [title, selectedOption, completedSteps, stepIndex.config])

  const formattedResearchContext = () => {
    if (!Array.isArray(researchSummaries) || researchSummaries.length === 0) return ''
    return JSON.stringify(researchSummaries, null, 2).slice(0, 5000)
  }

  const handleScriptUpload = (script: string) => {
    dispatch(setFullScript({
      scriptWithMarkdown: script,
      scriptCleaned: script,
      title: title || "Uploaded Script",
      theme: selectedOption,
      wordCount: script.split(/\s+/).filter(Boolean).length
    }))
    setIsScriptUploadOpen(false)
  }

  const StepIndicator = () => {
    const items = steps.map((label, i) => {
      const isActive = i === currentStep
      const isDone = completedSteps.includes(i) || (hasAppliedResearch && i === 0)
      const Icon = hasAppliedResearch && i === 0
        ? Search
        : label === 'Script Style' ? Lightbulb
        : label === 'Configuration' ? SlidersHorizontal
        : label === 'Outline' ? ListChecks
        : Sparkles
      return { label, i, isActive, isDone, Icon }
    })

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Step {Math.min(currentStep + 1, steps.length)} of {steps.length}</span>
          <span></span>
        </div>
        <div className="relative">
          <div className="absolute left-0 right-0 top-[18px] h-px bg-border" />
          <div className="relative flex justify-between">
            {items.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                <button
                  type="button"
                  className={`z-10 flex items-center justify-center h-9 w-9 rounded-full border transition-colors ${
                    item.isDone ? 'bg-green-500 text-white border-green-500' : item.isActive ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border'
                  }`}
                  onClick={() => dispatch(setCurrentStep(item.i))}
                  aria-current={item.isActive ? 'step' : undefined}
                >
                  {item.isDone ? <Check className="h-4 w-4" /> : <item.Icon className="h-4 w-4" />}
                </button>
                <div className={`text-xs ${item.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <Card>
      <CardContent className="space-y-6 pt-6">
        <StepIndicator />
        <ResearchPreviewModal
          isOpen={isResearchPreviewOpen}
          onClose={() => setIsResearchPreviewOpen(false)}
          researchContext={formattedResearchContext()}
          appliedResearchCount={(Array.isArray(researchSummaries) && researchSummaries.filter((r:any)=>r.appliedToScript).length) || 0}
        />
        {currentStep === stepIndex.style && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select AI Model:</Label>
                <Button variant="outline" onClick={() => setIsResearchPreviewOpen(true)} disabled={!hasAppliedResearch}>Research Preview</Button>
              </div>
              <select
                className="border rounded px-3 py-2 bg-background"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold">Choose Your Script Style</h3>
              <p className="text-sm text-muted-foreground">Select from proven writing styles or upload/paste your own reference script</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`border rounded p-4 ${selectedThemeId === 'intimate-philosophical' ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center gap-2 mb-2"><Lightbulb className="h-5 w-5 text-purple-500" /><div className="font-semibold">Intimate Philosophical</div></div>
                  <div className="text-sm text-muted-foreground mb-3">Conversational yet profound tone with deep psychological insights and therapeutic guidance</div>
                  <Button variant={selectedThemeId === 'intimate-philosophical' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedThemeId('intimate-philosophical')}>{selectedThemeId === 'intimate-philosophical' ? 'Selected' : 'Select Style'}</Button>
                </div>
                <div className={`border rounded p-4 ${selectedThemeId === 'breaking-free' ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center gap-2 mb-2"><Zap className="h-5 w-5 text-orange-500" /><div className="font-semibold">Breaking Free</div></div>
                  <div className="text-sm text-muted-foreground mb-3">Direct, persuasive monologue style that challenges beliefs and creates paradigm shifts</div>
                  <Button variant={selectedThemeId === 'breaking-free' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedThemeId('breaking-free')}>{selectedThemeId === 'breaking-free' ? 'Selected' : 'Select Style'}</Button>
                </div>
                <div className="border rounded p-4">
                  <div className="flex items-center gap-2 mb-2"><UploadCloud className="h-5 w-5 text-green-600" /><div className="font-semibold">Custom Reference</div></div>
                  <div className="text-sm text-muted-foreground mb-3">Upload a file or paste your own script to match your unique writing style</div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPasteMode(false)}>Upload File</Button>
                      <Button size="sm" variant="outline" onClick={() => setPasteMode(true)}>Paste Text</Button>
                    </div>
                    {pasteMode ? (
                      <Textarea rows={4} placeholder="Paste style reference text here" value={uploadedStyleText} onChange={(e) => setUploadedStyleText(e.target.value)} />
                    ) : (
                      <Input type="file" accept=".txt,.docx" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const text = await file.text()
                        setUploadedStyleText(text)
                      }} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation handled by global controls below */}
          </>
        )}

        {currentStep === stepIndex.config && (
          <>
            <div className="space-y-2">
              <Label>Enter the title of the script:</Label>
              <Input placeholder="Enter the script title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Section Generation Instructions (Optional)</Label>
              <Textarea
                placeholder="Specific instructions for how the AI should create and structure the script sections/outline"
                value={sectionPrompt}
                onChange={(e) => setSectionPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Controls how the script is divided into sections and the overall structure</p>
            </div>

            <div className="space-y-2">
              <Label>Script Writing Instructions (Optional)</Label>
              <Textarea
                placeholder="Specific instructions for how the AI should write the actual script content"
                value={scriptPrompt}
                onChange={(e) => setScriptPrompt(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Controls the writing style, tone, and content approach for the final script</p>
            </div>

            <div className="space-y-2">
              <Label>General Instructions (Optional)</Label>
              <Textarea
                placeholder="Any other general instructions that apply to both section generation and script writing"
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Words to exclude (not guaranteed):</Label>
              <Input
                placeholder="Enter forbidden words"
                value={forbiddenWords}
                onChange={(e) => setForbiddenWords(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Desired Word Count:</Label>
              <Input
                type="number"
                placeholder="1000"
                value={desiredWordCount}
                onChange={(e) => setDesiredWordCount(parseInt(e.target.value || '1000'))}
              />
            </div>

            {/* Navigation handled by global controls below */}
          </>
        )}

        {currentStep === stepIndex.outline && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline || (!selectedOption && !title.trim())} className="w-full sm:flex-1">
                {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
              </Button>
            </div>

            {scriptSections.length > 0 && (
              <div className="space-y-2">
                <Label>Generated Outline</Label>
                <ul className="list-disc pl-6 text-sm">
                  {scriptSections.map((s, i) => (
                    <li key={i}>{s.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {currentStep === stepIndex.generation && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleGenerateFullScript} disabled={isGeneratingScript || scriptSections.length === 0} className="w-full sm:flex-1">
                {isGeneratingScript ? 'Generating Script...' : 'Generate Full Script'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsScriptUploadOpen(true)}
                className="w-full bg-blue-900/20 border-blue-600 text-blue-300 hover:bg-blue-900/40"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Script
              </Button>
            </div>

            {fullScript?.scriptWithMarkdown && (
              <div className="space-y-2">
                <Label>Script Preview</Label>
                <div className="border rounded p-3 text-sm max-h-64 overflow-auto whitespace-pre-wrap">
                  {fullScript.scriptWithMarkdown.slice(0, 1500)}{fullScript.scriptWithMarkdown.length > 1500 ? '…' : ''}
                </div>
              </div>
            )}
          </>
        )}

        {/* Global navigation - always available */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => dispatch(setCurrentStep(Math.max(0, currentStep - 1)))} disabled={currentStep === 0}>Previous</Button>
          <Button onClick={() => dispatch(setCurrentStep(Math.min(steps.length - 1, currentStep + 1)))} disabled={currentStep === steps.length - 1}>Next</Button>
        </div>
      </CardContent>
    </Card>

    <ScriptUploadModal
      isOpen={isScriptUploadOpen}
      onClose={() => setIsScriptUploadOpen(false)}
      onScriptUpload={handleScriptUpload}
    />
    </>
  );
}


