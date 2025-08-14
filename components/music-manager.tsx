'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { setVideoSettings } from '@/lib/features/video/videoSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Loader2, Music, Pause, Play, Trash2, Search, Download, Clock, User } from 'lucide-react'
import { SelectedMusicTrack } from '@/types/video-generation'

interface SearchResult {
  id: string
  title: string
  artist: string
  duration: number
  bpm?: number
  genres?: string[]
  moods?: string[]
  preview_url: string
  license_type: string
}

export function MusicManager() {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(state => state.video.settings)
  const [uploadingMusic, setUploadingMusic] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null)
  
  // Get the current selected track from settings
  const currentSelectedTrack = settings.selectedMusicTrack

  const customMusicFiles: Array<{ id: string; name: string; url: string; duration?: number }> = settings.customMusicFiles || []

  const updateSettings = (partial: any) => dispatch(setVideoSettings(partial))

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingMusic(true)
    const uploadedFiles: Array<{ id: string; name: string; url: string; duration?: number }> = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) {
          alert(`${file.name} is not a valid audio file`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'audio')
        formData.append('path', `custom-music/${Date.now()}-${file.name}`)

        const response = await fetch('/api/upload-file', { method: 'POST', body: formData })
        if (!response.ok) throw new Error(`Failed to upload ${file.name}`)
        const { publicUrl } = await response.json()

        // Get duration
        const audio = new Audio()
        const duration = await new Promise<number>((resolve) => {
          audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
          audio.src = URL.createObjectURL(file)
        })

        uploadedFiles.push({
          id: `music-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: file.name,
          url: publicUrl,
          duration: Math.round(duration)
        })
      }

      const updated = [...customMusicFiles, ...uploadedFiles]
      updateSettings({ customMusicFiles: updated, useCustomMusic: updated.length > 0 })
      alert(`Successfully uploaded ${uploadedFiles.length} music file(s)`) 
    } catch (error) {
      console.error('Music upload error:', error)
      alert(`Failed to upload music: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingMusic(false)
      event.target.value = ''
    }
  }

  const handleRemoveMusic = (musicId: string) => {
    const updated = customMusicFiles.filter(f => f.id !== musicId)
    updateSettings({ customMusicFiles: updated, useCustomMusic: updated.length > 0 })
  }

  const handlePlayPause = (musicId: string) => {
    if (playingAudio === musicId) {
      const audio = document.getElementById(`audio-${musicId}`) as HTMLAudioElement
      audio?.pause()
      setPlayingAudio(null)
      return
    }
    if (playingAudio) {
      const current = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement
      if (current) {
        current.pause()
        current.currentTime = 0
      }
    }
    const audio = document.getElementById(`audio-${musicId}`) as HTMLAudioElement
    if (audio) {
      audio.play()
      setPlayingAudio(musicId)
      audio.onended = () => setPlayingAudio(null)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      const response = await fetch('/api/music-search', {
        // const response = await fetch('http://localhost:3000/api/music-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: searchQuery })
      })

      console.log('Music search response:', response)
      
      if (!response.ok) {
        throw new Error('Failed to search music')
      }
      
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error('Music search error:', error)
      alert('Failed to search music. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectTrack = (track: SearchResult) => {
    setSelectedTrack(track)
    // Convert SearchResult to SelectedMusicTrack format
    const selectedMusicTrack: SelectedMusicTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      preview_url: track.preview_url,
      license_type: track.license_type
    }
    // Update settings to use the selected track
    updateSettings({ 
      selectedMusicTrack,
      useCustomMusic: true 
    })
  }

  

  return (
    <StaggerContainer className="flex-1 p-6 space-y-6">
      <StaggerItem>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-white">Music Library</h1>
          <p className="text-gray-300">Upload and manage background music for your videos or search from our music library.</p>
        </motion.div>
      </StaggerItem>

      <StaggerItem>
        <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Music className="h-5 w-5 text-purple-400" />
            Background Music
          </CardTitle>
          <CardDescription className="text-gray-300">
            Upload your own files or search our music library. Selected music will be used in video generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="upload" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-600">Upload Music</TabsTrigger>
              <TabsTrigger value="search" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-600">Search Library</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="music-upload" className="text-sm font-medium text-gray-300">Upload Audio Files (MP3, WAV, M4A)</Label>
                <Input id="music-upload" type="file" accept="audio/*" multiple onChange={handleMusicUpload} disabled={uploadingMusic} className="mt-2 bg-gray-700 border-gray-600 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-custom-music"
                  checked={!!settings.useCustomMusic && (customMusicFiles.length > 0 || !!currentSelectedTrack)}
                  onCheckedChange={(checked) => updateSettings({ useCustomMusic: !!checked && (customMusicFiles.length > 0 || !!currentSelectedTrack) })}
                  disabled={customMusicFiles.length === 0 && !currentSelectedTrack}
                />
                <Label htmlFor="use-custom-music" className="text-sm text-gray-300">Use background music</Label>
              </div>
            </div>
            {uploadingMusic && (
              <div className="flex items-center gap-2 text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading music files...</span>
              </div>
            )}
          </div>

          {customMusicFiles.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-300">Uploaded Music Files ({customMusicFiles.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customMusicFiles.map((file, index) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-purple-900/40 text-purple-300">#{index + 1}</Badge>
                        <Music className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{file.name}</div>
                        {file.duration && (
                          <div className="text-xs text-gray-400">Duration: {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio id={`audio-${file.id}`} src={file.url} preload="none" />
                      <Button variant="ghost" size="sm" onClick={() => handlePlayPause(file.id)} className="h-8 w-8 p-0 text-gray-300 hover:text-white">
                        {playingAudio === file.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMusic(file.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {customMusicFiles.length > 1 && (
                <div className="text-sm text-blue-300 bg-blue-900/20 border border-blue-600 p-3 rounded-lg">
                  Files will play in the order shown above, looping the entire sequence.
                </div>
              )}
            </div>
          )}
            </TabsContent>
            
            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search for music tracks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || searching}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                
                {currentSelectedTrack && (
                  <div className="p-3 bg-green-900/20 border border-green-600 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Music className="h-4 w-4" />
                      Selected: {currentSelectedTrack.title} by {currentSelectedTrack.artist}
                    </div>
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-300">Search Results ({searchResults.length})</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((track) => (
                        <div 
                          key={track.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                            ${currentSelectedTrack?.id === track.id 
                              ? 'bg-green-900/20 border-green-600' 
                              : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                            }`}
                          onClick={() => handleSelectTrack(track)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-purple-400" />
                              {track.bpm && (
                                <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                  {track.bpm} BPM
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{track.title}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <User className="h-3 w-3" />
                                <span>{track.artist}</span>
                                <Clock className="h-3 w-3 ml-2" />
                                <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                              </div>
                              {track.genres && track.genres.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {track.genres.slice(0, 2).map((genre) => (
                                    <Badge key={genre} variant="outline" className="text-xs border-purple-500 text-purple-300">
                                      {genre}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <audio id={`audio-preview-${track.id}`} src={track.preview_url} preload="none" />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlayPause(`preview-${track.id}`)
                              }} 
                              className="h-8 w-8 p-0 text-gray-300 hover:text-white"
                            >
                              {playingAudio === `preview-${track.id}` ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.length === 0 && searchQuery && !searching && (
                  <div className="text-center py-8 text-gray-400">
                    <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No music tracks found for "{searchQuery}"</p>
                    <p className="text-sm">Try different keywords</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </StaggerItem>
    </StaggerContainer>
  )
}


