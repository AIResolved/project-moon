'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import { GoogleLogo } from './google-logo';

export function GoogleAuthButton() {
  const { data: session, status } = useSession();

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    signIn('google');
  };

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut();
  };

  if (status === 'loading') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled
        className="border-gray-600 bg-gray-800 text-gray-400"
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300 hidden sm:block">
          {session?.user?.email}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSignOut}
          className="flex items-center gap-2 border-red-600 bg-transparent hover:bg-red-900/20 text-red-300 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSignIn}
      className="flex items-center gap-2 border-blue-600 bg-transparent hover:bg-blue-900/20 text-blue-300 hover:text-blue-200 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <GoogleLogo size={16} />
      <span className="hidden sm:inline font-medium">Sign in with Google</span>
      <span className="sm:hidden font-medium">Google</span>
    </Button>
  );
} 