import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { AuthStatus } from "@/components/auth-status";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { MainLayout } from "@/components/main-layout";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";

export const metadata = {
  title: 'AI Content Generation App',
  description: 'Create engaging videos, images, and audio content using AI-powered tools.',
}

export default function AppPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <a href="/home" className="text-lg hover:underline">Project Moon</a>
            </div>
            <div className="flex items-center gap-4">
              <GoogleAuthButton />
              <AuthStatus />
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        
        <div className="flex-1 w-full flex justify-center">
          <div className="w-full max-w-7xl">
            <MainLayout />
          </div>
        </div>
      </div>
    </main>
  );
} 