'use client'

import { CheckCircle, AlertCircle, Volume2 } from "lucide-react"

interface MessageDisplayProps {
  message: string
  messageType: 'success' | 'error' | 'info'
}

export function MessageDisplay({
  message,
  messageType
}: MessageDisplayProps) {
  if (!message) return null

  return (
    <div className={`p-3 rounded-lg border ${
      messageType === 'success' ? 'border-green-600 bg-green-900/20' :
      messageType === 'error' ? 'border-red-600 bg-red-900/20' :
      'border-blue-600 bg-blue-900/20'
    }`}>
      <div className="flex items-center gap-2">
        {messageType === 'success' && <CheckCircle className="h-4 w-4 text-green-400" />}
        {messageType === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
        {messageType === 'info' && <Volume2 className="h-4 w-4 text-blue-400" />}
        <span className={`text-sm ${
          messageType === 'success' ? 'text-green-300' :
          messageType === 'error' ? 'text-red-300' :
          'text-blue-300'
        }`}>
          {message}
        </span>
      </div>
    </div>
  )
} 