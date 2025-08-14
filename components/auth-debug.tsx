'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AuthDebug() {
  const { data: session, status } = useSession()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      // Clear any existing cookies/session before signing in
      await signOut({ redirect: false })
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Sign in with fresh state
      await signIn('google', { 
        callbackUrl: window.location.origin,
        redirect: true 
      })
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Auth Debug Panel</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>User:</strong> {session?.user?.email || 'None'}</p>
        <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
      </div>

      <div className="mt-4 space-x-2">
        {status === 'unauthenticated' && (
          <Button 
            onClick={handleSignIn} 
            disabled={isSigningIn}
            size="sm"
          >
            {isSigningIn ? 'Signing in...' : 'Clean Sign In'}
          </Button>
        )}
        
        {status === 'authenticated' && (
          <Button 
            onClick={() => signOut()} 
            variant="outline"
            size="sm"
          >
            Sign Out
          </Button>
        )}
        
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          size="sm"
        >
          Refresh Page
        </Button>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p><strong>Troubleshooting Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>If you get state mismatch, try "Clean Sign In"</li>
          <li>Make sure your ngrok URL matches NEXTAUTH_URL</li>
          <li>Check browser cookies are enabled</li>
          <li>Try in incognito mode if issues persist</li>
        </ul>
      </div>
    </div>
  )
} 