# Redux + Supabase Setup Guide

This project includes a complete Redux setup using Redux Toolkit integrated with **real Supabase authentication**. Here's everything you need to know:

## 🏗️ Project Structure

```
lib/
├── store.ts                    # Main Redux store configuration
├── hooks.ts                    # Typed Redux hooks for TypeScript
├── providers/
│   └── redux-provider.tsx      # Provider component with auth initialization
└── features/
    ├── counter/
    │   └── counterSlice.ts      # Example: Counter state management
    └── user/
        └── userSlice.ts         # Real Supabase user authentication

components/
├── counter-example.tsx         # Demo component using counter state
├── user-example.tsx           # Mock user demo component
├── redux-auth-example.tsx     # Real Supabase auth component
└── auth-status.tsx            # Auth status indicator

app/
├── layout.tsx                  # Root layout with Redux Provider
└── redux-demo/
    └── page.tsx               # Interactive Redux examples
```

## 🚀 How Redux + Supabase Works

### 1. **Store** (`lib/store.ts`)
The single source of truth for your app's state, including authentication.

```typescript
export const store = configureStore({
  reducer: {
    counter: counterReducer,
    user: userReducer,        // Real Supabase auth state
  },
})
```

### 2. **User Slice** (`lib/features/user/userSlice.ts`)
Manages real Supabase authentication with async thunks:

```typescript
// Async thunks for real authentication
export const loginUser = createAsyncThunk(
  'user/loginUser',
  async ({ email, password }) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    if (error) throw new Error(error.message)
    return data.user
  }
)

export const logoutUser = createAsyncThunk('user/logoutUser', async () => {
  const supabase = createClient()
  await supabase.auth.signOut()
})
```

### 3. **Components** Use Real Auth
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { loginUser, logoutUser } from '@/lib/features/user/userSlice'

function AuthComponent() {
  const user = useAppSelector(state => state.user)
  const dispatch = useAppDispatch()
  
  const handleLogin = () => {
    dispatch(loginUser({ email, password }))
  }
  
  return (
    <div>
      {user.isLoggedIn ? (
        <p>Welcome {user.email}!</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  )
}
```

## 🔄 The Redux + Supabase Flow

1. **App Initialization** → `initializeAuth()` checks existing session
2. **User Login** → `loginUser({ email, password })` calls Supabase API
3. **Supabase Response** → User data stored in Redux store
4. **State Update** → All components re-render with new auth state
5. **Persistence** → Auth state persists across page refreshes

## 📝 Available Auth Actions

### Async Thunks (API calls)
```typescript
// Check initial auth state
dispatch(initializeAuth())

// Login user
dispatch(loginUser({ email, password }))

// Logout user  
dispatch(logoutUser())

// Sign up new user
dispatch(signUpUser({ email, password }))
```

### Sync Actions (immediate state updates)
```typescript
// Clear error messages
dispatch(clearError())

// Update user metadata
dispatch(updateUserMetadata({ name: 'John Doe' }))

// Reset user state
dispatch(resetUser())
```

## 🛠️ User State Structure

```typescript
interface UserState {
  id: string | null                // Supabase user ID
  email: string | null             // User email
  userMetadata: {                  // Supabase user metadata
    name?: string
    avatar_url?: string
    [key: string]: any
  }
  isLoggedIn: boolean             // Authentication status
  loading: boolean                // Loading state for operations
  error: string | null            // Error messages
  initialized: boolean            // Has initial auth check completed
}
```

## 🔧 Key Features

### ✅ Real Supabase Integration
- Uses actual Supabase auth API
- Handles email/password authentication
- Supports user registration and login
- Manages auth sessions properly

### ✅ Persistent Authentication
- Auth state survives page refreshes
- Automatic session restoration
- Seamless user experience

### ✅ Loading & Error States
- Track login/logout operations
- Display loading spinners
- Show error messages
- Handle network failures

### ✅ Type Safety
- Full TypeScript support
- Typed user data from Supabase
- IntelliSense autocompletion

## 🎯 Usage Examples

### Login Form Component
```typescript
'use client'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { loginUser } from '@/lib/features/user/userSlice'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector(state => state.user)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dispatch(loginUser({ email, password })).unwrap()
      // Login successful
    } catch (error) {
      // Error handled by Redux
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
```

### Auth Status Component
```typescript
'use client'
import { useAppSelector } from '@/lib/hooks'

export function AuthStatus() {
  const user = useAppSelector(state => state.user)
  
  if (!user.initialized) return <span>Checking auth...</span>
  
  return (
    <span>
      {user.isLoggedIn ? `Logged in as ${user.email}` : 'Not logged in'}
    </span>
  )
}
```

### Protected Route
```typescript
'use client'
import { useAppSelector } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedPage() {
  const { isLoggedIn, initialized } = useAppSelector(state => state.user)
  const router = useRouter()
  
  useEffect(() => {
    if (initialized && !isLoggedIn) {
      router.push('/auth/login')
    }
  }, [initialized, isLoggedIn, router])
  
  if (!initialized) return <div>Loading...</div>
  if (!isLoggedIn) return null
  
  return <div>Protected content</div>
}
```

## 🐛 Error Handling

The user slice handles common authentication errors:

```typescript
// Login errors
"Invalid login credentials"
"Email not confirmed"
"Too many requests"

// Network errors  
"Network error"
"Failed to check authentication"

// Clear errors manually
dispatch(clearError())
```

## 🚀 Try It Out

1. Visit `/redux-demo` to see interactive examples
2. Test real Supabase authentication
3. Open Redux DevTools to see state changes
4. Check auth persistence by refreshing the page
5. Navigate between pages to see global auth state

## 📚 Advanced Patterns

### Auth Listener (Optional)
For real-time auth state updates, you can add a Supabase auth listener:

```typescript
// In your app initialization
useEffect(() => {
  const supabase = createClient()
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session?.user) {
        dispatch(loginSuccess(session.user))
      } else {
        dispatch(logout())
      }
    }
  )
  
  return () => subscription.unsubscribe()
}, [dispatch])
```

### Automatic Token Refresh
Supabase handles token refresh automatically, but you can track it:

```typescript
// Monitor token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed')
  }
})
```

## 🔗 Learn More

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools) 