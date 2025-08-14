import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking Google authentication status...');
    
    // Try multiple cookie names for NextAuth v5 compatibility
    let token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "__Secure-authjs.session-token"
    });
    
    // Fallback to other cookie names if needed
    if (!token) {
      token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "authjs.session-token"
      });
    }
    
    if (!token) {
      token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "next-auth.session-token"
      });
    }
    
    if (!token) {
      token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "__Host-authjs.session-token"
      });
    }

    const hasTokens = !!(token && token.accessToken);
    
    console.log('🔍 Google tokens check result:', {
      hasToken: !!token,
      hasAccessToken: !!token?.accessToken,
      hasRefreshToken: !!token?.refreshToken,
      email: token?.email,
      result: hasTokens
    });

    return NextResponse.json({ 
      hasTokens,
      email: token?.email || null
    });
    
  } catch (error: any) {
    console.error('Error checking Google authentication:', error);
    return NextResponse.json({ 
      hasTokens: false,
      error: error.message 
    }, { status: 500 });
  }
} 