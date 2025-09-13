import { v4 as uuidv4 } from 'uuid'

export interface StoredMixedContentSequence {
  id: string
  name: string
  description?: string
  items: {
    id: string
    type: 'animation' | 'image' | 'video'
    title: string
    url: string
    thumbnail?: string
    duration?: number
    order: number
    source: string
  }[]
  createdAt: string
  totalItems: number
  totalImages: number
  totalVideos: number
  totalAnimations: number
}

/**
 * Save mixed content sequence to localStorage
 */
export function saveMixedContentSequenceToLocalStorage(
  items: any[],
  name: string,
  description?: string
): string {
  try {
    const existingSequences = getStoredMixedContentSequencesFromLocalStorage()
    
    const totalImages = items.filter(item => item.type === 'image' || item.type === 'animation').length
    const totalVideos = items.filter(item => item.type === 'video').length
    const totalAnimations = items.filter(item => item.type === 'animation').length
    
    const sequence: StoredMixedContentSequence = {
      id: uuidv4(),
      name: name || `Mixed Content ${new Date().toLocaleDateString()}`,
      description,
      items: items.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        thumbnail: item.thumbnail,
        duration: item.duration,
        order: item.order,
        source: item.source
      })),
      createdAt: new Date().toISOString(),
      totalItems: items.length,
      totalImages,
      totalVideos,
      totalAnimations
    }
    
    // Add to beginning of array (most recent first)
    const updatedSequences = [sequence, ...existingSequences]
    
    // Keep only last 20 sequences to prevent localStorage bloat
    const sequencesToStore = updatedSequences.slice(0, 20)
    
    localStorage.setItem('stored-mixed-content-sequences', JSON.stringify(sequencesToStore))
    console.log('💾 Mixed content sequence saved to localStorage:', sequence.id)
    return sequence.id
  } catch (error) {
    console.error('❌ Failed to save mixed content sequence to localStorage:', error)
    return ''
  }
}

/**
 * Get stored mixed content sequences from localStorage
 */
export function getStoredMixedContentSequencesFromLocalStorage(): StoredMixedContentSequence[] {
  try {
    const stored = localStorage.getItem('stored-mixed-content-sequences')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load mixed content sequences from localStorage:', error)
    return []
  }
}

/**
 * Delete specific mixed content sequence from localStorage
 */
export async function deleteStoredMixedContentSequence(sequenceId: string) {
  try {
    const sequences = getStoredMixedContentSequencesFromLocalStorage()
    const updatedSequences = sequences.filter(seq => seq.id !== sequenceId)
    
    localStorage.setItem('stored-mixed-content-sequences', JSON.stringify(updatedSequences))
    console.log('🗑️ Mixed content sequence deleted:', sequenceId)
  } catch (error) {
    console.error('❌ Failed to delete mixed content sequence:', error)
  }
}

/**
 * Update mixed content sequence name/description
 */
export function updateStoredMixedContentSequence(
  sequenceId: string,
  updates: { name?: string; description?: string }
) {
  try {
    const sequences = getStoredMixedContentSequencesFromLocalStorage()
    const sequenceIndex = sequences.findIndex(seq => seq.id === sequenceId)
    
    if (sequenceIndex !== -1) {
      sequences[sequenceIndex] = {
        ...sequences[sequenceIndex],
        ...updates
      }
      
      localStorage.setItem('stored-mixed-content-sequences', JSON.stringify(sequences))
      console.log('✏️ Mixed content sequence updated:', sequenceId)
      return true
    }
    return false
  } catch (error) {
    console.error('❌ Failed to update mixed content sequence:', error)
    return false
  }
}

/**
 * Clear all stored mixed content sequences
 */
export function clearAllMixedContentSequencesFromLocalStorage() {
  try {
    localStorage.removeItem('stored-mixed-content-sequences')
    console.log('🧹 All mixed content sequences cleared from localStorage')
  } catch (error) {
    console.error('❌ Failed to clear mixed content sequences:', error)
  }
}
