'use client'

import { StaggerContainer, StaggerItem } from './animated-page'
import { motion } from 'framer-motion'
import { Clock, Sparkles } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <StaggerContainer className="flex-1 p-6 space-y-6">
      <StaggerItem>
        <motion.div 
          className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <motion.div 
            className="relative"
            animate={{ 
              rotate: [0, 5, -5, 0],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Icon className="h-24 w-24 text-blue-500" />
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </motion.div>
          </motion.div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">{title}</h1>
            <p className="text-xl text-gray-600 max-w-md">{description}</p>
          </div>
          
          <motion.div 
            className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-6 py-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Coming Soon</span>
          </motion.div>
          
          <motion.p 
            className="text-gray-500 text-sm max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            We're working hard to bring you this exciting new feature. Stay tuned for updates!
          </motion.p>
        </motion.div>
      </StaggerItem>
    </StaggerContainer>
  )
}
