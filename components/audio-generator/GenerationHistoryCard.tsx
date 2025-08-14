'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, Download } from "lucide-react"

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

interface GenerationHistoryCardProps {
  generationHistory: Generation[]
  historyAudioTypes: Record<string, 'original' | 'compressed'>
  onSetHistoryAudioType: (generationId: string, type: 'original' | 'compressed') => void
  onDownloadAudio: (url: string, filename: string) => void
  onDownloadSubtitles: (url: string, filename: string) => void
}

export function GenerationHistoryCard({
  generationHistory,
  historyAudioTypes,
  onSetHistoryAudioType,
  onDownloadAudio,
  onDownloadSubtitles
}: GenerationHistoryCardProps) {
  if (generationHistory.length === 0) return null

  return (
    <Card className="bg-gray-800 shadow-sm border border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Volume2 className="h-5 w-5" />
          Generation History
        </CardTitle>
        <CardDescription className="text-gray-300">
          Previous audio generations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {generationHistory.map((generation) => {
            const historyAudioType = historyAudioTypes[generation.id] || 'original';
            
            return (
              <div key={generation.id} className="p-4 bg-gray-700 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm text-white">
                    {new Date(generation.generatedAt).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {generation.duration ? `${generation.duration.toFixed(1)}s` : 'N/A'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {generation.status}
                    </Badge>
                  </div>
                </div>

                {/* Audio Type Toggle for History */}
                {generation.audioUrl && (
                  <div className="mb-3 p-2 bg-gray-700 border border-gray-600 rounded">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-300">Audio Quality:</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`audioType-${generation.id}`}
                            value="original"
                            checked={historyAudioType === 'original'}
                            onChange={(e) => onSetHistoryAudioType(generation.id, e.target.value as 'original')}
                            className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span className="text-xs text-gray-300">Original</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`audioType-${generation.id}`}
                            value="compressed"
                            checked={historyAudioType === 'compressed'}
                            onChange={(e) => onSetHistoryAudioType(generation.id, e.target.value as 'compressed')}
                            className="text-blue-600 focus:ring-blue-500 w-3 h-3"
                            disabled={!generation.compressedAudioUrl}
                          />
                          <span className="text-xs text-gray-300">Compressed</span>
                        </label>
                      </div>
                    </div>

                    {/* Mini Audio Player */}
                    <div className="mt-2">
                      <audio controls className="w-full h-8" style={{ height: '32px' }}>
                        <source 
                          src={historyAudioType === 'original' ? generation.audioUrl! : generation.compressedAudioUrl!} 
                          type="audio/mpeg" 
                        />
                        Your browser does not support the audio element.
                      </audio>
                    </div>

                    {!generation.compressedAudioUrl && historyAudioType === 'compressed' && (
                      <div className="text-xs text-amber-600 mt-1">
                        ⚠️ Compressed audio not available
                      </div>
                    )}
                  </div>
                )}

                {/* Download Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {generation.audioUrl && (
                    <>
                      <Button
                        onClick={() => onDownloadAudio(
                          historyAudioType === 'original' ? generation.audioUrl! : generation.compressedAudioUrl!,
                          `${historyAudioType}-audio-${generation.id}.mp3`
                        )}
                        size="sm"
                        variant="outline"
                        disabled={historyAudioType === 'compressed' && !generation.compressedAudioUrl}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {historyAudioType === 'original' ? 'Original' : 'Compressed'}
                      </Button>
                      
                      {/* Quick access to both types */}
                      {generation.compressedAudioUrl && historyAudioType === 'original' && (
                        <Button
                          onClick={() => onDownloadAudio(generation.compressedAudioUrl!, `compressed-audio-${generation.id}.mp3`)}
                          size="sm"
                          variant="ghost"
                          className="text-xs px-2"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Compressed
                        </Button>
                      )}
                      {generation.compressedAudioUrl && historyAudioType === 'compressed' && (
                        <Button
                          onClick={() => onDownloadAudio(generation.audioUrl!, `original-audio-${generation.id}.mp3`)}
                          size="sm"
                          variant="ghost"
                          className="text-xs px-2"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Original
                        </Button>
                      )}
                    </>
                  )}
                  
                  {generation.subtitlesUrl && (
                    <Button
                      onClick={() => onDownloadSubtitles(generation.subtitlesUrl!, `subtitles-${generation.id}.srt`)}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Subtitles
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
} 