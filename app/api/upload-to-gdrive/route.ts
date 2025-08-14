import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  console.log("Upload request received");
  
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

  if (!token || !token.accessToken) {
    console.error("Upload failed: Not authenticated");
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // --- 1. Parse multipart/form-data --- 
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parentId = (formData.get('parentId') as string) || 'root'; // Default to root if not specified

    if (!file) {
      console.error("Upload failed: No file provided in form data");
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`Attempting to upload '${file.name}' to folder ID: ${parentId}`);
    console.log(`File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    // --- 2. Setup Google Drive API Client --- 
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    auth.setCredentials({
      access_token: token.accessToken as string,
      refresh_token: token.refreshToken as string,
      expiry_date: token.expiresAt
        ? (token.expiresAt as number) * 1000
        : undefined,
    });
    
    const drive = google.drive({ version: 'v3', auth });

    // --- 3. Use resumable upload for large files (>5MB) or simple upload for smaller files ---
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    if (file.size > 5 * 1024 * 1024) { // 5MB threshold
      console.log('Using resumable upload for large file...');
      
      // Create resumable upload session
      const resumableResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': file.type,
          'X-Upload-Content-Length': file.size.toString(),
        },
        body: JSON.stringify({
          name: file.name,
          parents: [parentId],
        }),
      });

      if (!resumableResponse.ok) {
        throw new Error(`Failed to create resumable upload session: ${resumableResponse.status}`);
      }

      const uploadUrl = resumableResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL received from Google Drive');
      }

      console.log('Resumable upload session created, uploading file...');

      // Upload the file content
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString(),
        },
        body: fileBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();
      console.log(`Resumable upload successful: ID=${result.id}, Name=${result.name}`);
      
      return NextResponse.json({
        success: true,
        fileId: result.id,
        fileName: result.name,
        fileLink: `https://drive.google.com/file/d/${result.id}/view?usp=drivesdk`,
      });
      
    } else {
      console.log('Using simple upload for small file...');
      
      // --- 4. Convert File to ReadableStream for simple upload ---
      const fileStream = Readable.from(fileBuffer);

      // --- 5. Call drive.files.create --- 
      console.log(`Calling drive.files.create for ${file.name}...`);
      const response = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [parentId],
        },
        media: {
          mimeType: file.type,
          body: fileStream, 
        },
        fields: 'id, name, webViewLink',
      });

      console.log(`Simple upload successful: ID=${response.data.id}, Name=${response.data.name}`);
      
      return NextResponse.json({
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        fileLink: response.data.webViewLink,
      });
    }

  } catch (error: any) {
    console.error('Error uploading file to Google Drive:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to upload file';
    const status = error.response?.data?.error?.code || (error.code === 'ENOENT' ? 400 : 500);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 