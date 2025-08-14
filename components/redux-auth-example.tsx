'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../lib/hooks'
import { 
  initializeAuth, 
  loginUser, 
  logoutUser, 
  signUpUser, 
  clearError 
} from '../lib/features/user/userSlice'

export function ReduxAuthExample() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(state => state.user)
  
  // Local form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // Initialize auth state when component mounts
  useEffect(() => {
    if (!user.initialized) {
      dispatch(initializeAuth())
    }
  }, [dispatch, user.initialized])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    try {
      await dispatch(loginUser({ email, password })).unwrap()
      // Clear form on success
      setEmail('')
      setPassword('')
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Login error:', error)
    }
  }

  // Handle sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    try {
      await dispatch(signUpUser({ email, password })).unwrap()
      // Clear form on success
      setEmail('')
      setPassword('')
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Sign up error:', error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Handle clearing errors
  const handleClearError = () => {
    dispatch(clearError())
  }

  // Show loading during initialization
  if (!user.initialized) {
    return (
      <div className="p-6 border rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 border rounded-lg space-y-4">
      <h2 className="text-2xl font-bold">Redux + Supabase Auth</h2>
      
      {/* Loading indicator */}
      {user.loading && (
        <div className="bg-blue-50 p-3 rounded flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-blue-700">Processing...</span>
        </div>
      )}
      
      {/* Error display */}
      {user.error && (
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <div className="flex justify-between items-start">
            <p className="text-red-700 text-sm">{user.error}</p>
            <button 
              onClick={handleClearError}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {user.isLoggedIn ? (
        /* Logged in state */
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">✅ Authenticated with Supabase</h3>
            <div className="text-sm space-y-1">
              <p><strong>ID:</strong> <code className="bg-white px-1 rounded">{user.id}</code></p>
              <p><strong>Email:</strong> {user.email}</p>
              {user.userMetadata.name && (
                <p><strong>Name:</strong> {user.userMetadata.name}</p>
              )}
              {user.userMetadata.avatar_url && (
                <p><strong>Avatar:</strong> {user.userMetadata.avatar_url}</p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600 mb-2"><strong>Full user metadata:</strong></p>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(user.userMetadata, null, 2)}
            </pre>
          </div>
          
          <button 
            onClick={handleLogout}
            disabled={user.loading}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {user.loading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      ) : (
        /* Not logged in state */
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-700">Not authenticated</p>
          </div>
          
          {/* Toggle between login and sign up */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsSignUp(false)}
              className={`px-3 py-1 rounded text-sm ${
                !isSignUp ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`px-3 py-1 rounded text-sm ${
                isSignUp ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          {/* Login/Sign up form */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={user.loading || !email || !password}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {user.loading 
                ? (isSignUp ? 'Signing up...' : 'Logging in...') 
                : (isSignUp ? 'Sign Up' : 'Login')
              }
            </button>
          </form>
          
          {isSignUp && (
            <p className="text-xs text-gray-600">
              Note: You may need to confirm your email before logging in.
            </p>
          )}
        </div>
      )}
      
      <div className="text-sm text-gray-600 mt-4 pt-4 border-t">
        <p><strong>Redux State Demo:</strong></p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Real Supabase authentication integration</li>
          <li>Persistent auth state across page refreshes</li>
          <li>Loading states during async operations</li>
          <li>Error handling and display</li>
          <li>Auto-initialization on app load</li>
        </ul>
      </div>
    </div>
  )
} 