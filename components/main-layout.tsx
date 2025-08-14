'use client'

import { useState } from 'react'
import { useAppSelector } from '../lib/hooks'
import { SidebarNavigation } from './sidebar-navigation'
import { AIImageGenerator } from './ai-image-generator'
import ScriptGenerator from './script-generator'
import { AudioGenerator } from './audio-generator'
import { VideoGenerator } from './video-generator'
import { VideoStatus } from './video-status'
import { AdminDashboard } from './admin-dashboard'
import YouTubeSearch from './youtube-search'
import { TextImageVideoGenerator } from './text-image-video-generator'
import { UnifiedAnimationGenerator } from './unified-animation-generator'
import { MusicManager } from './music-manager'
import { AnimatedPage } from './animated-page'
import { ComingSoon } from './coming-soon'
import { MixedContentGenerator } from './mixed-content-generator'
import { Brain, Package, Archive } from 'lucide-react'

type NavigationView = 'script-generator' | 'image-generator' | 'audio-generator' | 'music-manager' | 'video-generator' | 'video-status' | 'admin-dashboard' | 'youtube-search' | 'text-image-video-generator' | 'animation-generator' | 'mixed-content-generator'

export function MainLayout() {
  // Start with script generator as the default view
  const [activeView, setActiveView] = useState<NavigationView>('script-generator')

  const renderContent = () => {
    switch (activeView) {
      case 'script-generator':
        return (
          <AnimatedPage pageKey="script-generator">
            <ScriptGenerator />
          </AnimatedPage>
        )
      case 'image-generator':
        return (
          <AnimatedPage pageKey="image-generator">
            <AIImageGenerator />
          </AnimatedPage>
        )
      case 'animation-generator':
        return (
          <AnimatedPage pageKey="animation-generator">
            <UnifiedAnimationGenerator />
          </AnimatedPage>
        )
      case 'audio-generator':
        return (
          <AnimatedPage pageKey="audio-generator">
            <AudioGenerator />
          </AnimatedPage>
        )
      case 'music-manager':
        return (
          <AnimatedPage pageKey="music-manager">
            <MusicManager />
          </AnimatedPage>
        )
      case 'video-generator':
        return (
          <AnimatedPage pageKey="video-generator">
            <VideoGenerator />
          </AnimatedPage>
        )
      case 'video-status':
        return (
          <AnimatedPage pageKey="video-status">
            <VideoStatus />
          </AnimatedPage>
        )
      case 'admin-dashboard':
        return (
          <AnimatedPage pageKey="admin-dashboard">
            <AdminDashboard />
          </AnimatedPage>
        )
      case 'youtube-search':
        return (
          <AnimatedPage pageKey="youtube-search">
            <YouTubeSearch />
          </AnimatedPage>
        )
      case 'text-image-video-generator':
        return (
          <AnimatedPage pageKey="text-image-video-generator">
            <TextImageVideoGenerator />
          </AnimatedPage>
        )
      
      case 'mixed-content-generator':
        return (
          <AnimatedPage pageKey="mixed-content-generator">
            <MixedContentGenerator />
          </AnimatedPage>
        )
      default:
        return (
          <AnimatedPage pageKey="script-generator">
            <ScriptGenerator />
          </AnimatedPage>
        )
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar */}
      <SidebarNavigation 
        activeView={activeView} 
        onViewChange={setActiveView}
      />
      
      {/* Main Content */}
      <div className="flex-1 bg-gray-900">
        <div className="ai-panel-gradient">
          {renderContent()}
        </div>
      </div>
    </div>
  )
} 