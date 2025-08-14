'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../lib/hooks'
import { StaggerContainer, StaggerItem, ScaleOnHover } from './animated-page'
import { motion } from 'framer-motion'
import { 
  setSelectedVoice, 
  setSelectedModel,
  setGenerateSubtitles,
  startAudioGeneration,
  startBatch,
  completeBatch,
  checkWaitStatus,
  completeAudioGeneration,
  addSubtitlesToGeneration,
  updateSubtitleContent,
  setAudioGenerationError,
  saveGenerationToHistory,
  setIsGeneratingSubtitles
} from '../lib/features/audio/audioSlice'
import { VoiceManager } from './voice-manager'
import { AIVoice } from '@/app/api/ai-voices/route'

// Import modular components
import { TextInputCard } from './audio-generator/TextInputCard'
import { ProviderSettingsCard } from './audio-generator/ProviderSettingsCard'
import { AudioProgressDisplay } from './audio-generator/AudioProgressDisplay'
import { MessageDisplay } from './audio-generator/MessageDisplay'
import { CurrentGenerationCard } from './audio-generator/CurrentGenerationCard'
import { GenerationHistoryCard } from './audio-generator/GenerationHistoryCard'

// TTS Provider configurations with proper typing
interface TTSProvider {
  name: string
  voices: { id: string; name: string }[]
  models?: { id: string; name: string }[]
  languages?: { code: string; name: string }[]
}

const TTS_PROVIDERS: Record<string, TTSProvider> = {
  'google-tts': {
    name: "Google TTS",
    voices: [],
  },
  minimax: {
    name: "MiniMax",
    voices: [],
    models: [
      { id: "speech-02-hd", name: "HD Model - Superior rhythm & stability" },
      { id: "speech-02-turbo", name: "Turbo Model - Enhanced multilingual" },
      { id: "speech-01-hd", name: "HD V1 - Rich voices & expressive emotions" },
      { id: "speech-01-turbo", name: "Turbo V1 - Excellent performance & low latency" }
    ]
  },
  elevenlabs: {
    name: "ElevenLabs",
    voices: [
      { id: "2qfp6zPuviqeCOZIE9RZ", name: "Christina - Calming Yoga Instructor" },
      { id: "wgHvco1wiREKN0BdyVx5", name: "Drew - Deep, Soothing, Guided Meditation" }
    ],
    models: [
      { id: "eleven_multilingual_v2", name: "Multilingual V2" },
      { id: "eleven_flash_v2_5", name: "Flash V2.5 (Fastest)" },
      { id: "eleven_turbo_v2_5", name: "Turbo V2.5" }
    ],
    languages: [
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "pl", name: "Polish" },
      { code: "tr", name: "Turkish" },
      { code: "ru", name: "Russian" },
      { code: "nl", name: "Dutch" },
      { code: "cs", name: "Czech" },
      { code: "ar", name: "Arabic" },
      { code: "zh", name: "Chinese" },
      { code: "ja", name: "Japanese" },
      { code: "hu", name: "Hungarian" },
      { code: "ko", name: "Korean" }
    ]
  },
  fishaudio: {
    name: "Fish Audio",
    voices: [],
    models: [
      { id: "speech-1.5", name: "Speech-1.5 - $15.00 / million UTF-8 bytes" },
      { id: "speech-1.6", name: "Speech-1.6 - $15.00 / million UTF-8 bytes" },
      { id: "s1", name: "S1" }
    ],
    languages: [
      { code: "en", name: "English" },
      { code: "zh", name: "Chinese" },
      { code: "ja", name: "Japanese" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" }
    ]
  },
  voicemaker: {
    name: "VoiceMaker",
    voices: [],
    models: [
      { id: "neural", name: "Neural Engine (Premium)" },
      { id: "standard", name: "Standard Engine" }
    ],
    languages: [
      { code: "en-US", name: "English (US)" },
      { code: "en-GB", name: "English (UK)" },
      { code: "en-AU", name: "English (AU)" },
      { code: "es-ES", name: "Spanish (Spain)" },
      { code: "fr-FR", name: "French (France)" },
      { code: "de-DE", name: "German (Germany)" },
      { code: "it-IT", name: "Italian (Italy)" },
      { code: "pt-BR", name: "Portuguese (Brazil)" }
    ]
  }
}

const ELEVENLABS_AUDIO_CHUNK_MAX_LENGTH = 5000;
const MINIMAX_AUDIO_CHUNK_MAX_LENGTH = 2500;

export function AudioGenerator() {
  const dispatch = useAppDispatch()
  const { scripts, hasGeneratedScripts, fullScript, hasFullScript } = useAppSelector(state => state.scripts)
  const { 
    currentGeneration, 
    generationHistory,
    isGeneratingAudio,
    isGeneratingSubtitles,
    audioProgress,
    batchState,
    textToProcess,
    textChunks,
    successfulChunkUrls,
    selectedVoice,
    selectedModel,
    generateSubtitles,
    customVoices
  } = useAppSelector(state => state.audio)
  
  // Provider-specific state
  const [selectedProvider, setSelectedProvider] = useState<string>("minimax")
  const [providerVoice, setProviderVoice] = useState<string>("")
  const [providerModel, setProviderModel] = useState<string>("")
  const [languageCode, setLanguageCode] = useState<string>("en")
  const [customText, setCustomText] = useState<string>("")
  const [useCustomText, setUseCustomText] = useState<boolean>(false)
  const [apiVoices, setApiVoices] = useState<any[]>([])
  const [isLoadingApiVoices, setIsLoadingApiVoices] = useState<boolean>(false)
  
  // Custom voices from database
  const [dbVoices, setDbVoices] = useState<AIVoice[]>([])
  const [isLoadingDbVoices, setIsLoadingDbVoices] = useState<boolean>(false)
  
  // Voice Manager state
  const [showVoiceManager, setShowVoiceManager] = useState<boolean>(false)
  
  // Message state for user feedback
  const [message, setMessage] = useState<string>("")
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [generationStatusMessage, setGenerationStatusMessage] = useState<string>("")

  // Simple text input state
  const [inputText, setInputText] = useState<string>("")

  // Audio type selection state
  const [selectedAudioType, setSelectedAudioType] = useState<'original' | 'compressed'>('original')
  
  // Audio type selection for history items
  const [historyAudioTypes, setHistoryAudioTypes] = useState<Record<string, 'original' | 'compressed'>>({})

  // Subtitles generation option
  const [generateSubtitlesOption, setGenerateSubtitlesOption] = useState<boolean>(false)

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg)
    setMessageType(type)
    if (type !== 'error') {
    setTimeout(() => setMessage(""), 5000)
    }
  }

  // Clear error messages when user interacts with voice management
  useEffect(() => {
    if (message && messageType === 'error') {
      const timer = setTimeout(() => setMessage(""), 10000)
      return () => clearTimeout(timer)
    }
  }, [message, messageType])

  // Fetch custom voices from database
  const fetchDbVoices = async () => {
    console.log('🔍 Fetching custom voices from database...')
    setIsLoadingDbVoices(true)
    try {
      const response = await fetch('/api/ai-voices')
      if (!response.ok) {
        throw new Error('Failed to fetch custom voices')
      }
      const data = await response.json()
      console.log(`✅ Loaded ${data.voices?.length || 0} custom voices from database`, data.voices)
      setDbVoices(data.voices || [])
    } catch (error: any) {
      console.error('❌ Error fetching custom voices:', error)
    } finally {
      setIsLoadingDbVoices(false)
    }
  }

  // Fetch API voices for providers that support it - memoized to prevent infinite loops
  const fetchApiVoices = useCallback(async (provider: string) => {
    console.log(`🔍 Fetching API voices for provider: ${provider}`)
    setIsLoadingApiVoices(true)
    try {
      let apiUrl = '';
      let requestConfig: RequestInit = { method: 'GET' }
      
      if (provider === 'elevenlabs') {
        apiUrl = '/api/list-elevenlabs-voices';
      } else if (provider === 'minimax') {
        apiUrl = '/api/list-minimax-voices';
      } else if (provider === 'fishaudio') {
        apiUrl = '/api/list-fishaudio-voices';
      } else if (provider === 'voicemaker') {
        apiUrl = '/api/get-voicemaker-voices';
        requestConfig = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: languageCode || 'en-US' })
        }
      } else if (provider === 'google-tts') {
        apiUrl = '/api/list-google-voices';
      } else {
        console.warn(`No API voice fetching available for provider: ${provider}`);
        setIsLoadingApiVoices(false);
        return;
      }
      
      console.log(`📡 Making API call to: ${apiUrl}`, requestConfig)
      const response = await fetch(apiUrl, requestConfig)
      console.log(`📥 API response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        const voices = (data as any).voices || []
        console.log(`📊 API response sample (first 3):`, voices.slice(0,3))
        const normalized = voices.map((v: any) => ({ id: v.id || v.voice_id || v.VoiceId, name: v.name || v.voice_name || v.VoiceWebname }))
        console.log(`🧭 Normalized voices sample (first 3):`, normalized.slice(0,3))
        setApiVoices(voices)
        console.log(`✅ Loaded ${voices.length} voices for ${provider}`)
      } else {
        const errorText = await response.text()
        console.error(`❌ Failed to fetch ${provider} voices: ${response.status} - ${errorText}`)
        setApiVoices([])
      }
    } catch (error) {
      console.error(`❌ Error fetching ${provider} voices:`, error)
      setApiVoices([])
    } finally {
      setIsLoadingApiVoices(false)
    }
  }, [])

  // Load custom voices on component mount
  useEffect(() => {
    fetchDbVoices()
  }, [])

  // Auto-populate input text when full script is generated
  useEffect(() => {
    if (hasFullScript && fullScript && fullScript.scriptCleaned && !inputText.trim()) {
      setInputText(fullScript.scriptCleaned)
      showMessage('Full script automatically loaded into text input!', 'success')
    }
  }, [hasFullScript, fullScript, inputText])

  // Fetch voices when provider changes to supported providers
  useEffect(() => {
    const apiProviders = ['elevenlabs', 'minimax', 'fishaudio', 'voicemaker', 'google-tts']
    if (apiProviders.includes(selectedProvider)) {
      console.log(`🔄 Provider changed to ${selectedProvider}, fetching voices...`)
      fetchApiVoices(selectedProvider)
    } else {
      setApiVoices([])
    }
    
    setProviderVoice("")
  }, [selectedProvider, fetchApiVoices])

  // Initialize language code properly for each provider
  useEffect(() => {
    if (selectedProvider === 'elevenlabs' && languageCode !== 'en') {
      setLanguageCode('en')
    }
  }, [selectedProvider])

  // Handle custom voice selection from voice manager
  const handleCustomVoiceSelect = (voiceId: string, voiceName: string) => {
    setProviderVoice(voiceId)
    showMessage(`Selected custom voice: ${voiceName}`, 'success')
  }

  // Get current provider config
  const currentProvider = TTS_PROVIDERS[selectedProvider]

  // Handle provider change
  const handleProviderChange = (newProvider: string) => {
    setSelectedProvider(newProvider);
    const provider = TTS_PROVIDERS[newProvider];
    
    setProviderVoice(provider.voices?.[0]?.id || "");
    setProviderModel(provider.models?.[0]?.id || "");
  };

  // Text chunking functions
  const chunkText = (text: string, provider: string): string[] => {
    const maxChunkLength = provider === 'elevenlabs' ? ELEVENLABS_AUDIO_CHUNK_MAX_LENGTH : MINIMAX_AUDIO_CHUNK_MAX_LENGTH;
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          const words = sentence.split(' ');
          let wordChunk = '';
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= maxChunkLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = word;
              } else {
                chunks.push(word);
              }
            }
          }
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  };

  // Get content for display and processing
  const getContentSummary = () => {
    if (inputText.trim()) {
      const wordCount = inputText.trim().split(/\s+/).length
      return {
        type: 'Custom Text Input',
        content: inputText.substring(0, 100) + (inputText.length > 100 ? '...' : ''),
        wordCount: wordCount,
        length: inputText.length,
        textToProcess: inputText.trim()
      }
    }
    
    if (hasFullScript && fullScript) {
      const wordCount = fullScript.scriptCleaned.split(/\s+/).filter(word => word.length > 0).length
      return {
        type: 'Full Script',
        count: 1,
        length: fullScript.scriptCleaned.length,
        wordCount: wordCount,
        content: fullScript.title,
        textToProcess: fullScript.scriptCleaned
      }
    } else if (hasGeneratedScripts && scripts.length > 0) {
      const combinedText = scripts.map(s => s.script.replace(/<[^>]*>/g, '')).join(' ')
      const wordCount = combinedText.split(/\s+/).filter(word => word.length > 0).length
      return {
        type: 'Image Scripts',
        count: scripts.filter(s => s.generated).length,
        length: combinedText.length,
        wordCount: wordCount,
        content: `${scripts.filter(s => s.generated).length} generated scripts`,
        textToProcess: combinedText
      }
    }
    
    return null;
  };

  const contentSummary = getContentSummary();

  // Main audio generation function
  const handleGenerateAudio = async () => {
    if (!contentSummary) {
      showMessage("No content available for audio generation", 'error');
      return;
    }

    if (!providerVoice) {
      showMessage("Please select a voice before generating audio", 'error');
      return;
    }

    if (selectedProvider === 'elevenlabs' && !languageCode) {
      showMessage("Please select a language for ElevenLabs", 'error');
      return;
    }

    try {
      const textToProcess = contentSummary.textToProcess;
      console.log(`🚀 Starting audio generation with ${selectedProvider}`);
      console.log(`📝 Text length: ${textToProcess.length} characters`);
      console.log(`🎤 Voice: ${providerVoice}`);

      // Chunk the text
      const chunks = chunkText(textToProcess, selectedProvider);
      console.log(`📦 Split text into ${chunks.length} chunks`);

      // Start generation in Redux
      const generationId = `gen-${Date.now()}`;
    dispatch(startAudioGeneration({
        id: generationId,
        voice: parseInt(providerVoice) || 0, // Convert to number, fallback to 0
        model: providerModel,
      generateSubtitles: generateSubtitlesOption,
        textToProcess: textToProcess,
        textChunks: chunks
      }));

      // Start batch processing
        dispatch(startBatch());
        
      setGenerationStatusMessage(`Processing ${chunks.length} chunks...`);

      // Generate audio for each chunk
      const chunkUrls: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}`);
        setGenerationStatusMessage(`Generating audio for chunk ${i + 1} of ${chunks.length}...`);

        // Prepare provider-specific parameters
        const providerArgs: any = {
            voice: providerVoice, 
            model: providerModel, 
            languageCode: languageCode
          };

        // Set provider-specific voice parameters
        if (selectedProvider === 'elevenlabs') {
          providerArgs.elevenLabsVoiceId = providerVoice;
          providerArgs.elevenLabsModelId = providerModel;
        } else if (selectedProvider === 'fishaudio') {
          providerArgs.fishAudioVoiceId = providerVoice;
          providerArgs.fishAudioModel = providerModel;
        } else if (selectedProvider === 'google-tts') {
          providerArgs.googleTtsVoiceName = providerVoice;
        }

        // Call the comprehensive audio generation API
        const chunkResponse = await fetch('/api/generate-audio-comprehensive', {
                method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunk,
            provider: selectedProvider,
            chunkIndex: i,
            userId: 'user', // You might want to get this from auth context
            ...providerArgs
          }),
        });

        if (!chunkResponse.ok) {
          const errorData = await chunkResponse.text();
          throw new Error(`Failed to generate chunk ${i + 1}: ${errorData}`);
        }

        const chunkData = await chunkResponse.json();
        
        if (!chunkData.audioUrl) {
          throw new Error(`No audio URL returned for chunk ${i + 1}`);
        }

        chunkUrls.push(chunkData.audioUrl);
        console.log(`✅ Chunk ${i + 1} completed: ${chunkData.audioUrl}`);

        // Update progress (checkWaitStatus doesn't take parameters)
        dispatch(checkWaitStatus());
      }

      console.log(`🎵 All chunks generated, finalizing audio...`);
      setGenerationStatusMessage('Finalizing audio and creating compressed version...');

      // Finalize audio by concatenating chunks
      const finalizeResponse = await fetch('/api/finalize-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkUrls: chunkUrls,
          userId: 'user', // You might want to get this from auth context
          provider: selectedProvider,
          voice: providerVoice,
          elevenLabsVoiceId: selectedProvider === 'elevenlabs' ? providerVoice : undefined,
          fishAudioVoiceId: selectedProvider === 'fishaudio' ? providerVoice : undefined,
          googleTtsVoiceName: selectedProvider === 'google-tts' ? providerVoice : undefined,
          generateSubtitles: generateSubtitlesOption
        }),
        });
        
        if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.text();
        throw new Error(`Failed to finalize audio: ${errorData}`);
      }

      const finalizeData = await finalizeResponse.json();
      console.log(`✅ Audio generation completed:`, finalizeData);

      // Complete generation in Redux
          dispatch(completeAudioGeneration({
        audioUrl: finalizeData.audioUrl,
        compressedAudioUrl: finalizeData.compressedAudioUrl,
        duration: finalizeData.duration || 0
      }));

      // Add subtitles if generated
      if (finalizeData.subtitlesUrl) {
        dispatch(addSubtitlesToGeneration({
          subtitlesUrl: finalizeData.subtitlesUrl,
          subtitlesContent: finalizeData.subtitlesContent || ''
        }));
      }

      // Save to history
        dispatch(saveGenerationToHistory());

      showMessage('Audio generation completed successfully!', 'success');
      setGenerationStatusMessage('');

    } catch (error: any) {
      console.error('❌ Audio generation error:', error);
      dispatch(setAudioGenerationError(error.message));
      showMessage(`Audio generation failed: ${error.message}`, 'error');
      setGenerationStatusMessage('');
    }
  };

  // Download handlers
  const handleDownloadAudio = (audioUrl: string, filename: string = 'script-audio.mp3') => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadSubtitles = (subtitlesUrl: string, filename: string = 'subtitles.srt') => {
    const link = document.createElement('a')
    link.href = subtitlesUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Voice display functions - memoized to prevent infinite loops
  const getVoicesWithSeparator = useMemo(() => {
    console.log(`🎤 Getting display voices for provider: ${selectedProvider}`)
    
    const staticVoices = currentProvider?.voices || []
    const customVoicesForProvider = dbVoices.filter(voice => voice.provider === selectedProvider)
      .map(voice => ({
        id: voice.voice_id,
        name: `${voice.name} (Custom)`,
        isCustom: true
      }))
    
    let standardVoices: any[] = []
    
    const apiProviders = ['elevenlabs', 'minimax', 'fishaudio', 'voicemaker', 'google-tts']
    if (apiProviders.includes(selectedProvider)) {
      const dynamicVoices = apiVoices || []
      const voiceMap = new Map()
      
      staticVoices.forEach(voice => {
        if (voice.id) {
          voiceMap.set(voice.id, { ...voice, isCustom: false })
        }
      })
      
      dynamicVoices.forEach(voice => {
        const id = voice.id || voice.voice_id || voice.VoiceId;
        const name = voice.name || voice.voice_name || voice.VoiceWebname || id;
        if (!id) return;
        
        if (selectedProvider === 'voicemaker') {
          const gender = voice.VoiceGender ? ` (${voice.VoiceGender})` : ''
          const engine = voice.Engine ? ` - ${voice.Engine}` : ''
          voiceMap.set(id, {
            id,
            name: `${name}${gender}${engine}`,
            isCustom: false,
            gender: voice.VoiceGender,
            engine: voice.Engine,
            language: voice.Language
          })
        } else if (selectedProvider === 'google-tts') {
          const languages = voice.languageCodes || voice.LanguageCodes || [];
          const gender = voice.ssmlGender || voice.SsmlGender || '';
          const suffix = languages.length || gender ? ` ${languages.length ? `(${languages.join(', ')})` : ''}${gender ? ` - ${gender}` : ''}` : ''
          voiceMap.set(id, { id, name: `${name}${suffix}`.trim(), isCustom: false })
        } else {
          voiceMap.set(id, { id, name, isCustom: false, ...voice })
        }
      })
      
      standardVoices = Array.from(voiceMap.values())
    } else {
      standardVoices = staticVoices.map(voice => ({ ...voice, isCustom: false }))
    }
    
    return {
      standardVoices,
      customVoices: customVoicesForProvider
    }
  }, [selectedProvider, currentProvider, apiVoices, dbVoices, isLoadingApiVoices])

  // Legacy function for compatibility
  const getDisplayVoices = () => {
    const { standardVoices, customVoices } = getVoicesWithSeparator
    return [...standardVoices, ...customVoices]
  }

  const getVoiceDisplayName = (voiceId: string) => {
    const allVoices = getDisplayVoices()
    const voice = allVoices.find(v => v.id === voiceId)
    return voice?.name || voiceId
  }

  // Reset audio type selection when new generation completes
  useEffect(() => {
    if (currentGeneration && currentGeneration.status === 'completed' && currentGeneration.audioUrl) {
      setSelectedAudioType('original');
    }
  }, [currentGeneration?.id, currentGeneration?.status]);

  // History audio type handlers
  const setHistoryAudioType = (generationId: string, type: 'original' | 'compressed') => {
    setHistoryAudioTypes(prev => ({ ...prev, [generationId]: type }));
  };

  return (
    <StaggerContainer className="max-w-6xl mx-auto p-6 space-y-6">
      <StaggerItem>
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Audio Generator</h1>
          <p className="text-gray-600">Generate high-quality audio from your content using various TTS providers</p>
        </motion.div>
      </StaggerItem>

      <StaggerItem>
        <TextInputCard
          inputText={inputText}
          onInputTextChange={setInputText}
        />
      </StaggerItem>

      <StaggerItem>
        <ProviderSettingsCard
        contentSummary={contentSummary ? contentSummary.textToProcess : null}
        currentProvider={currentProvider}
        selectedProvider={selectedProvider}
        providerVoice={providerVoice}
        providerModel={providerModel}
        languageCode={languageCode}
        generateSubtitlesOption={generateSubtitlesOption}
        isLoadingApiVoices={isLoadingApiVoices}
        isGeneratingAudio={isGeneratingAudio}
        ttsProviders={TTS_PROVIDERS}
        getVoicesWithSeparator={getVoicesWithSeparator}
        onProviderChange={handleProviderChange}
        onVoiceChange={setProviderVoice}
        onModelChange={setProviderModel}
        onLanguageChange={setLanguageCode}
        onGenerateSubtitlesChange={setGenerateSubtitlesOption}
        onGenerateAudio={handleGenerateAudio}
      />
      </StaggerItem>

      <StaggerItem>
        <AudioProgressDisplay
          isGeneratingAudio={isGeneratingAudio}
          audioProgress={audioProgress}
          batchState={batchState}
          generationStatusMessage={generationStatusMessage}
          currentProviderName={currentProvider?.name}
        />
      </StaggerItem>

      <StaggerItem>
        <MessageDisplay
          message={message}
          messageType={messageType}
        />
      </StaggerItem>

      <StaggerItem>
        <CurrentGenerationCard
          currentGeneration={currentGeneration as any}
          selectedAudioType={selectedAudioType}
          currentProviderName={currentProvider?.name}
          getVoiceDisplayName={getVoiceDisplayName}
          providerVoice={providerVoice}
          onAudioTypeChange={setSelectedAudioType}
          onDownloadAudio={handleDownloadAudio}
          onDownloadSubtitles={handleDownloadSubtitles}
        />
      </StaggerItem>

      <StaggerItem>
        <GenerationHistoryCard
        generationHistory={generationHistory as any}
        historyAudioTypes={historyAudioTypes}
        onSetHistoryAudioType={setHistoryAudioType}
        onDownloadAudio={handleDownloadAudio}
        onDownloadSubtitles={handleDownloadSubtitles}
      />
        </StaggerItem>
    </StaggerContainer>
  )
} 