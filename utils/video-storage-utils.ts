import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface StoredVideo {
  id: string
  originalUrl: string
  supabaseUrl: string
  filename: string
  uploadedAt: string
  type: 'text-to-video' | 'image-to-video'
  prompt: string
  duration: number
  metadata?: {
    originalImageUrl?: string
    generatedAt: string
  }
}

/**
 * Download video from external URL and upload to Supabase storage
 */
export async function uploadVideoToSupabase(
  videoUrl: string,
  videoId: string,
  metadata: {
    type: 'text-to-video' | 'image-to-video'
    prompt: string
    duration: number
    generatedAt: string
    originalImageUrl?: string
  }
): Promise<StoredVideo | null> {
  try {
    console.log('📁 Uploading video to Supabase:', videoId)

    // Download the video from the external URL
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }

    const videoBlob = await response.blob()
    const filename = `generated-videos/${videoId}.mp4`

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filename, videoBlob, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      throw error
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(filename)

    const storedVideo: StoredVideo = {
      id: videoId,
      originalUrl: videoUrl,
      supabaseUrl: urlData.publicUrl,
      filename,
      uploadedAt: new Date().toISOString(),
      type: metadata.type,
      prompt: metadata.prompt,
      duration: metadata.duration,
      metadata
    }

    console.log('✅ Video uploaded to Supabase successfully')
    return storedVideo

  } catch (error) {
    console.error('❌ Failed to upload video to Supabase:', error)
    return null
  }
}

/**
 * Save stored video metadata to localStorage
 */
export function saveVideoToLocalStorage(storedVideo: StoredVideo) {
  try {
    const existingVideos = getStoredVideosFromLocalStorage()
    const updatedVideos = [storedVideo, ...existingVideos.filter(v => v.id !== storedVideo.id)]
    
    // Keep only last 100 videos
    const videosToStore = updatedVideos.slice(0, 100)
    
    localStorage.setItem('stored-videos', JSON.stringify(videosToStore))
    console.log('💾 Video metadata saved to localStorage')
  } catch (error) {
    console.error('❌ Failed to save video to localStorage:', error)
  }
}

/**
 * Get stored videos from localStorage
 */
export function getStoredVideosFromLocalStorage(): StoredVideo[] {
  try {
    const stored = localStorage.getItem('stored-videos')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load videos from localStorage:', error)
    return []
  }
}

/**
 * Remove video from Supabase storage and localStorage
 */
export async function deleteStoredVideo(videoId: string) {
  try {
    const storedVideos = getStoredVideosFromLocalStorage()
    const video = storedVideos.find(v => v.id === videoId)
    
    if (video) {
      // Delete from Supabase storage
      const { error } = await supabase.storage
        .from('audio')
        .remove([video.filename])

      if (error) {
        console.error('❌ Failed to delete from Supabase:', error)
      }

      // Remove from localStorage
      const updatedVideos = storedVideos.filter(v => v.id !== videoId)
      localStorage.setItem('stored-videos', JSON.stringify(updatedVideos))
      
      console.log('🗑️ Video deleted successfully')
    }
  } catch (error) {
    console.error('❌ Failed to delete video:', error)
  }
}

/**
 * Get selected videos for video generation
 */
export function getSelectedVideosFromLocalStorage(): string[] {
  try {
    const selected = localStorage.getItem('selected-videos-for-generation')
    return selected ? JSON.parse(selected) : []
  } catch (error) {
    console.error('❌ Failed to load selected videos:', error)
    return []
  }
}

/**
 * Save selected videos for video generation
 */
export function saveSelectedVideosToLocalStorage(videoIds: string[]) {
  try {
    localStorage.setItem('selected-videos-for-generation', JSON.stringify(videoIds))
    console.log('📋 Selected videos saved for video generation')
  } catch (error) {
    console.error('❌ Failed to save selected videos:', error)
  }
} 