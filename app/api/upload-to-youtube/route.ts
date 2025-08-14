import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/authOptions';
import { google } from 'googleapis';

// Extended session type to include tokens
interface ExtendedSession {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    email?: string;
    name?: string;
  };
}

export async function POST(request: NextRequest) {
  console.log('🎬 YouTube upload API called');
  
  try {
    // Get the authenticated session
    const session = await auth() as ExtendedSession;
    console.log('👤 Session check:', !!session);
    
    if (!session?.accessToken) {
      console.log('❌ No access token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string || 'AI Generated Video';
    const description = formData.get('description') as string || 'Video created with AI Content Generation Platform';
    const tags = formData.get('tags') as string || 'ai,video,generated';
    const privacy = formData.get('privacy') as string || 'private';

    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('📁 File details:', {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type
    });

    // Set up Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    // Set the credentials
    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
      refresh_token: session.refreshToken as string,
    });

    // Create YouTube service
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    console.log('🎥 Starting YouTube upload...');

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Create a readable stream from buffer
    const { Readable } = require('stream');
    const fileStream = new Readable();
    fileStream.push(fileBuffer);
    fileStream.push(null);

    // Upload video to YouTube
    const uploadResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags.split(',').map(tag => tag.trim()),
          categoryId: '22', // People & Blogs category
        },
        status: {
          privacyStatus: privacy,
          embeddable: true,
          license: 'youtube',
        },
      },
      media: {
        body: fileStream,
      },
    });

    console.log('✅ YouTube upload completed:', uploadResponse.data.id);

    return NextResponse.json({
      success: true,
      videoId: uploadResponse.data.id,
      title: uploadResponse.data.snippet?.title,
      url: `https://www.youtube.com/watch?v=${uploadResponse.data.id}`,
      message: 'Video uploaded successfully to YouTube!'
    });

  } catch (error: any) {
    console.error('💥 YouTube upload error:', error);
    
    if (error.code === 403) {
      return NextResponse.json({ 
        error: 'YouTube API access denied. Please ensure you have the necessary permissions.' 
      }, { status: 403 });
    }
    
    if (error.code === 400) {
      return NextResponse.json({ 
        error: 'Invalid request. Please check your video file and try again.' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to upload video to YouTube' 
    }, { status: 500 });
  }
} 