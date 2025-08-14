'use client'

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import {
  setIsLoadingVoices,
  setCustomVoices,
  setIsManagingVoice,
  setVoiceManagementError,
  setVoiceFormData,
  setShowVoiceForm,
  setEditingVoiceId,
  addCustomVoice,
  updateCustomVoice,
  removeCustomVoice,
  clearVoiceManagementError,
  AIVoice
} from '../lib/features/audio/audioSlice'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Mic,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react'

interface VoiceManagerProps {
  selectedProvider?: string
  onVoiceSelect?: (voiceId: string, voiceName: string) => void
}

interface ProviderVoice {
  id: string
  name: string
}

const PROVIDER_OPTIONS = [
  { id: 'openai', name: 'OpenAI TTS' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'fishaudio', name: 'Fish Audio' },
  { id: 'voicemaker', name: 'VoiceMaker' },
  { id: 'elevenlabs', name: 'ElevenLabs' },
  { id: 'google-tts', name: 'Google Cloud TTS' }
]

export function VoiceManager({ selectedProvider, onVoiceSelect }: VoiceManagerProps) {
  const dispatch = useAppDispatch()
  const {
    customVoices,
    isLoadingVoices,
    isManagingVoice,
    voiceManagementError,
    voiceFormData,
    showVoiceForm,
    editingVoiceId
  } = useAppSelector(state => state.audio)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [providerVoices, setProviderVoices] = useState<ProviderVoice[]>([])
  const [isLoadingProviderVoices, setIsLoadingProviderVoices] = useState(false)
  const [showProviderVoices, setShowProviderVoices] = useState(false)

  // Load custom voices on component mount and when provider changes
  useEffect(() => {
    loadVoices()
  }, [selectedProvider])

  // Load provider voices when provider changes
  useEffect(() => {
    if (selectedProvider && ['elevenlabs', 'google-tts', 'fishaudio', 'voicemaker'].includes(selectedProvider)) {
      loadProviderVoices()
    }
  }, [selectedProvider])

  const loadVoices = async () => {
    try {
      dispatch(setIsLoadingVoices(true))
      dispatch(clearVoiceManagementError())

      const url = selectedProvider 
        ? `/api/voices?provider=${selectedProvider}`
        : '/api/voices'

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load voices')
      }

      dispatch(setCustomVoices(data.voices || []))
    } catch (error: any) {
      console.error('Error loading voices:', error)
      dispatch(setVoiceManagementError(error.message))
    } finally {
      dispatch(setIsLoadingVoices(false))
    }
  }

    const loadProviderVoices = async () => {
    if (!selectedProvider || !['elevenlabs', 'google-tts', 'fishaudio', 'voicemaker'].includes(selectedProvider)) {
      return
    }

    try {
      setIsLoadingProviderVoices(true)
      dispatch(clearVoiceManagementError())

      let endpoint: string
      let requestConfig: RequestInit = { method: 'GET' }

      switch (selectedProvider) {
        case 'elevenlabs':
          endpoint = '/api/list-elevenlabs-voices'
          break
        case 'google-tts':
          endpoint = '/api/list-google-voices'
          break
        case 'fishaudio':
          endpoint = '/api/list-fishaudio-voices'
          break
        case 'voicemaker':
          endpoint = '/api/get-voicemaker-voices'
          requestConfig = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'en-US' }) // Default to en-US, can be made configurable later
          }
          break
        default:
          return
      }

      const response = await fetch(endpoint, requestConfig)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to load ${selectedProvider} voices`)
      }

      setProviderVoices(data.voices || [])
    } catch (error: any) {
      console.error(`Error loading ${selectedProvider} voices:`, error)
      dispatch(setVoiceManagementError(error.message))
    } finally {
      setIsLoadingProviderVoices(false)
    }
  }

  const handleAddVoice = () => {
    dispatch(setVoiceFormData({
      name: '',
      provider: selectedProvider || '',
      voice_id: ''
    }))
    dispatch(setEditingVoiceId(null))
    dispatch(setShowVoiceForm(true))
  }

  const handleAddProviderVoice = (providerVoice: ProviderVoice) => {
    dispatch(setVoiceFormData({
      name: providerVoice.name,
      provider: selectedProvider || '',
      voice_id: providerVoice.id
    }))
    dispatch(setEditingVoiceId(null))
    dispatch(setShowVoiceForm(true))
  }

  const handleEditVoice = (voice: AIVoice) => {
    dispatch(setEditingVoiceId(voice.id))
    dispatch(setShowVoiceForm(true))
  }

  const handleDeleteVoice = async (voiceId: number) => {
    try {
      dispatch(setIsManagingVoice(true))
      dispatch(clearVoiceManagementError())

      const response = await fetch(`/api/voices?id=${voiceId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete voice')
      }

      dispatch(removeCustomVoice(voiceId))
      setConfirmDeleteId(null)
    } catch (error: any) {
      console.error('Error deleting voice:', error)
      dispatch(setVoiceManagementError(error.message))
    } finally {
      dispatch(setIsManagingVoice(false))
    }
  }

  const handleSaveVoice = async () => {
    if (!voiceFormData.name || !voiceFormData.provider || !voiceFormData.voice_id) {
      dispatch(setVoiceManagementError('All fields are required'))
      return
    }

    try {
      dispatch(setIsManagingVoice(true))
      dispatch(clearVoiceManagementError())

      const isEditing = editingVoiceId !== null
      const url = '/api/voices'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing 
        ? { ...voiceFormData, id: editingVoiceId }
        : voiceFormData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} voice`)
      }

      if (isEditing) {
        dispatch(updateCustomVoice(data.voice))
      } else {
        dispatch(addCustomVoice(data.voice))
      }

      dispatch(setShowVoiceForm(false))
    } catch (error: any) {
      console.error('Error saving voice:', error)
      dispatch(setVoiceManagementError(error.message))
    } finally {
      dispatch(setIsManagingVoice(false))
    }
  }

  const handleFormFieldChange = (field: string, value: string) => {
    dispatch(setVoiceFormData({ [field]: value }))
  }

  const handleVoiceSelection = (voice: AIVoice) => {
    if (onVoiceSelect) {
      onVoiceSelect(voice.voice_id, voice.name)
    }
  }

  // Filter voices by selected provider if provided
  const filteredVoices = selectedProvider 
    ? customVoices.filter(voice => voice.provider === selectedProvider)
    : customVoices

  // Check if a provider voice is already added as custom
  const isProviderVoiceAdded = (providerVoiceId: string) => {
    return filteredVoices.some(voice => voice.voice_id === providerVoiceId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-medium">Custom Voices</h3>
          {selectedProvider && (
            <Badge variant="outline">
              {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {(selectedProvider === 'elevenlabs' || selectedProvider === 'google-tts') && (
            <Button 
              onClick={() => setShowProviderVoices(!showProviderVoices)} 
              size="sm" 
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {showProviderVoices ? 'Hide' : 'Browse'} {selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Google'} Voices
            </Button>
          )}
          <Button onClick={handleAddVoice} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Voice
          </Button>
        </div>
      </div>

      {/* Provider Voices Browser */}
      {showProviderVoices && (selectedProvider === 'elevenlabs' || selectedProvider === 'google-tts') && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  {selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Google TTS'} Voices
                </CardTitle>
                <CardDescription>
                  Browse and add voices from {selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Google Cloud TTS'}
                </CardDescription>
              </div>
              <Button
                onClick={loadProviderVoices}
                size="sm"
                variant="outline"
                disabled={isLoadingProviderVoices}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProviderVoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading {selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Google TTS'} voices...</span>
              </div>
            ) : providerVoices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {providerVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{voice.name}</p>
                          <p className="text-xs text-gray-500">{voice.id}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAddProviderVoice(voice)}
                      size="sm"
                      variant="outline"
                      disabled={isProviderVoiceAdded(voice.id) || isManagingVoice}
                      className="text-xs"
                    >
                      {isProviderVoiceAdded(voice.id) ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No {selectedProvider === 'elevenlabs' ? 'ElevenLabs' : 'Google TTS'} voices found</p>
                <p className="text-sm">Check your API configuration</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {voiceManagementError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{voiceManagementError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingVoices && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading voices...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voices List */}
      {!isLoadingVoices && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {filteredVoices.length > 0 
                ? `${filteredVoices.length} Custom Voice${filteredVoices.length === 1 ? '' : 's'}`
                : 'No Custom Voices'
              }
            </CardTitle>
            {selectedProvider && (
              <CardDescription>
                Custom voices for {PROVIDER_OPTIONS.find(p => p.id === selectedProvider)?.name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {filteredVoices.length > 0 ? (
              <div className="space-y-3">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div 
                      className="flex-grow cursor-pointer"
                      onClick={() => handleVoiceSelection(voice)}
                    >
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{voice.name}</p>
                          <p className="text-sm text-gray-500">
                            {PROVIDER_OPTIONS.find(p => p.id === voice.provider)?.name} • {voice.voice_id}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVoice(voice)}
                        disabled={isManagingVoice}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(voice.id)}
                        disabled={isManagingVoice}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No custom voices found</p>
                <p className="text-sm">Add your first custom voice to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Voice Dialog */}
      <Dialog open={showVoiceForm} onOpenChange={(open: boolean) => dispatch(setShowVoiceForm(open))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVoiceId ? 'Edit Voice' : 'Add New Voice'}
            </DialogTitle>
            <DialogDescription>
              {editingVoiceId 
                ? 'Update the voice details below'
                : 'Add a new custom voice for your TTS provider'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input
                id="voice-name"
                value={voiceFormData.name}
                onChange={(e) => handleFormFieldChange('name', e.target.value)}
                placeholder="Enter a descriptive name for this voice"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-provider">Provider</Label>
              <Select
                value={voiceFormData.provider}
                onValueChange={(value) => handleFormFieldChange('provider', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select TTS provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-id">Voice ID</Label>
              <Input
                id="voice-id"
                value={voiceFormData.voice_id}
                onChange={(e) => handleFormFieldChange('voice_id', e.target.value)}
                placeholder="Enter the provider-specific voice ID"
              />
              <p className="text-xs text-gray-500">
                This is the unique identifier used by the TTS provider (e.g., "alloy" for OpenAI, voice ID for ElevenLabs)
              </p>
            </div>

            {voiceManagementError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{voiceManagementError}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => dispatch(setShowVoiceForm(false))}
              disabled={isManagingVoice}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVoice}
              disabled={isManagingVoice || !voiceFormData.name || !voiceFormData.provider || !voiceFormData.voice_id}
            >
              {isManagingVoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingVoiceId ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editingVoiceId ? 'Update Voice' : 'Add Voice'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this voice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={isManagingVoice}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDeleteVoice(confirmDeleteId)}
              disabled={isManagingVoice}
            >
              {isManagingVoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 