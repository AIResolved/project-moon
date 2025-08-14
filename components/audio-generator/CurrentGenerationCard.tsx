'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, CheckCircle, Volume2, Download, Subtitles, AlertCircle } from "lucide-react"

interface Generation {
  id: string
  generatedAt: string
  status: string
  duration?: number
  audioUrl?: string
  compressedAudioUrl?: string
  subtitlesUrl?: string
  subtitlesContent?: string
  error?: string
}

interface CurrentGenerationCardProps {
  currentGeneration: Generation | null
  selectedAudioType: 'original' | 'compressed'
  currentProviderName?: string
  getVoiceDisplayName: (voiceId: string) => string
  providerVoice: string
  onAudioTypeChange: (type: 'original' | 'compressed') => void
  onDownloadAudio: (url: string, filename: string) => void
  onDownloadSubtitles: (url: string, filename: string) => void
}

export function CurrentGenerationCard({
  currentGeneration,
  selectedAudioType,
  currentProviderName,
  getVoiceDisplayName,
  providerVoice,
  onAudioTypeChange,
  onDownloadAudio,
  onDownloadSubtitles
}: CurrentGenerationCardProps) {
  if (!currentGeneration) return null

  return (
    <Card className="bg-gray-800 shadow-sm border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <PlayCircle className="h-5 w-5" />
          Current Generation
        </CardTitle>
        <CardDescription className="text-gray-300">
          Generated on {new Date(currentGeneration.generatedAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Provider:</span>
            <p className="font-medium text-white">{currentProviderName}</p>
          </div>
          <div>
            <span className="text-gray-400">Voice:</span>
            <p className="font-medium text-white">{getVoiceDisplayName(providerVoice)}</p>
          </div>
          <div>
            <span className="text-gray-400">Duration:</span>
            <p className="font-medium text-white">
              {currentGeneration.duration ? `${currentGeneration.duration.toFixed(1)}s` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <Badge 
              variant={currentGeneration.status === 'completed' ? 'default' : 'secondary'}
              className={currentGeneration.status === 'completed' ? 'bg-green-900/40 text-green-300' : ''}
            >
              {currentGeneration.status}
            </Badge>
          </div>
        </div>

        {/* Audio Player */}
        {currentGeneration.audioUrl && (
          <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="font-medium text-green-300">Audio Generated Successfully!</span>
            </div>
            
            {/* Audio Type Toggle */}
            <div className="mb-4 p-3 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">Audio Quality Selection</h4>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audioType"
                      value="original"
                      checked={selectedAudioType === 'original'}
                      onChange={(e) => onAudioTypeChange(e.target.value as 'original')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      Original Quality
                      <span className="text-xs text-green-400 ml-1 font-medium">(Best for Video)</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audioType"
                      value="compressed"
                      checked={selectedAudioType === 'compressed'}
                      onChange={(e) => onAudioTypeChange(e.target.value as 'compressed')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={!currentGeneration.compressedAudioUrl}
                    />
                    <span className="text-sm text-gray-300">
                      Compressed
                      <span className="text-xs text-blue-400 ml-1 font-medium">(60-80% smaller)</span>
                    </span>
                  </label>
                </div>
              </div>
              
              {/* Quality Indicators */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-2 rounded border ${selectedAudioType === 'original' ? 'bg-blue-900/20 border-blue-600' : 'bg-gray-700 border-gray-600'}`}>
                  <div className="font-medium text-gray-300">Original Quality</div>
                  <div className="text-gray-400 mt-1">
                    • Full quality audio<br/>
                    • Perfect for video generation<br/>
                    • Larger file size
                  </div>
                </div>
                <div className={`p-2 rounded border ${selectedAudioType === 'compressed' ? 'bg-blue-900/20 border-blue-600' : 'bg-gray-700 border-gray-600'}`}>
                  <div className="font-medium text-gray-300">Compressed</div>
                  <div className="text-gray-400 mt-1">
                    • 16kHz, 32kbps mono<br/>
                    • Great for subtitles/transcription<br/>
                    • 60-80% smaller file size
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Player */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  Now Playing: {selectedAudioType === 'original' ? 'Original Quality' : 'Compressed'} Audio
                </span>
              </div>
              
              <audio controls className="w-full">
                <source 
                  src={selectedAudioType === 'original' ? currentGeneration.audioUrl! : currentGeneration.compressedAudioUrl!} 
                  type="audio/mpeg" 
                />
                Your browser does not support the audio element.
              </audio>
              
              {!currentGeneration.compressedAudioUrl && selectedAudioType === 'compressed' && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Compressed audio not available for this generation
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => onDownloadAudio(
                  selectedAudioType === 'original' ? currentGeneration.audioUrl! : currentGeneration.compressedAudioUrl!,
                  `${selectedAudioType}-audio-${currentGeneration.id}.mp3`
                )}
                size="sm"
                variant="outline"
                disabled={selectedAudioType === 'compressed' && !currentGeneration.compressedAudioUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download {selectedAudioType === 'original' ? 'Original' : 'Compressed'} Audio
              </Button>
              
              {/* Quick download buttons for both types */}
              {currentGeneration.compressedAudioUrl && (
                <div className="flex gap-1">
                  {selectedAudioType !== 'original' && (
                    <Button
                      onClick={() => onDownloadAudio(currentGeneration.audioUrl!, `original-audio-${currentGeneration.id}.mp3`)}
                      size="sm"
                      variant="ghost"
                      className="text-xs px-2"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Original
                    </Button>
                  )}
                  {selectedAudioType !== 'compressed' && (
                    <Button
                      onClick={() => onDownloadAudio(currentGeneration.compressedAudioUrl!, `compressed-audio-${currentGeneration.id}.mp3`)}
                      size="sm"
                      variant="ghost"
                      className="text-xs px-2"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Compressed
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtitles */}
        {currentGeneration.subtitlesUrl && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Subtitles className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-blue-300">Subtitles Generated</span>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => onDownloadSubtitles(currentGeneration.subtitlesUrl!, `subtitles-${currentGeneration.id}.srt`)}
                size="sm" 
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Subtitles
              </Button>
            </div>
            {currentGeneration.subtitlesContent && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
                  View Subtitles Content
                </summary>
                <pre className="mt-2 p-2 bg-gray-700 border border-gray-600 rounded text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {currentGeneration.subtitlesContent}
                </pre>
              </details>
            )}
          </div>
        )}

        {currentGeneration.status === 'error' && currentGeneration.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="font-medium text-red-300">Generation Error:</span>
            </div>
            <p className="text-red-300 mt-1">{currentGeneration.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 