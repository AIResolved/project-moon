import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VideoRecord } from '@/types/video-generation';

// Shotstack API settings from environment variables
const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY
const SHOTSTACK_ENDPOINT = process.env.SHOTSTACK_ENDPOINT

if (!SHOTSTACK_API_KEY || !SHOTSTACK_ENDPOINT) {
  throw new Error('SHOTSTACK_API_KEY and SHOTSTACK_ENDPOINT must be set');
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required.' }, { status: 400 });
    }

    console.log(`🔍 Checking video status for ID: ${videoId}`);

    const supabase = await createClient();
    
    // First, get the video record from database to get shotstack_id
    const { data: videoRecord, error: fetchError } = await supabase
      .from('video_records')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !videoRecord) {
      console.error('Error fetching video record:', fetchError);
      return NextResponse.json(
        { error: 'Video record not found.', details: fetchError?.message },
        { status: 404 }
      );
    }

    const shotstackId = videoRecord.shotstack_id;
    console.log(`📋 Found Shotstack ID: ${shotstackId} for video: ${videoId}`);

    // Call Shotstack API to get the render status
    const response = await fetch(`${SHOTSTACK_ENDPOINT}/render/${shotstackId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SHOTSTACK_API_KEY || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Shotstack API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Shotstack status for render ${shotstackId}:`, data.response.status);

    let newStatus = "processing";
    let videoUrl = null;
    let errorMessage = null;

    // Map Shotstack status to our status
    if (data.response.status === "done" || data.response.status === "processed") {
      newStatus = "completed";
      videoUrl = data.response.url;
      console.log(`✅ Video completed! URL: ${videoUrl}`);
    } else if (data.response.status === "failed") {
      newStatus = "failed";
      errorMessage = data.response.data?.message || 'Video rendering failed on Shotstack';
      console.log(`❌ Video failed: ${errorMessage}`);
    } else {
      console.log(`🔄 Video still processing. Shotstack status: ${data.response.status}`);
    }

    // Update the database record if status changed
    if (newStatus !== videoRecord.status) {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (videoUrl) {
        updateData.final_video_url = videoUrl;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error: updateError } = await supabase
        .from('video_records')
        .update(updateData)
        .eq('id', videoId);

      if (updateError) {
        console.error('Error updating video record:', updateError);
        return NextResponse.json(
          { error: 'Failed to update video record.', details: updateError.message },
          { status: 500 }
        );
      }

      console.log(`✅ Updated video ${videoId} status from ${videoRecord.status} to ${newStatus}`);
    }

    // Transform database record to VideoRecord format for response
    const updatedRecord: VideoRecord = {
      id: videoRecord.id,
      user_id: videoRecord.user_id,
      status: newStatus as VideoRecord['status'],
      shotstack_id: videoRecord.shotstack_id,
      image_urls: videoRecord.image_urls,
      audio_url: videoRecord.audio_url,
      compressed_audio_url: videoRecord.compressed_audio_url || undefined,
      subtitles_url: videoRecord.subtitles_url || undefined,
      final_video_url: videoUrl || videoRecord.final_video_url || undefined,
      thumbnail_url: videoRecord.thumbnail_url,
      error_message: errorMessage || videoRecord.error_message || undefined,
      created_at: videoRecord.created_at,
      updated_at: new Date().toISOString(),
      // Parse metadata from error_message field if it exists and looks like JSON
      metadata: (() => {
        try {
          if (videoRecord.error_message && videoRecord.error_message.startsWith('{')) {
            return JSON.parse(videoRecord.error_message);
          }
          return undefined;
        } catch {
          return undefined;
        }
      })()
    };

    return NextResponse.json({
      video: updatedRecord,
      statusChanged: newStatus !== videoRecord.status,
      shotstackStatus: data.response.status
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/check-video-status route:', error);
    return NextResponse.json(
      { error: 'Failed to check video status', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 