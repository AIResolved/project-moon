import { configureStore } from '@reduxjs/toolkit'
import userReducer from './features/user/userSlice'
import imagesReducer from './features/images/imagesSlice'
import imageGenerationReducer from './features/imageGeneration/imageGenerationSlice'
import scriptsReducer from './features/scripts/scriptsSlice'
import scriptProcessorReducer from './features/scriptProcessor/scriptProcessorSlice'
import audioReducer from './features/audio/audioSlice'
import videoReducer from './features/video/videoSlice'
import progressReducer from './features/progress/progressSlice'
import youtubeReducer from './features/youtube/youtubeSlice'
import textImageVideoReducer from './features/textImageVideo/textImageVideoSlice'
import optionsWorkflowReducer from './features/scripts/optionsWorkflowSlice'

// This is our Redux store - the single source of truth for our app's state
export const store = configureStore({
  reducer: {
    // User authentication state management
    user: userReducer,
    images: imagesReducer,
    imageGeneration: imageGenerationReducer,
    scripts: scriptsReducer,
    scriptProcessor: scriptProcessorReducer,
    audio: audioReducer,
    video: videoReducer,
    progress: progressReducer,
    youtube: youtubeReducer,
    textImageVideo: textImageVideoReducer,
    optionsWorkflow: optionsWorkflowReducer,
  },
  // Redux Toolkit includes good defaults for middleware
  // (like Redux DevTools and thunk for async actions)
})

// These types help TypeScript understand our store structure
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Example of what our state structure looks like:
// {
//   user: { id: 'abc123', email: 'user@example.com', isLoggedIn: true, ... },
//   images: { originalImages: [...], currentImages: [...], selectedColor: '#fff', ... },
//   scripts: { prompt: '...', scripts: [...], hasGeneratedScripts: true, ... },
//   scriptProcessor: { pastedScript: '...', chunks: [...], prompts: [...], ... },
//   audio: { currentGeneration: {...}, isGeneratingAudio: false, selectedVoice: 3, ... },
//   video: { currentGeneration: {...}, isGeneratingVideo: false, settings: {...}, ... },
//   progress: { ... },
//   youtube: { searchQuery: '...', videos: [...], researchSummaries: [...], ... }
// } 