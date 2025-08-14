import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not-set',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      baseUrl: process.env.NEXTAUTH_URL || 
               (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
      vercelUrl: process.env.VERCEL_URL || 'not-set',
      actualNextAuthUrl: process.env.NEXTAUTH_URL || 'not-set'
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get config', details: String(error) },
      { status: 500 }
    );
  }
} 