'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, Edit, Trash2, Plus, RefreshCw } from 'lucide-react'
import { ScriptUploadModal } from '../ScriptUploadModal'

interface Character {
  name: string;
  role: string;
  description: string;
  arc: string;
}

interface SectionWithSummary {
  title: string;
  summary: string;
}

interface StoryOutline {
  act1: string;
  act2: string;
  act3: string;
}

export function OriginalForm() {
  const dispatch = useAppDispatch()
  const { scriptSections } = useAppSelector(state => state.scripts)

  // Form inputs
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [targetAudience, setTargetAudience] = useState('women over 60')
  const [genre, setGenre] = useState('contemporary inspirational fiction novelette')
  const [sectionPrompt, setSectionPrompt] = useState('')
  const [scriptPrompt, setScriptPrompt] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [forbiddenWords, setForbiddenWords] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [targetWordCount, setTargetWordCount] = useState<number>(15000)
  const [numberOfSections, setNumberOfSections] = useState<number>(8)

  // Loading states
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingSections, setIsGeneratingSections] = useState(false)
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<{[key: string]: boolean}>({})
  const [isScriptUploadOpen, setIsScriptUploadOpen] = useState(false)
  
  // Step states
  const [currentStep, setCurrentStep] = useState<'form' | 'outline' | 'sections' | 'instructions' | 'script'>('form')
  const [storyOutline, setStoryOutline] = useState<StoryOutline | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [themes, setThemes] = useState<string[]>([])
  const [setting, setSetting] = useState('')
  const [keyPlotPoints, setKeyPlotPoints] = useState<string[]>([])
  const [sectionsWithSummary, setSectionsWithSummary] = useState<SectionWithSummary[]>([])

  // Editing states
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)

  // Step 1: Generate outline + characters
  const handleGenerateOutline = async () => {
    if (!title.trim()) return
    setIsGeneratingOutline(true)
    try {
      const response = await fetch('/api/generate-outline-characters/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          targetAudience,
          genre,
          sectionPrompt,
          additionalPrompt,
          forbiddenWords,
          selectedModel,
          targetWordCount
        })
      })
      if (!response.ok) throw new Error('Failed to generate outline')
      const data = await response.json()
      
      setStoryOutline(data.outline)
      setCharacters(data.characters || [])
      setThemes(data.themes || [])
      setSetting(data.setting || '')
      setKeyPlotPoints(data.keyPlotPoints || [])
      setCurrentStep('outline')
    } catch (e) {
      console.error(e)
      alert('Failed to generate outline and characters. Please try again.')
    } finally {
      setIsGeneratingOutline(false)
    }
  }

  // Regenerate outline
  const handleRegenerateOutline = async () => {
    await handleGenerateOutline()
  }

  // Step 2: Generate section titles + summaries
  const handleGenerateSections = async () => {
    if (!storyOutline) return
    setIsGeneratingSections(true)
    try {
      const response = await fetch('/api/generate-section-summaries/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          targetAudience,
          genre,
          outline: storyOutline,
          characters,
          themes,
          setting,
          keyPlotPoints,
          sectionPrompt,
          additionalPrompt,
          forbiddenWords,
          selectedModel,
          targetWordCount,
          numberOfSections
        })
      })
      if (!response.ok) throw new Error('Failed to generate sections')
      const data = await response.json()
      setSectionsWithSummary(data.sections || [])
      setCurrentStep('sections')
    } catch (e) {
      console.error(e)
      alert('Failed to generate section summaries. Please try again.')
    } finally {
      setIsGeneratingSections(false)
    }
  }

  // Step 3: Generate writing instructions
  const handleGenerateInstructions = async () => {
    if (sectionsWithSummary.length === 0) return
    setIsGeneratingInstructions(true)
    try {
      const response = await fetch('/api/generate-writing-instructions/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme,
          targetAudience,
          genre,
          outline: storyOutline,
          characters,
          themes,
          setting,
          sections: sectionsWithSummary,
          sectionPrompt,
          scriptPrompt,
          additionalPrompt,
          forbiddenWords,
          selectedModel,
          targetWordCount
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

  // Step 4: Generate full script
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
          audience: targetAudience,
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

  // Character editing functions
  const handleEditCharacter = (index: number, field: keyof Character, value: string) => {
    const updatedCharacters = [...characters]
    updatedCharacters[index] = { ...updatedCharacters[index], [field]: value }
    setCharacters(updatedCharacters)
  }

  const handleAddCharacter = () => {
    setCharacters([...characters, { name: 'New Character', role: 'Supporting character', description: 'Character description', arc: 'Character development arc' }])
  }

  const handleRemoveCharacter = (index: number) => {
    const updatedCharacters = characters.filter((_, i) => i !== index)
    setCharacters(updatedCharacters)
  }

  // Section editing functions
  const handleEditSection = (index: number, field: 'title' | 'summary', value: string) => {
    const updatedSections = [...sectionsWithSummary]
    updatedSections[index] = { ...updatedSections[index], [field]: value }
    setSectionsWithSummary(updatedSections)
  }

  const handleAddSection = () => {
    setSectionsWithSummary([...sectionsWithSummary, { title: 'New Section Title', summary: 'Brief summary of what happens in this section' }])
  }

  const handleRemoveSection = (index: number) => {
    const updatedSections = sectionsWithSummary.filter((_, i) => i !== index)
    setSectionsWithSummary(updatedSections)
  }

  // Regenerate individual section
  const handleRegenerateSection = async (index: number) => {
    setIsRegenerating({ ...isRegenerating, [`section_${index}`]: true })
    try {
      // This is a simplified regeneration - in a full implementation,
      // you might want a separate API endpoint for individual section regeneration
      await handleGenerateSections()
    } catch (e) {
      console.error(e)
      alert('Failed to regenerate section. Please try again.')
    } finally {
      setIsRegenerating({ ...isRegenerating, [`section_${index}`]: false })
    }
  }

  // Navigation helpers
  const handleBackToForm = () => setCurrentStep('form')
  const handleBackToOutline = () => setCurrentStep('outline')
  const handleBackToSections = () => setCurrentStep('sections')

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

  // Render different steps
  const renderStep = () => {
    switch (currentStep) {
      case 'form':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Story Configuration</CardTitle>
              <CardDescription>Set up your story parameters for outline and character generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Story Title *</Label>
                  <Input 
                    placeholder="Enter your story title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Word Count</Label>
                  <Input 
                    placeholder="15000" 
                    type="number" 
                    value={targetWordCount} 
                    onChange={(e) => setTargetWordCount(e.target.value ? parseInt(e.target.value) : 15000)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Theme (Optional)</Label>
                <Input 
                  placeholder="e.g., redemption, family bonds, overcoming adversity" 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Input 
                    placeholder="e.g., women over 60, young adults" 
                    value={targetAudience} 
                    onChange={(e) => setTargetAudience(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Input 
                    placeholder="e.g., contemporary inspirational fiction novelette" 
                    value={genre} 
                    onChange={(e) => setGenre(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Section Generation Instructions (Optional)</Label>
                <Textarea 
                  placeholder="Specific instructions for how the AI should create and structure the story sections/outline" 
                  value={sectionPrompt} 
                  onChange={(e) => setSectionPrompt(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Story Writing Instructions (Optional)</Label>
                <Textarea 
                  placeholder="Specific instructions for how the AI should write the actual story content" 
                  value={scriptPrompt} 
                  onChange={(e) => setScriptPrompt(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>General Instructions (Optional)</Label>
                <Textarea 
                  placeholder="Any other general instructions that apply to both outline generation and story writing" 
                  value={additionalPrompt} 
                  onChange={(e) => setAdditionalPrompt(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Forbidden Words (Optional)</Label>
                <Textarea 
                  placeholder="Enter words to exclude from generation, separated by commas" 
                  value={forbiddenWords} 
                  onChange={(e) => setForbiddenWords(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <select 
                    className="border rounded px-3 py-2 bg-background w-full" 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast & Economical)</option>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Sections</Label>
                  <Input 
                    type="number" 
                    min="3" 
                    max="20" 
                    value={numberOfSections} 
                    onChange={(e) => setNumberOfSections(parseInt(e.target.value) || 8)} 
                  />
                </div>
              </div>

              <Button 
                onClick={handleGenerateOutline} 
                disabled={isGeneratingOutline || !title.trim()} 
                className="bg-purple-600 hover:bg-purple-700 w-full"
              >
                {isGeneratingOutline ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Outline & Characters...</>
                ) : (
                  'Generate Story Outline & Characters'
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'outline':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review Story Outline & Characters</CardTitle>
              <CardDescription>Review and edit the generated story outline and character profiles. You can modify any details before proceeding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Story Outline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Story Outline</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRegenerateOutline}
                    disabled={isGeneratingOutline}
                  >
                    {isGeneratingOutline ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="font-medium text-sm">Act 1</Label>
                    <Textarea 
                      value={storyOutline?.act1 || ''} 
                      onChange={(e) => setStoryOutline(prev => prev ? { ...prev, act1: e.target.value } : null)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Act 2</Label>
                    <Textarea 
                      value={storyOutline?.act2 || ''} 
                      onChange={(e) => setStoryOutline(prev => prev ? { ...prev, act2: e.target.value } : null)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Act 3</Label>
                    <Textarea 
                      value={storyOutline?.act3 || ''} 
                      onChange={(e) => setStoryOutline(prev => prev ? { ...prev, act3: e.target.value } : null)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Characters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Characters</h4>
                  <Button variant="outline" size="sm" onClick={handleAddCharacter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Character
                  </Button>
                </div>

                <div className="space-y-4">
                  {characters.map((character, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{character.role}</Badge>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRemoveCharacter(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Name</Label>
                            <Input 
                              value={character.name}
                              onChange={(e) => handleEditCharacter(index, 'name', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Role</Label>
                            <Input 
                              value={character.role}
                              onChange={(e) => handleEditCharacter(index, 'role', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea 
                            value={character.description}
                            onChange={(e) => handleEditCharacter(index, 'description', e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Character Arc</Label>
                          <Textarea 
                            value={character.arc}
                            onChange={(e) => handleEditCharacter(index, 'arc', e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Additional Story Details */}
              <div className="space-y-4">
                <h4 className="font-semibold">Story Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium text-sm">Setting</Label>
                    <Textarea 
                      value={setting} 
                      onChange={(e) => setSetting(e.target.value)}
                      placeholder="Where and when does the story take place?"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Key Themes</Label>
                    <Input 
                      value={themes.join(', ')} 
                      onChange={(e) => setThemes(e.target.value.split(',').map(t => t.trim()))}
                      placeholder="Main themes (comma separated)"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToForm}>
                  ← Back to Form
                </Button>
                <Button 
                  onClick={handleGenerateSections} 
                  disabled={isGeneratingSections || !storyOutline}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  {isGeneratingSections ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Sections...</>
                  ) : (
                    'Generate Section Titles & Summaries'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'sections':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review Section Structure</CardTitle>
              <CardDescription>Review and edit the section titles and summaries. These will guide the detailed writing instructions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Section Breakdown ({sectionsWithSummary.length} sections)</h4>
                <Button variant="outline" size="sm" onClick={handleAddSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sectionsWithSummary.map((section, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Section {index + 1}</Badge>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRegenerateSection(index)}
                            disabled={isRegenerating[`section_${index}`]}
                          >
                            {isRegenerating[`section_${index}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRemoveSection(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium">Section Title</Label>
                        <Input 
                          value={section.title}
                          onChange={(e) => handleEditSection(index, 'title', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium">Summary</Label>
                        <Textarea 
                          value={section.summary}
                          onChange={(e) => handleEditSection(index, 'summary', e.target.value)}
                          className="mt-1"
                          rows={3}
                          placeholder="Brief description of what happens in this section..."
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToOutline}>
                  ← Back to Outline
                </Button>
                <Button 
                  onClick={handleGenerateInstructions} 
                  disabled={isGeneratingInstructions || sectionsWithSummary.length === 0}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {isGeneratingInstructions ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Instructions...</>
                  ) : (
                    'Generate Writing Instructions'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'instructions':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Writing Instructions Generated</CardTitle>
              <CardDescription>Detailed writing instructions have been generated for each section. Review them before generating the full story.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scriptSections.map((section, index) => (
                  <Card key={index} className="p-3">
                    <h4 className="font-medium text-sm mb-2">{index + 1}. {section.title}</h4>
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                      {section.writingInstructions}
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBackToSections}>
                  ← Back to Sections
                </Button>
                <Button 
                  onClick={handleGenerateScript} 
                  disabled={isGeneratingScript}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  {isGeneratingScript ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Full Story...</>
                  ) : (
                    'Generate Full Story'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'script':
        return (
          <Card>
            <CardHeader>
              <CardTitle>✅ Story Generated Successfully!</CardTitle>
              <CardDescription>Your story has been generated and is ready for use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The story has been saved to your workspace. You can view it in the script sections, generate audio, or export it.
              </p>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep('form')} className="flex-1">
                  Generate New Story
                </Button>
                <Button 
                  onClick={() => setIsScriptUploadOpen(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Story
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
      <div className="flex items-center justify-center space-x-2 py-4 overflow-x-auto">
        <div className={`flex items-center ${currentStep === 'form' ? 'text-purple-600' : (['outline', 'sections', 'instructions', 'script'].includes(currentStep)) ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${currentStep === 'form' ? 'border-purple-600 bg-purple-100' : (['outline', 'sections', 'instructions', 'script'].includes(currentStep)) ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            1
          </div>
          <span className="ml-1 text-xs font-medium">Config</span>
        </div>
        <div className={`w-6 h-0.5 ${(['outline', 'sections', 'instructions', 'script'].includes(currentStep)) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'outline' ? 'text-blue-600' : (['sections', 'instructions', 'script'].includes(currentStep)) ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${currentStep === 'outline' ? 'border-blue-600 bg-blue-100' : (['sections', 'instructions', 'script'].includes(currentStep)) ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            2
          </div>
          <span className="ml-1 text-xs font-medium">Outline</span>
        </div>
        <div className={`w-6 h-0.5 ${(['sections', 'instructions', 'script'].includes(currentStep)) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'sections' ? 'text-blue-600' : (['instructions', 'script'].includes(currentStep)) ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${currentStep === 'sections' ? 'border-blue-600 bg-blue-100' : (['instructions', 'script'].includes(currentStep)) ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-1 text-xs font-medium">Sections</span>
        </div>
        <div className={`w-6 h-0.5 ${(['instructions', 'script'].includes(currentStep)) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'instructions' ? 'text-blue-600' : currentStep === 'script' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${currentStep === 'instructions' ? 'border-blue-600 bg-blue-100' : currentStep === 'script' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            4
          </div>
          <span className="ml-1 text-xs font-medium">Instructions</span>
        </div>
        <div className={`w-6 h-0.5 ${currentStep === 'script' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep === 'script' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${currentStep === 'script' ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
            5
          </div>
          <span className="ml-1 text-xs font-medium">Story</span>
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