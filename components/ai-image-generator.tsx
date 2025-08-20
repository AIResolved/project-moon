'use client'

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { 
  setSelectedModel,
  setAspectRatio, 
  setNumberOfScenesToExtract,
  startSceneExtraction,
  completeSceneExtraction,
  failSceneExtraction,
  updateScenePrompt,
  addCustomScene,
  startGeneration,
  updateGenerationInfo,
  completeGeneration,
  failGeneration,
  clearError,
  clearImageSets,
  removeImageSet,
  setSelectedImagesOrder,
  clearSelectedImagesOrder,
  updateImageInSet,
  loadImageSets,
  loadConfirmedImageSelection,
  loadSelectedImagesOrder
} from '@/lib/features/imageGeneration/imageGenerationSlice'
import { 
  saveImageSetToLocalStorage,
  saveSelectedImagesOrderToLocalStorage,
  getStoredImageSetsFromLocalStorage,
  getConfirmedImageSelectionFromLocalStorage,
  getSelectedImagesOrderFromLocalStorage
} from '@/utils/image-storage-utils'
import type { ExtractedScene, GeneratedImageSet, ImageProvider } from '@/types/image-generation'
import { v4 as uuidv4 } from 'uuid'
import { IMAGE_STYLES, LIGHTING_TONES, MODEL_INFO } from '@/data/image'

// Import modular components
import { ModelSelection } from './image-generation/ModelSelection'
import { SceneExtraction } from './image-generation/SceneExtraction'
import { ImageStyleSelector } from './image-generation/ImageStyleSelector'
import { ImageGenerationControls } from './image-generation/ImageGenerationControls'
import { GeneratedImageDisplay } from './image-generation/GeneratedImageDisplay'
import { ThumbnailGenerator } from './image-generation/ThumbnailGenerator'
import { VideoSelectionConfirmation } from './image-generation/VideoSelectionConfirmation'

export function AIImageGenerator() {
  const dispatch = useAppDispatch()
  const { 
    imageSets, 
    isGenerating, 
    error, 
    generationInfo,
    selectedModel,
    aspectRatio,
    extractedScenes,
    isExtractingScenes,
    sceneExtractionError,
    numberOfScenesToExtract,
    selectedImagesOrder
  } = useAppSelector(state => state.imageGeneration)
  
  // Get script from Redux state
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)
  
  // Local state
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [scriptInput, setScriptInput] = useState('')
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null)
  const [showImageSelection, setShowImageSelection] = useState(false)
  const [selectedImageStyle, setSelectedImageStyle] = useState<string>('realistic')
  const [selectedLightingTone, setSelectedLightingTone] = useState<string>('balanced')
  const [customStylePrompt, setCustomStylePrompt] = useState<string>('')
  const [regeneratingImages, setRegeneratingImages] = useState<Set<string>>(new Set())

  // Thumbnail generator state
  const [thumbnailPrompt, setThumbnailPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [thumbnailResult, setThumbnailResult] = useState<string | null>(null)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
  const [thumbnailImageStyle, setThumbnailImageStyle] = useState<string>('realistic')
  const [thumbnailLightingTone, setThumbnailLightingTone] = useState<string>('balanced')
  const [thumbnailCustomStyle, setThumbnailCustomStyle] = useState<string>('')

  // Load data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load image sets from localStorage
      const storedImageSets = getStoredImageSetsFromLocalStorage()
      if (storedImageSets.length > 0) {
        dispatch(loadImageSets(storedImageSets))
        console.log(`🔄 [AI Image Generator] Loaded ${storedImageSets.length} image sets from localStorage`)
      }

      // Load confirmed image selection from localStorage
      const storedConfirmedSelection = getConfirmedImageSelectionFromLocalStorage()
      if (storedConfirmedSelection.length > 0) {
        dispatch(loadConfirmedImageSelection(storedConfirmedSelection))
        console.log(`🔄 [AI Image Generator] Loaded ${storedConfirmedSelection.length} confirmed image selections from localStorage`)
      }

      // Load selected images order from localStorage
      const storedImagesOrder = getSelectedImagesOrderFromLocalStorage()
      if (storedImagesOrder.length > 0) {
        dispatch(loadSelectedImagesOrder(storedImagesOrder))
        console.log(`🔄 [AI Image Generator] Loaded ${storedImagesOrder.length} selected images order from localStorage`)
      }
    }
  }, [dispatch])

  // Save imageSets to localStorage whenever they change
  useEffect(() => {
    if (imageSets.length > 0) {
      imageSets.forEach(imageSet => {
        saveImageSetToLocalStorage(imageSet)
      })
      console.log(`💾 [AI Image Generator] Saved ${imageSets.length} image sets to localStorage`)
    }
  }, [imageSets])

  // Save selected images order to localStorage whenever it changes
  useEffect(() => {
    if (selectedImagesOrder.length > 0) {
      saveSelectedImagesOrderToLocalStorage(selectedImagesOrder)
      console.log(`📋 [AI Image Generator] Saved ${selectedImagesOrder.length} selected images order to localStorage`)
    }
  }, [selectedImagesOrder])

  // Get available script sources (prioritized)
  const fullScriptText = fullScript?.scriptWithMarkdown || ''
  
  // Determine what script source to use for extraction
  const getScriptForExtraction = () => {
    if (scriptInput.trim()) {
      return scriptInput.trim()
    }
    if (fullScriptText) {
      return fullScriptText
    }
    return ''
  }

  const getScriptSourceInfo = () => {
    if (scriptInput.trim()) {
      return { source: 'custom', count: scriptInput.length, type: 'Custom script input' }
    }
    if (fullScriptText) {
      return { source: 'full', count: fullScriptText.length, type: 'Full generated script' }
    }
    return { source: 'none', count: 0, type: 'No script available' }
  }

  // Handler functions
  const handleModelChange = (model: ImageProvider) => {
    dispatch(setSelectedModel(model))
  }

  const handleExtractScenes = async () => {
    const scriptToUse = getScriptForExtraction()
    
    if (!scriptToUse) {
      dispatch(failSceneExtraction('No script available. Please generate a script first or paste one below.'))
      return
    }

    dispatch(startSceneExtraction({ numberOfScenes: numberOfScenesToExtract }))

    try {
      const response = await fetch('/api/extract-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptToUse,
          numberOfScenes: numberOfScenesToExtract,
          userId: 'user-123'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract scenes')
      }

      const data = await response.json()
      dispatch(completeSceneExtraction({ scenes: data.scenes }))
    } catch (error) {
      console.error('Error extracting scenes:', error)
      dispatch(failSceneExtraction(
        error instanceof Error ? error.message : 'Failed to extract scenes'
      ))
    }
  }

  const handleUpdateScenePrompt = (index: number, newPrompt: string) => {
    dispatch(updateScenePrompt({ index, newPrompt }))
  }

  const handleAddCustomScene = (prompt: string, title: string) => {
    const customScene = {
      chunkIndex: extractedScenes.length,
      originalText: `Custom scene: ${title}`,
      imagePrompt: prompt,
      summary: title,
    }
    dispatch(addCustomScene(customScene))
  }

  // Helper function to apply image style to prompt
  const applyImageStyle = (basePrompt: string) => {
    if (!selectedImageStyle || selectedImageStyle === 'none') return basePrompt
    
    const selectedStyle = IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]
    if (!selectedStyle || !selectedStyle.prefix) return basePrompt
    
    return `${selectedStyle.prefix}${basePrompt}`
  }

  // Generate images with batch processing
  const generateImagesBatch = async (prompts: string[], batchIndex: number, totalBatches: number) => {
    const batchSize = MODEL_INFO[selectedModel].batchSize
    const batchPrompts = prompts.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
    
    setBatchProgress({ 
      current: batchIndex * batchSize, 
      total: prompts.length, 
      currentBatch: batchIndex + 1, 
      totalBatches 
    })

    dispatch(updateGenerationInfo(
      `Processing batch ${batchIndex + 1}/${totalBatches} (${batchPrompts.length} images)...`
    ))

      const requestPromises = batchPrompts.map(async (prompt, index) => {
        try {
          const response = await fetch('/api/generate-images', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: selectedModel,
              prompt: prompt,
              numberOfImages: 1,
              minimaxAspectRatio: aspectRatio,
              userId: 'user-123',
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error(`Failed to generate image ${index + 1} in batch ${batchIndex + 1}:`, errorData.error)
            return []
          }

          const data = await response.json()
          return data.imageUrls ? data.imageUrls : []
        } catch (error) {
          console.error(`Error generating image ${index + 1} in batch ${batchIndex + 1}:`, error)
          return []
        }
      })

      // Wait for all requests in the batch to complete
      const results = await Promise.all(requestPromises)
      const imageUrls = results.flat()

      // Update progress for the entire batch
      setBatchProgress(prev => ({ 
        ...prev, 
        current: prev.current + batchPrompts.length 
      }))

      return imageUrls
  }

  const handleGenerateFromScenes = async () => {
    if (selectedScenes.length === 0) return

    const selectedPrompts = selectedScenes.map(index => extractedScenes[index]?.imagePrompt).filter(Boolean)
    
    if (selectedPrompts.length === 0) return

    const generationId = uuidv4()
    const batchSize = MODEL_INFO[selectedModel].batchSize
    const totalBatches = Math.ceil(selectedPrompts.length / batchSize)
    
    // Apply style to all prompts upfront
    const styledPrompts = selectedPrompts.map(prompt => applyImageStyle(prompt))
    
    dispatch(startGeneration({ 
      id: generationId, 
      prompt: `Selected scenes: ${selectedPrompts.length} images`,
      finalPrompts: styledPrompts,
      numberOfImages: selectedPrompts.length,
      imageStyle: selectedImageStyle
    }))

    // Reset batch progress
    setBatchProgress({ current: 0, total: selectedPrompts.length, currentBatch: 0, totalBatches })

    try {
      dispatch(updateGenerationInfo(`Starting batch processing: ${selectedPrompts.length} images in ${totalBatches} batches...`))

      const allImageUrls: string[] = []

      // Process each batch
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        try {
          const batchImageUrls = await generateImagesBatch(styledPrompts, batchIndex, totalBatches)
          allImageUrls.push(...batchImageUrls)
          
          dispatch(updateGenerationInfo(
            `Completed batch ${batchIndex + 1}/${totalBatches}. Generated ${allImageUrls.length}/${selectedPrompts.length} images.`
          ))

          // Wait times based on model capabilities
            if (batchIndex < totalBatches - 1) {
            const waitTime = selectedModel === 'gpt-image-1' ? 60 
              : selectedModel === 'dalle-3' ? 10 
              : selectedModel === 'minimax' ? 8
              : selectedModel === 'leonardo-phoenix' ? 30
              : 60
              
              dispatch(updateGenerationInfo(
                `Batch ${batchIndex + 1}/${totalBatches} complete. Waiting ${waitTime} seconds before next batch...`
              ))
              
              // Show countdown for the wait time
              for (let countdown = waitTime; countdown > 0; countdown--) {
              dispatch(updateGenerationInfo(
                `Waiting ${countdown} seconds before processing batch ${batchIndex + 2}/${totalBatches}...`
              ))
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        } catch (error) {
          console.error(`Error in batch ${batchIndex + 1}:`, error)
          dispatch(updateGenerationInfo(
            `Batch ${batchIndex + 1} failed. Continuing with remaining batches...`
          ))
        }
      }

      if (allImageUrls.length > 0) {
        dispatch(completeGeneration({ imageUrls: allImageUrls }))
        setSelectedScenes([])
        setBatchProgress({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
      } else {
        throw new Error('No images were successfully generated')
      }
      
    } catch (error) {
      console.error('Error generating images from scenes:', error)
      dispatch(failGeneration(
        error instanceof Error ? error.message : 'Failed to generate images from scenes'
      ))
      setBatchProgress({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
    }
  }

  // Image selection helper functions - now using Redux
  const getImageId = (setId: string, imageIndex: number) => `${setId}:${imageIndex}`
  
  const toggleImageSelection = (setId: string, imageIndex: number) => {
    const imageId = getImageId(setId, imageIndex)
    const newOrder = selectedImagesOrder.includes(imageId)
      ? selectedImagesOrder.filter(id => id !== imageId)
      : [...selectedImagesOrder, imageId]
    dispatch(setSelectedImagesOrder(newOrder))
  }

  const selectAllImages = () => {
    const allImageIds: string[] = []
    imageSets.forEach(set => {
      set.imageUrls.forEach((_, index) => {
        allImageIds.push(getImageId(set.id, index))
      })
    })
    dispatch(setSelectedImagesOrder(allImageIds))
  }

  const unselectAllImages = () => {
    dispatch(clearSelectedImagesOrder())
  }

  const moveImageUp = (imageId: string) => {
    const index = selectedImagesOrder.indexOf(imageId)
    if (index > 0) {
      const newOrder = [...selectedImagesOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      dispatch(setSelectedImagesOrder(newOrder))
    }
  }

  const moveImageDown = (imageId: string) => {
    const index = selectedImagesOrder.indexOf(imageId)
    if (index >= 0 && index < selectedImagesOrder.length - 1) {
      const newOrder = [...selectedImagesOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      dispatch(setSelectedImagesOrder(newOrder))
    }
  }

  // Download functions
  const downloadAsZip = async (imageSet: GeneratedImageSet) => {
    try {
      setDownloadingZip(imageSet.id)
      
      const timestamp = new Date(imageSet.generatedAt).toISOString().slice(0, 16).replace(/:/g, '-')
      const provider = MODEL_INFO[imageSet.provider as keyof typeof MODEL_INFO]?.name || imageSet.provider
      const setName = `${provider}_${imageSet.aspectRatio}_${timestamp}_${imageSet.imageUrls.length}images`
      
      const response = await fetch('/api/download-images-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: imageSet.imageUrls,
          setName,
          provider: imageSet.provider,
          aspectRatio: imageSet.aspectRatio
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create ZIP file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${setName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading ZIP:', error)
    } finally {
      setDownloadingZip(null)
    }
  }

  const downloadAllAsZip = async () => {
    try {
      setDownloadingZip('all')
      
      const allImageUrls = imageSets.flatMap(set => set.imageUrls)
      const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-')
      const totalImages = allImageUrls.length
      const setName = `AllSets_${timestamp}_${totalImages}images`
      
      const response = await fetch('/api/download-images-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: allImageUrls,
          setName,
          provider: 'multiple',
          aspectRatio: 'mixed'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create combined ZIP file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${setName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading combined ZIP:', error)
    } finally {
      setDownloadingZip(null)
    }
  }

  const downloadSelectedAsZip = async () => {
    if (selectedImagesOrder.length === 0) return

    try {
      setDownloadingZip('selected')
      
      const selectedImageUrls: string[] = []
      const selectedImageDetails: Array<{ setName: string; imageIndex: number; provider: string }> = []
      
      selectedImagesOrder.forEach(imageId => {
        const [setId, imageIndexStr] = imageId.split(':')
        const imageIndex = parseInt(imageIndexStr)
        const imageSet = imageSets.find(set => set.id === setId)
        
        if (imageSet && imageSet.imageUrls[imageIndex]) {
          selectedImageUrls.push(imageSet.imageUrls[imageIndex])
          selectedImageDetails.push({
            setName: imageSet.originalPrompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_'),
            imageIndex: imageIndex + 1,
            provider: imageSet.provider
          })
        }
      })
      
      const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-')
      const setName = `Selected_${timestamp}_${selectedImageUrls.length}images`
      
      const response = await fetch('/api/download-images-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls: selectedImageUrls,
          setName,
          provider: 'selected',
          aspectRatio: 'mixed',
          selectedImageDetails
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create selected images ZIP file')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${setName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      unselectAllImages()
    } catch (error) {
      console.error('Error downloading selected images ZIP:', error)
    } finally {
      setDownloadingZip(null)
    }
  }

  // Individual image regeneration function
  const regenerateIndividualImage = async (setId: string, imageIndex: number) => {
    const imageId = getImageId(setId, imageIndex)
    
    // Find the image set to get the final prompt that was actually used
    const imageSet = imageSets.find(set => set.id === setId)
    if (!imageSet) {
      console.error('Image set not found for regeneration')
      return
    }
    
    // Use finalPrompts array if available, otherwise fall back to originalPrompt with current style
    // This provides backwards compatibility for older image sets
    const promptToUse = (imageSet.finalPrompts && imageSet.finalPrompts[imageIndex]) 
      ? imageSet.finalPrompts[imageIndex]
      : applyImageStyle(imageSet.originalPrompt)
    
    try {
      setRegeneratingImages(prev => new Set(prev).add(imageId))

      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: imageSet.provider, // Use the same provider as original
          prompt: promptToUse, // Use the exact final prompt that was used originally
          numberOfImages: 1,
          minimaxAspectRatio: imageSet.aspectRatio || aspectRatio,
          userId: 'user-123',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate image')
      }

      const data = await response.json()
      
      if (data.imageUrls && data.imageUrls.length > 0) {
        // Update the Redux state directly instead of reloading the page
        const newImageUrl = data.imageUrls[0]
        console.log('✅ Successfully regenerated image:', { setId, imageIndex, newUrl: newImageUrl, usedPrompt: promptToUse })
        
        // Use Redux action to update the image in the set
        dispatch(updateImageInSet({
          setId,
          imageIndex,
          newImageUrl
        }))
        
        console.log('✅ Image updated in Redux state successfully')
      } else {
        throw new Error('No image URL returned')
      }

    } catch (error) {
      console.error(`Error regenerating image ${imageId}:`, error)
      alert(`Failed to regenerate image: ${error}`)
    } finally {
      setRegeneratingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  const toggleSceneSelection = (index: number) => {
    setSelectedScenes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleClearError = () => {
    dispatch(clearError())
  }

  const handleClearAll = () => {
    dispatch(clearImageSets())
  }

  const handleRemoveSet = (setId: string) => {
    dispatch(removeImageSet(setId))
  }

  // Thumbnail generator functions
  const generateThumbnail = async () => {
    if (referenceImages.length === 0) {
      setThumbnailError('Please upload at least one reference image')
      return
    }

    setIsGeneratingThumbnail(true)
    setThumbnailError(null)

    try {
      // Create final prompt with fallback and style options
      const getStyledThumbnailPrompt = () => {
        // Use fallback prompt if no description provided
        let finalPrompt = thumbnailPrompt.trim() || 'Generate a different variation of this image'
        
        // Apply Image Style
        if (thumbnailImageStyle && thumbnailImageStyle !== 'realistic') {
          const style = IMAGE_STYLES[thumbnailImageStyle as keyof typeof IMAGE_STYLES]
          if (style) {
            finalPrompt = `${style.prefix}${finalPrompt}`
          }
        }
        
        // Apply Lighting Tone
        if (thumbnailLightingTone && thumbnailLightingTone !== 'balanced') {
          const tone = LIGHTING_TONES[thumbnailLightingTone as keyof typeof LIGHTING_TONES]
          if (tone) {
            finalPrompt = `${tone.prefix}${finalPrompt}`
          }
        }
        
        // Apply Custom Style
        if (thumbnailCustomStyle && thumbnailCustomStyle.trim()) {
          finalPrompt = `${thumbnailCustomStyle.trim()}, ${finalPrompt}`
        }
        
        return finalPrompt
      }

      const formData = new FormData()
      formData.append('prompt', getStyledThumbnailPrompt())
      
      referenceImages.forEach((file, index) => {
        formData.append(`image_${index}`, file)
      })

      const response = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate thumbnail')
      }

      const data = await response.json()
      
      if (data.imageUrl || data.imageBase64) {
        setThumbnailResult(data.imageUrl || `data:image/png;base64,${data.imageBase64}`)
        setThumbnailError(null)
      } else {
        throw new Error('No image data returned')
      }

    } catch (error) {
      console.error('Thumbnail generation error:', error)
      setThumbnailError(error instanceof Error ? error.message : 'Failed to generate thumbnail')
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  const downloadThumbnail = () => {
    if (!thumbnailResult) return
    
    const link = document.createElement('a')
    link.href = thumbnailResult
    link.target = '_blank'
    link.download = `thumbnail_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearThumbnailGenerator = () => {
    setThumbnailPrompt('')
    setReferenceImages([])
    setThumbnailResult(null)
    setThumbnailError(null)
  }

  const scriptSourceInfo = getScriptSourceInfo()

  // Video selection confirmation handlers
  const handleConfirmVideoSelection = () => {
    // Navigate to video generator tab or trigger navigation
    console.log('Confirmed video selection:', selectedImagesOrder)
    // This could trigger navigation to video generator
  }

  const handlePreviewVideoSelection = () => {
    // Open preview modal or trigger preview
    console.log('Preview video selection:', selectedImagesOrder)
  }

  const handleClearVideoSelection = () => {
    dispatch(clearSelectedImagesOrder())
  }

  return (
    <StaggerContainer className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <StaggerItem>
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-gray-900">AI Image Generator</h1>
          <p className="text-gray-600">
            Extract scenes from scripts and generate images for each scene using multiple AI models with batch processing
          </p>
        </motion.div>
      </StaggerItem>

      {/* Main Tabs */}
      <StaggerItem>
        <Tabs defaultValue="scene-generation" className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scene-generation">Scene Generation</TabsTrigger>
              <TabsTrigger value="thumbnail-generator">Thumbnail Generator</TabsTrigger>
            </TabsList>
          </motion.div>

        {/* Scene Generation Tab */}
        <TabsContent value="scene-generation" className="space-y-6">
          {/* Model Selection */}
          <ModelSelection
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            selectedScenes={selectedScenes}
          />

          {/* Scene Extraction */}
          <SceneExtraction
            scriptInput={scriptInput}
            onScriptInputChange={setScriptInput}
            numberOfScenesToExtract={numberOfScenesToExtract}
            onNumberOfScenesChange={(value) => dispatch(setNumberOfScenesToExtract(value))}
            isExtractingScenes={isExtractingScenes}
            sceneExtractionError={sceneExtractionError}
            extractedScenes={extractedScenes}
            selectedScenes={selectedScenes}
            onToggleSceneSelection={toggleSceneSelection}
            onExtractScenes={handleExtractScenes}
            onClearError={handleClearError}
            onUpdateScenePrompt={handleUpdateScenePrompt}
            onAddCustomScene={handleAddCustomScene}
            scriptSourceInfo={scriptSourceInfo}
            selectedImageStyle={selectedImageStyle}
            onImageStyleChange={setSelectedImageStyle}
            selectedLightingTone={selectedLightingTone}
            onLightingToneChange={setSelectedLightingTone}
            customStylePrompt={customStylePrompt}
            onCustomStylePromptChange={setCustomStylePrompt}
          />

          {/* Image Style Selector */}
              {extractedScenes.length > 0 && (
            <ImageStyleSelector
              selectedImageStyle={selectedImageStyle}
              onImageStyleChange={setSelectedImageStyle}
              selectedLightingTone={selectedLightingTone}
              onLightingToneChange={setSelectedLightingTone}
              aspectRatio={aspectRatio}
              onAspectRatioChange={(ratio) => dispatch(setAspectRatio(ratio))}
              selectedScenes={selectedScenes}
              extractedScenes={extractedScenes}
              isGenerating={isGenerating}
              isExtractingScenes={isExtractingScenes}
              customStylePrompt={customStylePrompt}
              onCustomStylePromptChange={setCustomStylePrompt}
            />
          )}

          {/* Image Generation Controls */}
          <ImageGenerationControls
            selectedScenes={selectedScenes}
            extractedScenes={extractedScenes}
            isGenerating={isGenerating}
            generationInfo={generationInfo}
            selectedModel={selectedModel}
            aspectRatio={aspectRatio}
            selectedImageStyle={selectedImageStyle}
            onGenerateFromScenes={handleGenerateFromScenes}
          />

          {/* Generated Images Display */}
          <GeneratedImageDisplay
            imageSets={imageSets}
            isGenerating={isGenerating}
            error={error}
            generationInfo={generationInfo}
            batchProgress={batchProgress}
            selectedImagesOrder={selectedImagesOrder}
            showImageSelection={showImageSelection}
            downloadingZip={downloadingZip}
            regeneratingImages={regeneratingImages}
            selectedModel={selectedModel}
            aspectRatio={aspectRatio}
            onToggleImageSelection={toggleImageSelection}
            onSelectAllImages={selectAllImages}
            onUnselectAllImages={unselectAllImages}
            onMoveImageUp={moveImageUp}
            onMoveImageDown={moveImageDown}
            onToggleSelectionMode={() => setShowImageSelection(!showImageSelection)}
            onDownloadAsZip={downloadAsZip}
            onDownloadAllAsZip={downloadAllAsZip}
            onDownloadSelectedAsZip={downloadSelectedAsZip}
            onClearAll={handleClearAll}
            onRemoveSet={handleRemoveSet}
            onRegenerateImage={regenerateIndividualImage}
            onClearError={handleClearError}
            onUpdateImageOrder={(newOrder) => dispatch(setSelectedImagesOrder(newOrder))}
          />

          {/* Video Selection Confirmation */}
          <VideoSelectionConfirmation
            selectedImagesOrder={selectedImagesOrder}
            imageSets={imageSets}
            onConfirmSelection={handleConfirmVideoSelection}
            onClearSelection={handleClearVideoSelection}
            onPreviewSelection={handlePreviewVideoSelection}
          />
        </TabsContent>

        {/* Thumbnail Generator Tab */}
        <TabsContent value="thumbnail-generator" className="space-y-6">
          <ThumbnailGenerator
            thumbnailPrompt={thumbnailPrompt}
            onThumbnailPromptChange={setThumbnailPrompt}
            referenceImages={referenceImages}
            onReferenceImagesChange={setReferenceImages}
            isGeneratingThumbnail={isGeneratingThumbnail}
            thumbnailResult={thumbnailResult}
            thumbnailError={thumbnailError}
            onGenerateThumbnail={generateThumbnail}
            onDownloadThumbnail={downloadThumbnail}
            onClearThumbnailGenerator={clearThumbnailGenerator}
            selectedImageStyle={thumbnailImageStyle}
            onImageStyleChange={setThumbnailImageStyle}
            selectedLightingTone={thumbnailLightingTone}
            onLightingToneChange={setThumbnailLightingTone}
            customStylePrompt={thumbnailCustomStyle}
            onCustomStylePromptChange={setThumbnailCustomStyle}
          />
        </TabsContent>
      </Tabs>
        </StaggerItem>
    </StaggerContainer>
  )
} 