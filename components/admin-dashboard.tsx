'use client'

import { useState, useEffect } from 'react'
import { useAppSelector } from '../lib/hooks'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { VoiceManagement } from './voice-management'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Crown,
  RefreshCw,
  Edit,
  Trash2,
  VideoIcon,
  Plus,
  Eye,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Volume2,
  FileText,
  Save
} from 'lucide-react'

interface ExtendedUserProfile {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone: string | null
  is_admin: boolean
  profile_id: number | null
  profile_created_at: string | null
  videos: {
    total: number
    completed: number
    processing: number
    failed: number
  }
}

interface UserVideo {
  id: string
  user_id: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  final_video_url: string | null
  error_message: string | null
  metadata: any
  image_urls: string[]
}

interface SavedPrompt {
  id: string
  created_at: string
  prompt: string | null
  title: string | null
  theme: string | null
  audience: string | null
  additional_context: string | null
  POV: string | null
  format: string | null
}

interface PromptFormData {
  promptTitle: string
  title: string
  theme: string
  audience: string
  additionalContext: string
  pov: string
  format: string
}

export function AdminDashboard() {
  const user = useAppSelector(state => state.user)
  const [users, setUsers] = useState<ExtendedUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  
  // User Management
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [userVideos, setUserVideos] = useState<Record<string, UserVideo[]>>({})
  const [loadingUserVideos, setLoadingUserVideos] = useState<Set<string>>(new Set())
  const [editingUser, setEditingUser] = useState<ExtendedUserProfile | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  
  // Admin section navigation
  const [currentSection, setCurrentSection] = useState<'users' | 'voices'>('users')
  
  // Edit user form
  const [editForm, setEditForm] = useState({
    email: '',
    isAdmin: false
  })

  // Create user form
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    isAdmin: false
  })

  // Prompts management state
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null)
  const [showCreatePrompt, setShowCreatePrompt] = useState(false)
  const [promptForm, setPromptForm] = useState<PromptFormData>({
    promptTitle: '',
    title: '',
    theme: '',
    audience: '',
    additionalContext: '',
    pov: '3rd Person',
    format: 'Story'
  })

  useEffect(() => {
    if (user.isAdmin) {
      fetchUsers()
    }
  }, [user.isAdmin])

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  // Fetch users with enhanced data
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/manage-users')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data.users)
      console.log('👥 Fetched users:', data.users)
    } catch (error) {
      showMessage('Error fetching users: ' + (error as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch videos for a specific user
  const fetchUserVideos = async (userId: string) => {
    if (userVideos[userId]) return // Already loaded

    setLoadingUserVideos(prev => new Set(prev).add(userId))
    try {
      const response = await fetch(`/api/admin/user-videos?userId=${userId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch user videos')
      }
      
      const data = await response.json()
      setUserVideos(prev => ({
        ...prev,
        [userId]: data.videos
      }))
    } catch (error) {
      showMessage('Error fetching user videos: ' + (error as Error).message, 'error')
    } finally {
      setLoadingUserVideos(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // Toggle user expansion and load videos
  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
        fetchUserVideos(userId) // Load videos when expanding
      }
      return newSet
    })
  }

  // Delete user
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will permanently delete all their data including videos, profiles, and account access.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/manage-users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      showMessage(`Successfully deleted user ${userEmail}`, 'success')
      fetchUsers() // Refresh the list
    } catch (error) {
      showMessage('Error deleting user: ' + (error as Error).message, 'error')
    }
  }

  // Delete specific video
  const handleDeleteVideo = async (userId: string, videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/user-videos?userId=${userId}&videoId=${videoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete video')
      }

      showMessage('Video deleted successfully', 'success')
      
      // Remove video from local state
      setUserVideos(prev => ({
        ...prev,
        [userId]: prev[userId]?.filter(v => v.id !== videoId) || []
      }))
      
      // Refresh users to update video counts
      fetchUsers()
    } catch (error) {
      showMessage('Error deleting video: ' + (error as Error).message, 'error')
    }
  }

  // Start editing user
  const startEditUser = (userProfile: ExtendedUserProfile) => {
    setEditingUser(userProfile)
    setEditForm({
      email: userProfile.email,
      isAdmin: userProfile.is_admin
    })
  }

  // Save user edits
  const saveUserEdits = async () => {
    if (!editingUser) return

    try {
      const response = await fetch('/api/admin/manage-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          email: editForm.email !== editingUser.email ? editForm.email : undefined,
          isAdmin: editForm.isAdmin
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      showMessage('User updated successfully', 'success')
      setEditingUser(null)
      fetchUsers() // Refresh the list
    } catch (error) {
      showMessage('Error updating user: ' + (error as Error).message, 'error')
    }
  }

  // Create new user
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      showMessage('Email and password are required', 'error')
      return
    }

    try {
      const response = await fetch('/api/admin/manage-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          isAdmin: createForm.isAdmin
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      showMessage('User created successfully', 'success')
      setShowCreateUser(false)
      setCreateForm({ email: '', password: '', isAdmin: false })
      fetchUsers() // Refresh the list
    } catch (error) {
      showMessage('Error creating user: ' + (error as Error).message, 'error')
    }
  }

  // Prompts management functions
  const fetchPrompts = async () => {
    setLoadingPrompts(true)
    try {
      const response = await fetch('/api/prompts')
      if (!response.ok) {
        throw new Error('Failed to fetch prompts')
      }
      const data = await response.json()
      setPrompts(data)
    } catch (error) {
      showMessage('Error fetching prompts: ' + (error as Error).message, 'error')
    } finally {
      setLoadingPrompts(false)
    }
  }

  const handleCreatePrompt = async () => {
    if (!promptForm.promptTitle.trim()) {
      showMessage('Prompt name is required', 'error')
      return
    }

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptForm.promptTitle,
          title: promptForm.title,
          theme: promptForm.theme,
          audience: promptForm.audience,
          additional_context: promptForm.additionalContext,
          POV: promptForm.pov,
          format: promptForm.format,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save prompt')
      }

      showMessage('Prompt created successfully', 'success')
      setShowCreatePrompt(false)
      setPromptForm({
        promptTitle: '',
        title: '',
        theme: '',
        audience: '',
        additionalContext: '',
        pov: '3rd Person',
        format: 'Story'
      })
      fetchPrompts()
    } catch (error) {
      showMessage('Error creating prompt: ' + (error as Error).message, 'error')
    }
  }

  const handleEditPrompt = (prompt: SavedPrompt) => {
    setEditingPrompt(prompt)
    setPromptForm({
      promptTitle: prompt.prompt || '',
      title: prompt.title || '',
      theme: prompt.theme || '',
      audience: prompt.audience || '',
      additionalContext: prompt.additional_context || '',
      pov: prompt.POV || '3rd Person',
      format: prompt.format || 'Story'
    })
  }

  const handleUpdatePrompt = async () => {
    if (!editingPrompt || !promptForm.promptTitle.trim()) {
      showMessage('Prompt name is required', 'error')
      return
    }

    try {
      const response = await fetch(`/api/prompts?id=${editingPrompt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptForm.promptTitle,
          title: promptForm.title,
          theme: promptForm.theme,
          audience: promptForm.audience,
          additional_context: promptForm.additionalContext,
          POV: promptForm.pov,
          format: promptForm.format,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update prompt')
      }

      showMessage('Prompt updated successfully', 'success')
      setEditingPrompt(null)
      setPromptForm({
        promptTitle: '',
        title: '',
        theme: '',
        audience: '',
        additionalContext: '',
        pov: '3rd Person',
        format: 'Story'
      })
      fetchPrompts()
    } catch (error) {
      showMessage('Error updating prompt: ' + (error as Error).message, 'error')
    }
  }

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return
    }

    try {
      const response = await fetch(`/api/prompts?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete prompt')
      }

      showMessage('Prompt deleted successfully', 'success')
      fetchPrompts()
    } catch (error) {
      showMessage('Error deleting prompt: ' + (error as Error).message, 'error')
    }
  }

  useEffect(() => {
    // Prompts section removed
  }, [user.isAdmin, currentSection])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have admin privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <StaggerContainer className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <StaggerItem>
          <motion.div 
            className="text-center space-y-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">
              User management and system administration
            </p>
          </motion.div>
        </StaggerItem>

        {/* Navigation Tabs */}
        <StaggerItem>
          <Card className="bg-gray-900 shadow-sm border border-gray-700">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                variant={currentSection === 'users' ? 'default' : 'outline'}
                onClick={() => setCurrentSection('users')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                User Management
              </Button>
              <Button
                variant={currentSection === 'voices' ? 'default' : 'outline'}
                onClick={() => setCurrentSection('voices')}
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Voice Management
              </Button>
              
            </div>
          </CardContent>
        </Card>
        </StaggerItem>

        {/* User Management Section */}
        {currentSection === 'users' && (
          <Card className="bg-gray-900 shadow-sm border border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management ({users.length} total)
                <div className="ml-auto flex gap-2">
                  <Button
                    onClick={() => setShowCreateUser(!showCreateUser)}
                    size="sm"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {showCreateUser ? 'Cancel' : 'Add User'}
                  </Button>
                  <Button 
                    onClick={fetchUsers} 
                    size="sm" 
                    variant="outline"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-gray-300">
                Comprehensive user management with video tracking and admin controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create User Form */}
              {showCreateUser && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <h4 className="font-medium text-blue-900">Create New User</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Secure password"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="create-admin"
                        checked={createForm.isAdmin}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                      />
                      <Label htmlFor="create-admin">Admin privileges</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateUser} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Create User
                    </Button>
                    <Button onClick={() => setShowCreateUser(false)} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Users List */}
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((userProfile) => (
                    <div key={userProfile.id} className="border rounded-lg p-4 space-y-3">
                      {/* User Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {userProfile.is_admin && (
                              <Crown className="h-4 w-4 text-yellow-600" />
                            )}
                            <span className="font-medium">
                              {userProfile.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {userProfile.is_admin && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              <VideoIcon className="h-3 w-3 mr-1" />
                              {userProfile.videos.total} videos
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => toggleUserExpansion(userProfile.id)}
                            size="sm"
                            variant="outline"
                          >
                            {expandedUsers.has(userProfile.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => startEditUser(userProfile)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(userProfile.id, userProfile.email)}
                            size="sm"
                            variant="destructive"
                            disabled={userProfile.id === user.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* User Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <div>{formatDate(userProfile.created_at)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Sign In:</span>
                          <div>{userProfile.last_sign_in_at ? formatDate(userProfile.last_sign_in_at) : 'Never'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Completed:</span>
                          <div className="text-green-600 font-medium">{userProfile.videos.completed}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Processing:</span>
                          <div className="text-blue-600 font-medium">{userProfile.videos.processing}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Failed:</span>
                          <div className="text-red-600 font-medium">{userProfile.videos.failed}</div>
                        </div>
                      </div>

                      {/* Expanded User Details */}
                      {expandedUsers.has(userProfile.id) && (
                        <div className="pt-3 border-t space-y-3">
                          <h5 className="font-medium text-gray-900">User Videos</h5>
                          {loadingUserVideos.has(userProfile.id) ? (
                            <div className="text-center py-4">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-500">Loading videos...</p>
                            </div>
                          ) : userVideos[userProfile.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {userVideos[userProfile.id].map((video) => (
                                <div key={video.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-3">
                                    <Badge 
                                      variant={
                                        video.status === 'completed' ? 'default' :
                                        video.status === 'failed' ? 'destructive' : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {video.status}
                                    </Badge>
                                    <span className="text-sm">Video {video.id.slice(0, 8)}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(video.created_at)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {video.image_urls.length} images
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {video.final_video_url && (
                                      <Button
                                        onClick={() => window.open(video.final_video_url!, '_blank')}
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => handleDeleteVideo(userProfile.id, video.id)}
                                      size="sm"
                                      variant="destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No videos found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Voice Management Section */}
        {currentSection === 'voices' && (
          <VoiceManagement />
        )}

        

        {/* Edit User Modal */}
        {editingUser && (
          <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Edit User</h3>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-admin"
                    checked={editForm.isAdmin}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  />
                  <Label htmlFor="edit-admin">Admin privileges</Label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={saveUserEdits}>Save Changes</Button>
                <Button onClick={() => setEditingUser(null)} variant="outline">Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit User Modal */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user settings and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-admin"
                  checked={editForm.isAdmin}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                />
                <Label htmlFor="edit-admin">Admin privileges</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setEditingUser(null)} variant="outline">
                Cancel
              </Button>
              <Button onClick={saveUserEdits}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Prompt Modal */}
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Prompt Template</DialogTitle>
              <DialogDescription>
                Update the settings for this prompt template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Prompt Name *</Label>
                  <Input
                    value={promptForm.promptTitle}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, promptTitle: e.target.value }))}
                    placeholder="Enter prompt name"
                  />
                </div>
                <div>
                  <Label>Script Title</Label>
                  <Input
                    value={promptForm.title}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Script title"
                  />
                </div>
                <div>
                  <Label>Theme</Label>
                  <Input
                    value={promptForm.theme}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, theme: e.target.value }))}
                    placeholder="Script theme"
                  />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input
                    value={promptForm.audience}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, audience: e.target.value }))}
                    placeholder="Target audience"
                  />
                </div>
                <div>
                  <Label>POV</Label>
                  <select
                    value={promptForm.pov}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, pov: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="1st Person">1st Person</option>
                    <option value="3rd Person">3rd Person</option>
                  </select>
                </div>
                <div>
                  <Label>Format</Label>
                  <select
                    value={promptForm.format}
                    onChange={(e) => setPromptForm(prev => ({ ...prev, format: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="Story">Story</option>
                    <option value="Facts">Facts</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Interview">Interview</option>
                    <option value="Presentation">Presentation</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Additional Context</Label>
                <textarea
                  value={promptForm.additionalContext}
                  onChange={(e) => setPromptForm(prev => ({ ...prev, additionalContext: e.target.value }))}
                  placeholder="Additional instructions or context"
                  className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setEditingPrompt(null)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleUpdatePrompt}>
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Message */}
        {message && (
          <Card className={`border ${
            messageType === 'success' ? 'border-green-200 bg-green-50' :
            messageType === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {messageType === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {messageType === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                {messageType === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                <span className={`text-sm ${
                  messageType === 'success' ? 'text-green-800' :
                  messageType === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaggerContainer>
  )
} 