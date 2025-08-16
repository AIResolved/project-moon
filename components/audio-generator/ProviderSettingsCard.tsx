'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Volume2, Loader2, CheckCircle, Subtitles } from "lucide-react"

interface TTSProvider {
  name: string
  voices: { id: string; name: string }[]
  models?: { id: string; name: string }[]
  languages?: { code: string; name: string }[]
}

interface ProviderSettingsCardProps {
  contentSummary: string | null
  currentProvider: TTSProvider | null
  selectedProvider: string
  providerVoice: string
  providerModel: string
  languageCode: string
  generateSubtitlesOption: boolean
  isLoadingApiVoices: boolean
  isGeneratingAudio: boolean
  ttsProviders: Record<string, TTSProvider>
  
  // Voice selection helpers
  getVoicesWithSeparator: any
  
  // Event handlers
  onProviderChange: (provider: string) => void
  onVoiceChange: (voice: string) => void
  onModelChange: (model: string) => void
  onLanguageChange: (language: string) => void
  onGenerateSubtitlesChange: (generate: boolean) => void
  onGenerateAudio: () => void
}

export function ProviderSettingsCard({
  contentSummary,
  currentProvider,
  selectedProvider,
  providerVoice,
  providerModel,
  languageCode,
  generateSubtitlesOption,
  isLoadingApiVoices,
  isGeneratingAudio,
  ttsProviders,
  getVoicesWithSeparator,
  onProviderChange,
  onVoiceChange,
  onModelChange,
  onLanguageChange,
  onGenerateSubtitlesChange,
  onGenerateAudio
}: ProviderSettingsCardProps) {
  if (!contentSummary) return null

  return (
    <Card className="bg-gray-800 shadow-sm border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Volume2 className="h-5 w-5" />
          Audio Generation Settings
        </CardTitle>
        <CardDescription className="text-gray-300">
          Configure TTS provider, voice, and model options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-gray-300">TTS Provider</Label>
          <Select value={selectedProvider} onValueChange={onProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ttsProviders).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider-specific settings */}
        {currentProvider && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Voice Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">Voice</Label>
              {isLoadingApiVoices ? (
                <div className="flex items-center gap-2 p-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading voices...
                </div>
              ) : (
                <Select value={providerVoice} onValueChange={onVoiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const { standardVoices, customVoices } = getVoicesWithSeparator
                      const elements = []
                      
                      // Add standard voices
                      standardVoices.forEach((voice: any, index: number) => {
                        elements.push(
                          <SelectItem key={voice.id || `voice-${index}`} value={voice.id || `voice-${index}`}>
                            {voice.name}
                          </SelectItem>
                        )
                      })
                      
                      // Add separator if we have both standard and custom voices
                      if (standardVoices.length > 0 && customVoices.length > 0) {
                        elements.push(
                          <div key="separator" className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-gray-800 px-2 text-gray-400">Custom Voices</span>
                            </div>
                          </div>
                        )
                      }
                      
                      // Add custom voices
                      customVoices.forEach((voice: any, index: number) => {
                        elements.push(
                          <SelectItem key={voice.id || `custom-voice-${index}`} value={voice.id || `custom-voice-${index}`}>
                            {voice.name}
                          </SelectItem>
                        )
                      })
                      
                      return elements
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Model Selection */}
            {currentProvider.models && (
              <div className="space-y-2">
                <Label className="text-gray-300">Model</Label>
                <Select value={providerModel} onValueChange={onModelChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProvider.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Language Selection for ElevenLabs only */}
            {selectedProvider === 'elevenlabs' && currentProvider.languages && (
              <div className="space-y-2">
                <Label className="text-gray-300">Language</Label>
                <Select value={languageCode} onValueChange={onLanguageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProvider.languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Subtitles Generation Option */}
        <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Subtitles className="h-5 w-5 text-blue-600" />
              <div>
                <Label htmlFor="generateSubtitles" className="text-sm font-medium text-white">
                  Generate Subtitles
                </Label>
                <p className="text-xs text-gray-400 mt-1">
                  Automatically create SRT subtitles using OpenAI Whisper
                </p>
              </div>
            </div>
            <Checkbox
              id="generateSubtitles"
              checked={generateSubtitlesOption}
              onCheckedChange={(checked) => onGenerateSubtitlesChange(checked as boolean)}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerateAudio}
          disabled={
            isGeneratingAudio || 
            !providerVoice || 
            (selectedProvider === 'elevenlabs' && !languageCode)
          }
          className="w-full bg-purple-600 hover:bg-purple-700"
          size="lg"
        >
          {isGeneratingAudio ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Audio...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              Generate Audio with {currentProvider?.name}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 