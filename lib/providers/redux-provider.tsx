'use client'

import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { initializeAuth, syncAuthState, checkAdminStatus } from '../features/user/userSlice'
import { createClient } from '../supabase/client'

// This component wraps our app and provides the Redux store to all child components
// We need 'use client' because Redux Provider needs to run on the client side
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </Provider>
  )
}

// Separate component to handle auth initialization and listening
function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()
    let isInitializing = true
    
    // Initialize authentication state when the app loads
    const initializeAuthFlow = async () => {
      try {
        const result = await store.dispatch(initializeAuth())
        
        // Check admin status if user is authenticated
        if (result.payload && typeof result.payload === 'object' && 'id' in result.payload && result.payload.id) {
          await store.dispatch(checkAdminStatus(result.payload.id as string))
        }
      } catch (error) {
        console.error('Error during auth initialization:', error)
      } finally {
        isInitializing = false
      }
    }
    
    // Start initialization
    initializeAuthFlow()
    
    // Set up auth state listener to sync with Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip handling auth changes during initial load to avoid conflicts
        if (isInitializing) {
          console.log('Skipping auth event during initialization:', event)
          return
        }
        
        console.log('Supabase auth event:', event, session?.user?.email)
        
        // If user is signing in, check admin status
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            const adminStatusResult = await store.dispatch(checkAdminStatus(session.user.id))
            const isAdmin = adminStatusResult.payload as boolean
            
            // Sync Redux state with Supabase auth state including admin status
            store.dispatch(syncAuthState({ user: session.user, isAdmin }))
          } catch (error) {
            console.error('Error checking admin status:', error)
            // Fallback: sync without admin status
            store.dispatch(syncAuthState({ user: session.user, isAdmin: false }))
          }
        } else {
          // For sign out or other events, sync without admin status
          store.dispatch(syncAuthState({ user: session?.user || null, isAdmin: false }))
        }
      }
    )
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
} 