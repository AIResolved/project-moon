'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AuthDebug } from '@/components/auth-debug';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    // Check environment variables (only those that are safe to expose)
    setEnvVars({
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      hasGoogleClientId: !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'CLIENT_ID_SET'),
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
    });
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">NextAuth Debug Information</h1>
      
      <div className="grid gap-6">
        {/* Interactive Debug Panel */}
        <AuthDebug />

        {/* Session Status */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
              status === 'authenticated' ? 'bg-green-100 text-green-800' :
              status === 'unauthenticated' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>{status}</span></p>
            {session?.user && (
              <div>
                <p><strong>User:</strong></p>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(session.user, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Environment Information</h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {String(value)}</p>
            ))}
          </div>
        </div>

        {/* Auth URLs */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Authentication URLs</h2>
          <div className="space-y-2">
            <p><strong>Sign In URL:</strong> /api/auth/signin</p>
            <p><strong>Sign Out URL:</strong> /api/auth/signout</p>
            <p><strong>Session URL:</strong> /api/auth/session</p>
            <p><strong>CSRF URL:</strong> /api/auth/csrf</p>
            <p><strong>Config Check:</strong> /api/auth/config</p>
          </div>
        </div>

        {/* OAuth State Mismatch Troubleshooting */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold mb-3 text-red-800">OAuth State Mismatch Fix</h2>
          <div className="space-y-3 text-sm">
            <p className="text-red-700">If you're getting "state mismatch" errors:</p>
            <ol className="list-decimal list-inside space-y-2 text-red-600">
              <li>Use the "Clean Sign In" button above - it clears cookies first</li>
              <li>Make sure NEXTAUTH_URL exactly matches your ngrok URL</li>
              <li>Clear all browser cookies for this domain</li>
              <li>Try signing in from an incognito/private window</li>
              <li>Restart your ngrok tunnel and update NEXTAUTH_URL</li>
              <li>Check that Google OAuth redirect URI matches your ngrok URL</li>
            </ol>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">Common Issues & Solutions</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-blue-700">OAuth not working in production:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-600">
                <li>Ensure NEXTAUTH_URL matches your production domain</li>
                <li>Check Google OAuth redirect URIs include your production callback</li>
                <li>Verify NEXTAUTH_SECRET is set in production</li>
                <li>Make sure e.preventDefault() is called before signIn()</li>
              </ul>
            </div>
            <div>
              <strong className="text-blue-700">Required Google OAuth Redirect URIs:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-600">
                <li>{envVars.currentUrl?.replace(/\/auth\/debug.*/, '')}/api/auth/callback/google</li>
                <li>http://localhost:3000/api/auth/callback/google (for development)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 