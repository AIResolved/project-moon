import { AuthButton } from "@/components/auth-button";
import { AuthStatus } from "@/components/auth-status";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export const metadata = {
  title: 'AI Content Generation Platform',
  description: 'Create engaging videos, images, and audio content using AI-powered tools. Transform your scripts into compelling multimedia experiences.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <h1 className="text-lg">AI Content Generator</h1>
            </div>
            <div className="flex items-center gap-4">
              <GoogleAuthButton />
              <AuthStatus />
              <AuthButton />
            </div>
          </div>
        </nav>
        
        <div className="flex-1 w-full flex flex-col items-center justify-center px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-6 text-foreground">
              AI Content Generation Platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your scripts into compelling multimedia experiences. Create engaging videos, images, and audio content using cutting-edge AI technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a 
                href="/app" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </a>
              <a 
                href="/privacy" 
                className="border border-border hover:bg-accent hover:text-accent-foreground px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Learn More
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Video Generation</h3>
                <p className="text-sm text-muted-foreground">Create professional videos from your scripts with AI-powered visual content.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Images</h3>
                <p className="text-sm text-muted-foreground">Generate stunning images and visuals tailored to your content needs.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Audio Generation</h3>
                <p className="text-sm text-muted-foreground">Convert text to natural-sounding speech with multiple voice options.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 