'use client'

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'

import { StaggerContainer, StaggerItem } from './animated-page'
import { motion } from 'framer-motion'
import { IMAGE_STYLES, LIGHTING_TONES } from '@/data/image'
import { UnifiedAnimationTab } from './animation-generation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { addVideoToGenerator } from '@/lib/features/textImageVideo/textImageVideoSlice'
import { 
  addImageSet, 
  setConfirmedImageSelection, 
  setSelectedImagesOrder,
  updateImageInSet,
  loadImageSets,
  loadConfirmedImageSelection,
  loadSelectedImagesOrder
} from '@/lib/features/imageGeneration/imageGenerationSlice'

import { Sun, Moon, Zap, Grid, Download, RefreshCw, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from './ui/button'

interface ExtractedAnimationScene {
  id: string
  title: string
  prompt: string
  duration?: number
  effects?: string[]
}

interface BatchGenerationResult {
  id: string
  url: string
  prompt: string
  sceneId: string
  sceneTitle: string
}

export function UnifiedAnimationGenerator() {
  const dispatch = useAppDispatch()
  // Get script data from Redux
  const { scriptSections, fullScript } = useAppSelector(state => state.scripts)
  const { imageSets } = useAppSelector(state => state.imageGeneration)
  
  const [animationPrompt, setAnimationPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false)
  const [animationResult, setAnimationResult] = useState<{url: string, prompt: string} | null>(null)
  const [animationError, setAnimationError] = useState<string | null>(null)
  const [showStyleOptions, setShowStyleOptions] = useState(false)
  
  // Style options
  const [selectedImageStyle, setSelectedImageStyle] = useState('realistic')
  const [selectedLightingTone, setSelectedLightingTone] = useState('balanced')
  const [customStylePrompt, setCustomStylePrompt] = useState('')
  
  // Reference image description
  const [referenceImageDescription, setReferenceImageDescription] = useState('')

  // Scene extraction state
  const [scriptInput, setScriptInput] = useState('')
  const [numberOfScenesToExtract, setNumberOfScenesToExtract] = useState(5)
  const [isExtractingScenes, setIsExtractingScenes] = useState(false)
  const [sceneExtractionError, setSceneExtractionError] = useState<string | null>(null)
  
  // Unified prompt management
  const [allPrompts, setAllPrompts] = useState<ExtractedAnimationScene[]>([])
  const [mainContext, setMainContext] = useState('')
  
  // Batch generation state
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [batchResults, setBatchResults] = useState<BatchGenerationResult[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [batchDelayRemaining, setBatchDelayRemaining] = useState(0)
  
  // Single generation results to merge with batch results
  const [singleResults, setSingleResults] = useState<BatchGenerationResult[]>([])
  
  // Edit prompt state
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptText, setEditingPromptText] = useState('')



  // Initialize script input from Redux
  useEffect(() => {
    if (fullScript?.scriptCleaned && !scriptInput.trim()) {
      setScriptInput(fullScript.scriptCleaned)
    } else if (scriptSections.length > 0 && !scriptInput.trim()) {
      // Use the combined writing instructions from all sections
      const combinedScript = scriptSections
        .map(section => section.writingInstructions)
        .filter(instruction => instruction && instruction.trim())
        .join('\n\n')
      setScriptInput(combinedScript)
    }
  }, [fullScript, scriptSections, scriptInput])

  // Get script source info
  const getScriptSourceInfo = () => {
    if (fullScript?.scriptCleaned) {
      return {
        source: 'Full Script',
        count: 1,
        type: 'script'
      }
    } else if (scriptSections.length > 0) {
      return {
        source: 'Script Sections',
        count: scriptSections.length,
        type: 'sections'
      }
    }
    return {
      source: 'Manual Input',
      count: 0,
      type: 'manual'
    }
  }

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setReferenceImages([...referenceImages, ...files])
  }

  const removeReferenceImage = (index: number) => {
    const newImages = referenceImages.filter((_, i) => i !== index)
    setReferenceImages(newImages)
  }



  const handleGenerateAnimation = async () => {
    try {
      setIsGeneratingAnimation(true)
      setAnimationError(null)
      
      // Create FormData for the request
      const formData = new FormData()
      formData.append('prompt', getStyledPrompt(animationPrompt))
      
      // Add reference images
      referenceImages.forEach((file, index) => {
        formData.append(`referenceImage${index}`, file)
      })
      
      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate animation')
      }

      const data = await response.json()
      console.log('Animation API response:', data)
      
      if (data.success && data.animationUrl) {
        const result = {
          url: data.animationUrl,
          prompt: getStyledPrompt(animationPrompt)
        }
        
        setAnimationResult(result)
        
        // Also add to single results for batch tab visibility
        const singleResult: BatchGenerationResult = {
          id: `single_${Date.now()}`,
          url: data.animationUrl,
          prompt: result.prompt,
          sceneId: 'single',
          sceneTitle: 'Single Generation'
        }
        setSingleResults(prev => [singleResult, ...prev])
        
        // Add to the persistent "All Animation Results" set
        const existingAnimationSet = imageSets.find(set => set.id === 'all-animation-results')
        
        if (existingAnimationSet) {
          // Update existing set by adding new image
          const updatedSet = {
            ...existingAnimationSet,
            finalPrompts: [...existingAnimationSet.finalPrompts, result.prompt],
            imageUrls: [...existingAnimationSet.imageUrls, data.animationUrl],
            generatedAt: new Date().toISOString() // Update timestamp
          }
          dispatch(addImageSet(updatedSet))
        } else {
          // Create new "All Animation Results" set
          const animationSet = {
            id: 'all-animation-results',
            originalPrompt: 'All Animation Results',
            finalPrompts: [result.prompt],
            imageUrls: [data.animationUrl],
            imageData: [],
            provider: 'minimax' as const,
            generatedAt: new Date().toISOString(),
            aspectRatio: '16:9' as const,
            imageStyle: undefined
          }
          dispatch(addImageSet(animationSet))
        }
        
        console.log('✅ Single generation result added to unified results and saved to image generator')
      } else {
        throw new Error(data.error || 'Failed to generate animation')
      }
      
    } catch (error: any) {
      console.error('Animation generation error:', error)
      setAnimationError(error.message || 'Failed to generate animation')
    } finally {
      setIsGeneratingAnimation(false)
    }
  }

  const handleDownloadAnimation = () => {
    if (animationResult) {
      const link = document.createElement('a')
      link.href = animationResult.url
      link.download = `generated-image-${Date.now()}.png`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClearAnimationGenerator = () => {
    setAnimationPrompt('')
    setReferenceImages([])
    setReferenceImageDescription('')
    setAnimationResult(null)
    setAnimationError(null)
    setSelectedImageStyle('realistic')
    setSelectedLightingTone('balanced')
    setCustomStylePrompt('')
    // Also clear single results
    setSingleResults([])
  }

  // Scene extraction functions
  const handleExtractScenes = async () => {
    try {
      setIsExtractingScenes(true)
      setSceneExtractionError(null)

      const response = await fetch('/api/extract-animation-scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptInput,
          numberOfScenes: numberOfScenesToExtract,
          mainContext: mainContext,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract animation scenes')
      }

      const data = await response.json()
      // Add extracted scenes to the unified prompt list
      setAllPrompts(prev => [...prev, ...data.scenes])
      
    } catch (error: any) {
      console.error('Scene extraction error:', error)
      setSceneExtractionError(error.message || 'Failed to extract animation scenes')
    } finally {
      setIsExtractingScenes(false)
    }
  }

  const handleClearSceneError = () => {
    setSceneExtractionError(null)
  }

  // Unified prompt management functions
  const handleAddManualPrompt = () => {
    if (!animationPrompt.trim()) return
    
    const newPrompt: ExtractedAnimationScene = {
      id: `manual_${Date.now()}`,
      title: `Manual Prompt ${allPrompts.length + 1}`,
      prompt: animationPrompt.trim(),
      duration: 5,
      effects: ['manual']
    }
    
    setAllPrompts(prev => [...prev, newPrompt])
    setAnimationPrompt('') // Clear the input after adding
  }

  const handleRemovePrompt = (promptId: string) => {
    setAllPrompts(prev => prev.filter(p => p.id !== promptId))
  }

  const handleUsePromptForGeneration = (prompt: string) => {
    setAnimationPrompt(prompt)
  }

  const handleClearAllPrompts = () => {
    setAllPrompts([])
  }

  const handleEditPrompt = (promptId: string) => {
    const prompt = allPrompts.find(p => p.id === promptId)
    if (prompt) {
      setEditingPromptId(promptId)
      setEditingPromptText(prompt.prompt)
    }
  }

  const handleSaveEditedPrompt = () => {
    if (editingPromptId && editingPromptText.trim()) {
      setAllPrompts(prev => prev.map(prompt => 
        prompt.id === editingPromptId 
          ? { ...prompt, prompt: editingPromptText.trim() }
          : prompt
      ))
      setEditingPromptId(null)
      setEditingPromptText('')
    }
  }

  const handleCancelEdit = () => {
    setEditingPromptId(null)
    setEditingPromptText('')
  }

  const handleUpdatePrompt = (id: string, updatedPrompt: string, updatedTitle?: string) => {
    setAllPrompts(prev => prev.map(prompt => 
      prompt.id === id 
        ? { 
            ...prompt, 
            prompt: updatedPrompt,
            title: updatedTitle || prompt.title
          }
        : prompt
    ))
  }

  // Helper function to combine styles into final prompt
  const getStyledPrompt = (basePrompt: string) => {
    let finalPrompt = basePrompt
    
    // Apply reference image description first if available
    if (referenceImageDescription.trim()) {
      const description = referenceImageDescription.trim()
      const lowerPrompt = finalPrompt.toLowerCase()
      const lowerDescription = description.toLowerCase()
      
      // Only add if not already mentioned
      if (!lowerPrompt.includes(lowerDescription)) {
        finalPrompt = `${description} ${finalPrompt}`
      }
    }
    
    // Apply Image Style
    if (selectedImageStyle && selectedImageStyle !== 'realistic') {
      const style = IMAGE_STYLES[selectedImageStyle as keyof typeof IMAGE_STYLES]
      if (style) {
        finalPrompt = `${style.prefix}${finalPrompt}`
      }
    }
    
    // Apply Lighting Tone
    if (selectedLightingTone && selectedLightingTone !== 'balanced') {
      const tone = LIGHTING_TONES[selectedLightingTone as keyof typeof LIGHTING_TONES]
      if (tone) {
        finalPrompt = `${tone.prefix}${finalPrompt}`
      }
    }
    
    // Apply Custom Style
    if (customStylePrompt && customStylePrompt.trim()) {
      finalPrompt = `${customStylePrompt.trim()}, ${finalPrompt}`
    }
    
    return finalPrompt
  }

  // Batch generation function with frontend progress tracking and Redux persistence
  const handleBatchGenerate = async (promptIds?: string[]) => {
    const idsToUse = promptIds || selectedPrompts
    console.log('🎬 handleBatchGenerate called:', { 
      promptIds: promptIds?.length, 
      selectedPrompts: selectedPrompts.length, 
      idsToUse: idsToUse.length, 
      referenceImages: referenceImages.length 
    })
    
    if (idsToUse.length === 0) {
      console.error('❌ No prompts selected for batch generation')
      return
    }
    
    if (referenceImages.length === 0) {
      console.error('❌ No reference images uploaded for batch generation')
      return
    }
    
    const promptsToGenerate = allPrompts.filter(prompt => idsToUse.includes(prompt.id))
    
    try {
      setIsBatchGenerating(true)
      setBatchError(null)
      setBatchResults([])
      setBatchProgress({ current: 0, total: promptsToGenerate.length })
      setCurrentBatchIndex(0)
      setBatchDelayRemaining(0)

      // Create a Redux image set for this batch generation
      const batchId = `anim-batch-${Date.now()}`
      const allBatchResults: BatchGenerationResult[] = []

      // Process in batches of 10 with 1 minute delay between batches
      const batchSize = 10
      const delayBetweenBatches = 60000 // 1 minute in milliseconds
      const totalBatches = Math.ceil(promptsToGenerate.length / batchSize)

      for (let i = 0; i < promptsToGenerate.length; i += batchSize) {
        const batch = promptsToGenerate.slice(i, i + batchSize)
        const currentBatch = Math.floor(i / batchSize) + 1
        setCurrentBatchIndex(currentBatch)
        
        console.log(`🚀 Processing batch ${currentBatch}/${totalBatches} (${batch.length} prompts)`)
        
        // Process current batch in parallel
        const batchPromises = batch.map(async (prompt, promptIndex) => {
          try {
            const formData = new FormData()
            
            // Apply styles to the prompt
            let styledPrompt = getStyledPrompt(prompt.prompt)
            
            formData.append('prompt', styledPrompt)
            
            // Add reference images
            referenceImages.forEach((file, index) => {
              formData.append(`referenceImage${index}`, file)
            })
            
            const response = await fetch('/api/generate-animation', {
              method: 'POST',
              body: formData
            })

            if (!response.ok) {
              throw new Error(`Failed to generate image for prompt: ${prompt.title}`)
            }

            const data = await response.json()
            
            if (data.success && data.animationUrl) {
              const result = {
                id: `${prompt.id}_${Date.now()}_${promptIndex}`,
                url: data.animationUrl,
                prompt: styledPrompt,
                sceneId: prompt.id,
                sceneTitle: prompt.title
              } as BatchGenerationResult
              
              // Update progress and results immediately
              setBatchResults(prev => [...prev, result])
              setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
              allBatchResults.push(result)
              
              console.log(`✅ Generated ${prompt.title} (${i + promptIndex + 1}/${promptsToGenerate.length})`)
              return result
            } else {
              throw new Error(`Failed to generate image for prompt: ${prompt.title}`)
            }
          } catch (error: any) {
            console.error(`❌ Error generating ${prompt.title}:`, error.message)
            setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
            throw error
          }
        })

        // Wait for current batch to complete
        const batchResults = await Promise.allSettled(batchPromises)
        
        const successCount = batchResults.filter(result => result.status === 'fulfilled').length
        const errorCount = batchResults.filter(result => result.status === 'rejected').length
        
        console.log(`📊 Batch ${currentBatch} completed: ${successCount} success, ${errorCount} errors`)

        // If there are more batches, show countdown and wait
        if (i + batchSize < promptsToGenerate.length) {
          console.log(`⏳ Waiting 1 minute before next batch...`)
          
          // Countdown timer for user feedback
          for (let countdown = 60; countdown > 0; countdown--) {
            setBatchDelayRemaining(countdown)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          setBatchDelayRemaining(0)
        }
      }

      // Save all results to the "All Animation Results" set
      if (allBatchResults.length > 0) {
        const existingAnimationSet = imageSets.find(set => set.id === 'all-animation-results')
        const newImageUrls = allBatchResults.map(r => r.url)
        const newPrompts = allBatchResults.map(r => r.prompt)
        
        if (existingAnimationSet) {
          // Update existing set by adding new images
          const updatedSet = {
            ...existingAnimationSet,
            finalPrompts: [...existingAnimationSet.finalPrompts, ...newPrompts],
            imageUrls: [...existingAnimationSet.imageUrls, ...newImageUrls],
            generatedAt: new Date().toISOString()
          }
          dispatch(addImageSet(updatedSet))
        } else {
          // Create new "All Animation Results" set
          const animationSet = {
            id: 'all-animation-results',
            originalPrompt: 'All Animation Results',
            finalPrompts: newPrompts,
            imageUrls: newImageUrls,
            imageData: [],
            provider: 'minimax' as const,
            generatedAt: new Date().toISOString(),
            aspectRatio: '16:9' as const,
            imageStyle: undefined
          }
          dispatch(addImageSet(animationSet))
        }
        
        console.log(`💾 Added ${allBatchResults.length} batch results to "All Animation Results" set`)
      }

      const totalGenerated = allBatchResults.length
      console.log(`🎉 Batch generation completed! Generated ${totalGenerated}/${promptsToGenerate.length} images.`)
      
    } catch (error: any) {
      console.error('❌ Batch generation error:', error)
      setBatchError(error.message || 'Failed to complete batch generation')
    } finally {
      setIsBatchGenerating(false)
      setCurrentBatchIndex(0)
      setBatchDelayRemaining(0)
    }
  }

  // Helper function to get all results (batch + single)
  const getAllResults = () => {
    return [...singleResults, ...batchResults]
  }

  const handleClearBatchResults = () => {
    setBatchResults([])
    setBatchProgress({ current: 0, total: 0 })
    setBatchError(null)
  }

  const handleClearSingleResults = () => {
    setSingleResults([])
  }

  const handleClearAllResults = () => {
    setBatchResults([])
    setSingleResults([])
    setBatchProgress({ current: 0, total: 0 })
    setBatchError(null)
  }



  // Regenerate a single image
  const handleRegenerateImage = async (prompt: string, resultId: string) => {
    if (referenceImages.length === 0) {
      setBatchError('No reference images available for regeneration')
      return
    }

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      
      // Add reference images
      referenceImages.forEach((file, index) => {
        formData.append(`referenceImage${index}`, file)
      })
      
      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate image')
      }

      const data = await response.json()
      
      if (data.success && data.animationUrl) {
        const allResults = getAllResults()
        const oldResult = allResults.find(r => r.id === resultId)
        const newResult = {
          ...oldResult!,
          url: data.animationUrl,
          id: `${oldResult!.sceneId}_${Date.now()}`
        }
        
        // Update the result with new image URL in local state
        // Check if it's a batch result or single result
        const isBatchResult = batchResults.find(r => r.id === resultId)
        const isSingleResult = singleResults.find(r => r.id === resultId)
        
        if (isBatchResult) {
          setBatchResults(prev => prev.map(result => 
            result.id === resultId ? newResult : result
          ))
        } else if (isSingleResult) {
          setSingleResults(prev => prev.map(result => 
            result.id === resultId ? newResult : result
          ))
        }
        
        // If there are any Redux image sets that contain this image, update them too
        // This ensures regenerated images are also updated in the persistent Redux state
        imageSets.forEach(imageSet => {
          const imageIndex = imageSet.imageUrls.findIndex(url => url === oldResult?.url)
          if (imageIndex !== -1) {
            dispatch(updateImageInSet({
              setId: imageSet.id,
              imageIndex: imageIndex,
              newImageUrl: data.animationUrl
            }))
          }
        })
        
        console.log(`✅ Regenerated image successfully`)
      } else {
        throw new Error('Failed to regenerate image')
      }
      
    } catch (error: any) {
      console.error('❌ Regeneration error:', error)
      setBatchError(error.message || 'Failed to regenerate image')
    }
  }

  return (
    <StaggerContainer className="flex-1 p-6 space-y-6">
      {/* Header */}
      <StaggerItem>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Animation Generator</h1>
          <p className="text-gray-600">
            Create animations from reference images with AI-powered motion and effects
          </p>
        </motion.div>
      </StaggerItem>

      {/* Main Interface */}
      <StaggerItem>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Animation Generation</TabsTrigger>
              <TabsTrigger value="gallery">Generated Gallery</TabsTrigger>
            </TabsList>

            {/* Generation Tab */}
            <TabsContent value="generate">
              <UnifiedAnimationTab
                // Script extraction
                scriptInput={scriptInput}
                setScriptInput={setScriptInput}
                numberOfScenesToExtract={numberOfScenesToExtract}
                setNumberOfScenesToExtract={setNumberOfScenesToExtract}
                isExtractingScenes={isExtractingScenes}
                sceneExtractionError={sceneExtractionError}
                allPrompts={allPrompts}
                onExtractScenes={handleExtractScenes}
                onClearAllPrompts={handleClearAllPrompts}
                onUpdatePrompt={handleUpdatePrompt}
                getScriptSourceInfo={getScriptSourceInfo}
                
                // Generation
                animationPrompt={animationPrompt}
                setAnimationPrompt={setAnimationPrompt}
                isGenerating={isGeneratingAnimation}
                generationError={animationError}
                onGenerate={(prompt) => {
                  setAnimationPrompt(prompt)
                  handleGenerateAnimation()
                }}
                
                // Reference images
                referenceImages={referenceImages}
                setReferenceImages={setReferenceImages}
                referenceImageDescription={referenceImageDescription}
                setReferenceImageDescription={setReferenceImageDescription}
                
                // Batch generation  
                batchResults={getAllResults().map(result => ({
                  id: result.id,
                  prompt: result.prompt,
                  videoUrl: result.url,
                  status: 'completed' as const
                }))}
                isBatchGenerating={isBatchGenerating}
                batchProgress={batchProgress}
                onBatchGenerate={(promptIds) => {
                  console.log('🎯 onBatchGenerate called with promptIds:', promptIds.length)
                  console.log('📝 Available allPrompts:', allPrompts.length)
                  
                  setSelectedPrompts(promptIds)
                  handleBatchGenerate(promptIds)
                }}
                onClearBatch={handleClearAllResults}
              />
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              <div className="space-y-6">
                {/* Gallery Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Generated Gallery</h2>
                    <p className="text-gray-600">
                      View and manage all your generated animations ({getAllResults().length} total)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getAllResults().length > 0 && (
                      <Button variant="outline" onClick={handleClearAllResults}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {/* Gallery Grid */}
                {getAllResults().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getAllResults().map((result) => (
                      <div key={result.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="aspect-video bg-gray-100 relative group">
                          {/* Animation/Image Display */}
                          <img
                            src={result.url}
                            alt={result.sceneTitle}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback for broken images
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex items-center justify-center h-full bg-gray-200">
                                    <div class="text-center">
                                      <AlertCircle class="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                      <p class="text-sm text-gray-500">Failed to load</p>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                          
                          {/* Overlay Actions */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = result.url
                                  link.download = `animation-${result.id}.png`
                                  link.target = '_blank'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRegenerateImage(result.prompt, result.id)}
                                disabled={isGeneratingAnimation || isBatchGenerating}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Regenerate
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card Content */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">
                            {result.sceneTitle}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                            {result.prompt}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {result.sceneId === 'single' ? '👤 Single' : '📦 Batch'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAnimationPrompt(result.prompt)}
                              className="h-6 px-2 text-xs"
                            >
                              Use Prompt
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Grid className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No animations generated yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start by generating some animations in the Generation tab
                    </p>
                    <Button 
                      onClick={() => {
                        // Switch to generation tab (this will need to be implemented)
                        const tabTrigger = document.querySelector('[value="generate"]') as HTMLButtonElement;
                        if (tabTrigger) tabTrigger.click();
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Start Generating
                    </Button>
                  </div>
                )}

                {/* Generation Stats */}
                {getAllResults().length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{getAllResults().length}</div>
                      <div className="text-sm text-gray-600">Total Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {singleResults.length}
                      </div>
                      <div className="text-sm text-gray-600">Single Generations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {batchResults.length}
                      </div>
                      <div className="text-sm text-gray-600">Batch Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {allPrompts.length}
                      </div>
                      <div className="text-sm text-gray-600">Extracted Scenes</div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
        </StaggerItem>
    </StaggerContainer>
  )
}