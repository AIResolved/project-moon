'use client'

import { useState } from 'react'
import { useAppSelector } from '../lib/hooks'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ImageIcon, FileText, Key, Volume2, VideoIcon, BarChart3, ChevronRight, Crown, Mic, Video, Activity, Settings, Search, Zap, Music, Brain, Package, Archive, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScaleOnHover, StaggerContainer, StaggerItem } from './animated-page'

type NavigationView = 'script-generator' | 'image-generator' | 'audio-generator' | 'music-manager' | 'video-generator' | 'video-status' | 'admin-dashboard' | 'youtube-search' | 'text-image-video-generator' | 'animation-generator' | 'mixed-content-generator'

interface SidebarNavigationProps {
  activeView: NavigationView
  onViewChange: (view: NavigationView) => void
}

export function SidebarNavigation({ 
  activeView, 
  onViewChange
}: SidebarNavigationProps) {
  const { hasGeneratedScripts, scripts, hasFullScript, fullScript } = useAppSelector(state => state.scripts)
   const user = useAppSelector(state => state.user)
  
  // YouTube research state
  const youtube = useAppSelector(state => state.youtube)
  const hasYouTubeResearch = youtube && (
    (youtube.youtubeResearchSummaries && youtube.youtubeResearchSummaries.length > 0) ||
    youtube.videosSummary
  )
  const appliedResearchCount = youtube ? (
    (youtube.youtubeResearchSummaries?.filter(r => r.appliedToScript) || []).length
  ) : 0

  const navigationItems = [
    {
      id: 'youtube-search' as NavigationView,
      label: 'YouTube Research',
      icon: Search,
      description: 'Research & analyze YouTube videos'
    },
    {
      id: 'script-generator' as NavigationView,
      label: 'Script Generator',
      icon: FileText,
      description: 'Generate AI-powered scripts'
    },
    {
      id: 'image-generator' as NavigationView,
      label: 'Image Generator', 
      icon: ImageIcon,
      description: 'Create images from scripts'
    },
    {
      id: 'animation-generator' as NavigationView,
      label: 'Animation Generator',
      icon: Zap,
      description: 'Create animations from reference images'
    },
    {
      id: 'text-image-video-generator' as NavigationView,
      label: 'Text & Image to Video Generator',
      icon: VideoIcon,
      description: 'Create videos from text and images'
    },
    {
      id: 'mixed-content-generator' as NavigationView,
      label: 'Mixed Content Generator',
      icon: Layers,
      description: 'Organize all content for videos'
    },
   
    {
      id: 'audio-generator' as NavigationView,
      label: 'Audio Generator',
      icon: Mic,
      description: 'Generate voiceovers'
    },
    {
      id: 'music-manager' as NavigationView,
      label: 'Music',
      icon: Music,
      description: 'Upload and manage background music'
    },
    {
      id: 'video-generator' as NavigationView,
      label: 'Video Generator',
      icon: Video,
      description: 'Create videos from content'
    },
    {
      id: 'video-status' as NavigationView,
      label: 'Video Status',
      icon: Activity,
      description: 'Track video generation'
    },
    {
      id: 'admin-dashboard' as NavigationView,
      label: 'Admin Dashboard',
      icon: Settings,
      description: 'Manage settings'
    }
  ]

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col min-h-screen">
      {/* Header */}
      <motion.div 
        className="p-6 border-b border-gray-700"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-xl font-bold text-white"
          animate={{ 
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{
            background: "linear-gradient(90deg, #3b82f6, #9333ea, #ec4899, #3b82f6)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          🌙 Project Moon AI Generator
        </motion.h1>
        <motion.p 
          className="text-sm text-gray-300 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          AI-powered content creation
        </motion.p>
      </motion.div>

      {/* Navigation */}
      <StaggerContainer className="flex-1 p-4 space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          
          return (
            <StaggerItem key={item.id}>
              <ScaleOnHover scale={1.02}>
                <motion.button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    animate={isActive ? { rotate: [0, 10, 0] } : {}}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`} />
                  </motion.div>
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{item.description}</div>
                  </div>
                  
                  {/* Progress indicators with animations */}
                  <AnimatePresence>
                    {item.id === 'script-generator' && (hasGeneratedScripts || hasFullScript) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-2 text-xs text-green-300 bg-green-900/30 p-2 rounded border border-green-800"
                      >
                        {hasFullScript ? `Full script: "${fullScript?.title}"` : `${scripts.length} scripts generated`}
                      </motion.div>
                    )}
                    
                    {item.id === 'youtube-search' && hasYouTubeResearch && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-2 text-xs text-blue-300 bg-blue-900/30 p-2 rounded border border-blue-800"
                      >
                        {appliedResearchCount > 0 
                          ? `${appliedResearchCount} research applied to script`
                          : 'Research data available'
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </ScaleOnHover>
            </StaggerItem>
          )
        })}
      </StaggerContainer>


    </div>
  )
} 