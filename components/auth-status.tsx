'use client'

import { useAppSelector } from '../lib/hooks'
import { Crown } from 'lucide-react'

export function AuthStatus() {
  const user = useAppSelector(state => state.user)

  if (!user.initialized) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-gray-300">Checking auth...</span>
      </div>
    )
  }

  if (user.isLoggedIn) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded-full text-sm text-green-200">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span className="text-green-200">Email: {user.email}</span>
        {user.isAdmin && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 border border-yellow-700 rounded-full text-xs text-yellow-300">
            <Crown className="h-3 w-3 text-yellow-400" />
            <span className="text-yellow-300">Admin</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-700 rounded-full text-sm text-red-300">
      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
      <span className="text-red-300">Error: Not logged in</span>
    </div>
  )
} 