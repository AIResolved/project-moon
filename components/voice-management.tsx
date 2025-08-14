'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Volume2, Plus, Edit3, Trash2, Loader2, CheckCircle, AlertCircle, Filter, Users } from 'lucide-react'
import { AIVoice } from '@/app/api/ai-voices/route'

// Available TTS providers
const TTS_PROVIDERS = [
  { id: 'minimax', name: 'MiniMax' },
  { id: 'elevenlabs', name: 'ElevenLabs' },
  { id: 'fishaudio', name: 'Fish Audio' },
  { id: 'voicemaker', name: 'VoiceMaker' },
  { id: 'google-tts', name: 'Google TTS' }
]

interface VoiceFormData {
  name: string
  provider: string
  voice_id: string
}

// Voice form component - extracted outside to prevent re-creation
interface VoiceFormProps {
  formData: VoiceFormData
  setFormData: (data: VoiceFormData) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  editingVoice: AIVoice | null
  onCancel: () => void
}

const VoiceForm = ({ formData, setFormData, onSubmit, isSubmitting, editingVoice, onCancel }: VoiceFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">Voice Name</Label>
      <Input
        id="name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., My Custom Voice"
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="provider">Provider</Label>
      <Select
        value={formData.provider}
        onValueChange={(value) => setFormData({ ...formData, provider: value })}
        required
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          {TTS_PROVIDERS.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              {provider.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label htmlFor="voice_id">Voice ID / Name</Label>
      <Input
        id="voice_id"
        value={formData.voice_id}
        onChange={(e) => setFormData({ ...formData, voice_id: e.target.value })}
        placeholder="e.g., ElevenLabs voice ID, Google voice name (en-US-Wavenet-D)"
        required
      />
      <p className="text-xs text-gray-400">
        Provider-specific voice identifier
      </p>
    </div>

    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {editingVoice ? 'Update Voice' : 'Add Voice'}
      </Button>
    </DialogFooter>
  </form>
)

export function VoiceManagement() {
  const [voices, setVoices] = useState<AIVoice[]>([])
  const [filteredVoices, setFilteredVoices] = useState<AIVoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingVoice, setEditingVoice] = useState<AIVoice | null>(null)
  const [deletingVoice, setDeletingVoice] = useState<AIVoice | null>(null)
  const [formData, setFormData] = useState<VoiceFormData>({
    name: '',
    provider: '',
    voice_id: ''
  })
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null })

  // Fetch voices from API
  const fetchVoices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai-voices')
      if (!response.ok) {
        throw new Error('Failed to fetch voices')
      }
      const data = await response.json()
      setVoices(data.voices || [])
    } catch (error: any) {
      console.error('Error fetching voices:', error)
      showMessage('Failed to fetch voices', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Show message
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: null }), 5000)
  }

  // Filter voices based on provider
  useEffect(() => {
    if (filterProvider === 'all') {
      setFilteredVoices(voices)
    } else {
      setFilteredVoices(voices.filter(voice => voice.provider === filterProvider))
    }
  }, [voices, filterProvider])

  // Load voices on component mount
  useEffect(() => {
    fetchVoices()
  }, [])

  // Reset form data
  const resetForm = () => {
    setFormData({ name: '', provider: '', voice_id: '' })
    setEditingVoice(null)
  }

  // Handle cancel form
  const handleCancelForm = () => {
    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
    resetForm()
  }

  // Handle form submission for add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.provider || !formData.voice_id) {
      showMessage('Please fill in all fields', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const url = '/api/ai-voices'
      const method = editingVoice ? 'PUT' : 'POST'
      const body = editingVoice 
        ? { ...formData, id: editingVoice.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save voice')
      }

      await fetchVoices()
      showMessage(
        editingVoice ? 'Voice updated successfully' : 'Voice added successfully',
        'success'
      )
      
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving voice:', error)
      showMessage(error.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle voice deletion
  const handleDelete = async () => {
    if (!deletingVoice?.id) return

    try {
      const response = await fetch(`/api/ai-voices?id=${deletingVoice.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete voice')
      }

      await fetchVoices()
      showMessage('Voice deleted successfully', 'success')
      setIsDeleteDialogOpen(false)
      setDeletingVoice(null)
    } catch (error: any) {
      console.error('Error deleting voice:', error)
      showMessage(error.message, 'error')
    }
  }

  // Handle edit button click
  const handleEdit = (voice: AIVoice) => {
    setEditingVoice(voice)
    setFormData({
      name: voice.name,
      provider: voice.provider,
      voice_id: voice.voice_id
    })
    setIsEditDialogOpen(true)
  }

  // Handle delete button click
  const handleDeleteClick = (voice: AIVoice) => {
    setDeletingVoice(voice)
    setIsDeleteDialogOpen(true)
  }

  // Handle add button click
  const handleAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  // Get provider display name
  const getProviderName = (providerId: string) => {
    const provider = TTS_PROVIDERS.find(p => p.id === providerId)
    return provider?.name || providerId
  }

  // Group voices by provider
  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    if (!acc[voice.provider]) {
      acc[voice.provider] = []
    }
    acc[voice.provider].push(voice)
    return acc
  }, {} as Record<string, AIVoice[]>)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-900 text-white rounded-lg">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Voice Management</h1>
        <p className="text-gray-300">
          Manage custom AI voices for different TTS providers
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-gray-800 shadow-sm border border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Custom Voices
          </CardTitle>
          <CardDescription className="text-gray-300">
            Add, edit, and manage custom voices for audio generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Label htmlFor="filter" className="text-gray-200">Filter by Provider:</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {TTS_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Voice Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Voice
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Voice</DialogTitle>
                  <DialogDescription>
                    Add a new custom voice for TTS generation
                  </DialogDescription>
                </DialogHeader>
                <VoiceForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  editingVoice={editingVoice}
                  onCancel={handleCancelForm}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Message Display */}
          {message.type && (
            <div className={`mt-4 p-3 rounded-lg border ${
              message.type === 'success' 
                ? 'border-green-800 bg-green-900/30 text-green-200' 
                : 'border-red-800 bg-red-900/30 text-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voices List */}
      <div className="space-y-6">
        {isLoading ? (
          <Card className="bg-gray-800 shadow-sm border border-gray-700">
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading voices...
            </CardContent>
          </Card>
        ) : filteredVoices.length === 0 ? (
          <Card className="bg-gray-800 shadow-sm border border-gray-700">
            <CardContent className="text-center py-8">
              <Volume2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Custom Voices</h3>
              <p className="text-gray-300 mb-4">
                {filterProvider === 'all' 
                  ? 'No custom voices have been added yet.'
                  : `No custom voices found for ${getProviderName(filterProvider)}.`
                }
              </p>
              <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Voice
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedVoices).map(([provider, providerVoices]) => (
            <Card key={provider} className="bg-gray-800 shadow-sm border border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  {getProviderName(provider)}
                  <Badge variant="secondary">{providerVoices.length} voices</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providerVoices.map((voice) => (
                    <div key={voice.id} className="p-4 border border-gray-600 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{voice.name}</h4>
                          <p className="text-sm text-gray-300 truncate">ID: {voice.voice_id}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(voice)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(voice)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Added {voice.created_at ? new Date(voice.created_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Voice</DialogTitle>
            <DialogDescription>
              Update the custom voice details
            </DialogDescription>
          </DialogHeader>
          <VoiceForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            editingVoice={editingVoice}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingVoice?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingVoice(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 