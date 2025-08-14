'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setScriptSections, setFullScript, type ScriptSection } from '@/lib/features/scripts/scriptsSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

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
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-5');

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [title, setTitle] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [desiredWordCount, setDesiredWordCount] = useState<number>(1000);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

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
          additionalPrompt: additionalData,
          forbiddenWords,
          selectedModel,
          generateQuote: false,
        })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      const data = await response.json();
      if (data.sections) {
        dispatch(setScriptSections(data.sections));
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
          forbiddenWords,
          additionalPrompt: additionalData,
        })
      })
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err)
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
      }
    } catch (e) {
      console.error('Full script generation failed:', e)
      alert('Full script generation failed. Check console for details.')
    } finally {
      setIsGeneratingScript(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label>Select AI Model:</Label>
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
          <h3 className="text-2xl font-bold">Choose an Option</h3>
          <div className="space-y-3">
            {PRESET_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="preset-option"
                  value={opt}
                  checked={selectedOption === opt}
                  onChange={() => { setSelectedOption(opt); if (!title.trim()) setTitle(opt); }}
                />
                <span>{opt}</span>
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
          <Textarea
            placeholder="Enter additional data"
            value={additionalData}
            onChange={(e) => setAdditionalData(e.target.value)}
            rows={5}
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

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline || (!selectedOption && !title.trim())} className="w-full sm:flex-1">
            {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
          </Button>
          <Button onClick={handleGenerateFullScript} disabled={isGeneratingScript || scriptSections.length === 0} variant="secondary" className="w-full sm:flex-1">
            {isGeneratingScript ? 'Generating Script...' : 'Generate Full Script'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


