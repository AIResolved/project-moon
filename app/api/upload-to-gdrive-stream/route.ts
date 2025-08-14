import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  console.log("Streaming upload request received");
  console.log("Request URL:", req.url);
  
  // Debug: Check all cookies
  const cookies = req.headers.get('cookie');
  console.log("All cookies:", cookies);
  
  // Try multiple approaches to get the token
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    // Specify the correct cookie name for NextAuth v5
    cookieName: "__Secure-authjs.session-token"
  });
  
  console.log("Token result:", token ? "Token found" : "No token");
  console.log("Token details:", {
    hasToken: !!token,
    hasAccessToken: !!token?.accessToken,
    tokenKeys: token ? Object.keys(token) : [],
    expiresAt: token?.expiresAt,
    email: token?.email
  });

  // If first attempt fails, try with alternative cookie names
  if (!token) {
    console.log("Trying alternative cookie names...");
    
    // Try the cookie name I can see in the logs
    const altToken0 = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "authjs.session-token"
    });
    
    const altToken1 = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "next-auth.session-token"
    });
    
    const altToken2 = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "__Host-authjs.session-token"
    });
    
    console.log("Alternative token attempts:", {
      altToken0: !!altToken0,
      altToken1: !!altToken1,
      altToken2: !!altToken2
    });
    
    if (altToken0) {
      console.log("Using altToken0 (authjs.session-token)");
      return await processUpload(req, altToken0);
    }
    if (altToken1) {
      console.log("Using altToken1");
      return await processUpload(req, altToken1);
    }
    if (altToken2) {
      console.log("Using altToken2");
      return await processUpload(req, altToken2);
    }
  }

  if (!token || !token.accessToken) {
    console.error("Upload failed: Not authenticated");
    console.error("Token:", token);
    console.error("AccessToken:", token?.accessToken);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return await processUpload(req, token);
}

// Separate function to handle the actual upload logic
async function processUpload(req: NextRequest, token: any) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parentId = (formData.get('parentId') as string) || 'root';

    if (!file) {
      console.error("Upload failed: No file provided in form data");
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`Starting streaming upload for '${file.name}' (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendProgress = (progress: number, message: string) => {
          const data = `data: ${JSON.stringify({ progress, message })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          sendProgress(10, 'Preparing file for upload...');

          // Read file content
          const fileBuffer = Buffer.from(await file.arrayBuffer());
          
          sendProgress(20, 'Creating resumable upload session...');

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

          sendProgress(30, 'Upload session created, uploading file...');

          // Simulate progress during upload since Google Drive doesn't provide chunked progress
          const progressInterval = setInterval(() => {
            // This will be cleared when upload completes
          }, 100);

          let currentProgress = 30;
          const progressStep = (90 - 30) / 10;

          // Send periodic progress updates
          const updateProgress = () => {
            if (currentProgress < 85) {
              currentProgress += progressStep;
              sendProgress(Math.round(currentProgress), `Uploading to Google Drive... ${Math.round(currentProgress)}%`);
            }
          };

          // Start progress updates
          const progressTimer = setInterval(updateProgress, 500);

          try {
            // Upload the file content in one go (Google Drive handles the actual chunking internally)
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': file.type,
                'Content-Length': file.size.toString(),
              },
              body: fileBuffer,
            });

            // Clear progress timer
            clearInterval(progressTimer);
            clearInterval(progressInterval);

            if (!uploadResponse.ok) {
              throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            sendProgress(95, 'Upload completed, processing...');

            const result = await uploadResponse.json();
            console.log(`Upload successful: ID=${result.id}, Name=${result.name}`);
            
            sendProgress(100, 'Upload completed successfully!');
            
            const finalData = `data: ${JSON.stringify({ 
              success: true, 
              fileId: result.id, 
              fileName: result.name,
              fileLink: `https://drive.google.com/file/d/${result.id}/view?usp=drivesdk`,
              progress: 100 
            })}\n\n`;
            controller.enqueue(encoder.encode(finalData));

          } catch (uploadError) {
            clearInterval(progressTimer);
            clearInterval(progressInterval);
            throw uploadError;
          }
          
        } catch (error: any) {
          console.error('Streaming upload error:', error);
          const errorData = `data: ${JSON.stringify({ 
            error: error.message, 
            progress: 0 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',  
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error setting up streaming upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 