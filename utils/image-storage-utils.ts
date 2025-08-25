import { GeneratedImageSet } from '@/types/image-generation'

export interface StoredImageSet extends GeneratedImageSet {
  // Add any additional storage-specific metadata if needed
  savedAt: string
}

/**
 * Save image set to localStorage
 */
export function saveImageSetToLocalStorage(imageSet: GeneratedImageSet) {
  try {
    const existingImageSets = getStoredImageSetsFromLocalStorage()
    
    const storedImageSet: StoredImageSet = {
      ...imageSet,
      savedAt: new Date().toISOString()
    }
    
    const updatedImageSets = [storedImageSet, ...existingImageSets.filter(set => set.id !== imageSet.id)]
    
    // Keep only last 50 image sets to prevent localStorage bloat
    const imageSetsToStore = updatedImageSets.slice(0, 50)
    
    localStorage.setItem('stored-image-sets', JSON.stringify(imageSetsToStore))
    console.log('💾 Image set saved to localStorage:', imageSet.id)
  } catch (error) {
    console.error('❌ Failed to save image set to localStorage:', error)
  }
}

/**
 * Get stored image sets from localStorage
 */
export function getStoredImageSetsFromLocalStorage(): StoredImageSet[] {
  try {
    const stored = localStorage.getItem('stored-image-sets')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load image sets from localStorage:', error)
    return []
  }
}

/**
 * Remove image set from localStorage
 */
export function deleteImageSetFromLocalStorage(imageSetId: string) {
  try {
    const storedImageSets = getStoredImageSetsFromLocalStorage()
    const updatedImageSets = storedImageSets.filter(set => set.id !== imageSetId)
    localStorage.setItem('stored-image-sets', JSON.stringify(updatedImageSets))
    console.log('🗑️ Image set deleted from localStorage:', imageSetId)
  } catch (error) {
    console.error('❌ Failed to delete image set from localStorage:', error)
  }
}

/**
 * Save confirmed image selection to localStorage
 */
export function saveConfirmedImageSelectionToLocalStorage(imageIds: string[]) {
  try {
    localStorage.setItem('confirmed-image-selection', JSON.stringify(imageIds))
    console.log('📋 Confirmed image selection saved to localStorage')
  } catch (error) {
    console.error('❌ Failed to save confirmed image selection:', error)
  }
}

/**
 * Get confirmed image selection from localStorage
 */
export function getConfirmedImageSelectionFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem('confirmed-image-selection')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load confirmed image selection:', error)
    return []
  }
}

/**
 * Save selected images order to localStorage
 */
export function saveSelectedImagesOrderToLocalStorage(imageIds: string[]) {
  try {
    localStorage.setItem('selected-images-order', JSON.stringify(imageIds))
    console.log('📋 Selected images order saved to localStorage')
  } catch (error) {
    console.error('❌ Failed to save selected images order:', error)
  }
}

/**
 * Save selected animation images to localStorage
 */
export function saveSelectedAnimationImagesToLocalStorage(imageIds: string[]) {
  try {
    localStorage.setItem('selected-animation-images', JSON.stringify(imageIds))
    console.log('🎨 Selected animation images saved to localStorage')
  } catch (error) {
    console.error('❌ Failed to save selected animation images:', error)
  }
}

/**
 * Get selected animation images from localStorage
 */
export function getSelectedAnimationImagesFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem('selected-animation-images')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load selected animation images:', error)
    return []
  }
}

/**
 * Get selected images order from localStorage
 */
export function getSelectedImagesOrderFromLocalStorage(): string[] {
  try {
    const stored = localStorage.getItem('selected-images-order')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load selected images order:', error)
    return []
  }
}

/**
 * Clear all image-related localStorage data
 */
export function clearAllImageDataFromLocalStorage() {
  try {
    localStorage.removeItem('stored-image-sets')
    localStorage.removeItem('confirmed-image-selection')
    localStorage.removeItem('selected-images-order')
    console.log('🧹 All image data cleared from localStorage')
  } catch (error) {
    console.error('❌ Failed to clear image data from localStorage:', error)
  }
}
