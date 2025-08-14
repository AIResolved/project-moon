import { ReduxAuthExample } from '@/components/redux-auth-example'
import { AuthDebug } from '@/components/auth-debug'
import Link from 'next/link'

export default function ReduxDemoPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Redux Demo</h1>
          <p className="text-lg text-gray-600">
            Redux + Supabase authentication integration
          </p>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Auth Debug Panel */}
        <div className="bg-yellow-50 p-1 rounded-lg">
          <div className="bg-white rounded-lg p-4">
            <AuthDebug />
          </div>
        </div>

        {/* Real Supabase Auth Demo */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-1 rounded-lg">
          <div className="bg-white rounded-lg">
            <ReduxAuthExample />
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Redux + Supabase Benefits</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Centralized Auth State:</strong> User authentication status available throughout your app</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Persistent Sessions:</strong> Auth state persists across page refreshes</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Loading States:</strong> Track login/logout operations in progress</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Error Handling:</strong> Centralized error management for auth operations</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Type Safety:</strong> Full TypeScript support for user data</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <div><strong>Real-time Sync:</strong> Components react instantly to auth changes</div>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">File Structure</h2>
          <pre className="text-sm bg-white p-4 rounded border overflow-x-auto">
{`lib/
├── store.ts                    # Redux store with user slice
├── hooks.ts                    # Typed Redux hooks
├── providers/
│   └── redux-provider.tsx      # Provider with auth initialization
└── features/
    └── user/
        └── userSlice.ts         # Supabase user authentication

components/
├── redux-auth-example.tsx     # Real Supabase auth component
├── auth-debug.tsx             # Auth state debugging tool
└── auth-status.tsx            # Auth status indicator`}
          </pre>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Debug Panel Usage</h2>
          <div className="space-y-2 text-sm">
            <p><strong>🔍 Check Debug Panel:</strong> Use the yellow debug panel above to see both Supabase and Redux states</p>
            <p><strong>🔄 Refresh Redux:</strong> Click "Refresh Redux" button if states are out of sync</p>
            <p><strong>📱 Test Navigation:</strong> Navigate between pages to test state persistence</p>
            <p><strong>🛠️ Browser Console:</strong> Check console for auth event logs and any errors</p>
            <p><strong>✅ Verify Sync:</strong> Both states should show the same user info when logged in</p>
          </div>
        </div>
      </div>
    </main>
  )
} 