import { NextRequest, NextResponse } from 'next/server';
import { CreateVideoRequestBody, CreateVideoResponse } from '@/types/video-generation';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Shotstack API settings from environment variables
const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY
const SHOTSTACK_ENDPOINT = process.env.SHOTSTACK_ENDPOINT

/**
 * Apply text transformation to SRT content based on textTransform setting
 */
function applyTextTransform(srt: string, textTransform: 'none' | 'uppercase'): string {
  if (textTransform === 'none') {
    return srt; // No transformation
  }

  console.log(`🔄 Applying text transform: ${textTransform}`);
  
  try {
    const lines = srt.split('\n');
    const transformedLines = lines.map(line => {
      const trimmedLine = line.trim();
      
      // Skip index lines (pure numbers)
      if (trimmedLine.match(/^\d+$/)) {
        return line;
      }
      
      // Skip timestamp lines (contains -->)
      if (trimmedLine.includes('-->')) {
        return line;
      }
      
      // Skip empty lines
      if (trimmedLine === '') {
        return line;
      }
      
      // Transform text lines
      switch (textTransform) {
        case 'uppercase':
          return trimmedLine.toUpperCase();
        default:
          return line;
      }
    });
    
    console.log(`✅ Text transform ${textTransform} applied successfully`);
    return transformedLines.join('\n');
    
  } catch (error) {
    console.error('❌ Error applying text transform:', error);
    return srt; // Return original on error
  }
}

/**
 * Process subtitle file (simplified version without file upload)
 */
async function processSubtitleFile(
  subtitlesUrl: string, 
  textTransform: string
): Promise<string> {
  // For now, just return the original URL
  // Text transformation could be handled client-side or in a separate service
  console.log(`📝 Using original subtitles URL: ${subtitlesUrl}`);
  return subtitlesUrl;
}

/**
 * Get audio duration from URL by fetching audio metadata
 * @param audioUrl URL of the audio file
 * @returns Promise<number> duration in seconds, or null if unable to determine
 */
async function getAudioDuration(audioUrl: string): Promise<number | null> {
  try {
    // For now, we'll return a default duration since we don't have ffprobe on the server
    // In a production environment, you'd want to implement proper audio duration detection
    console.log(`Getting audio duration for: ${audioUrl}`)
    return 300; // Default to 5 minutes
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Map font family names to Shotstack-compatible names
    const getShotstackFontFamily = (fontFamily: string): string => {
      const fontMap: Record<string, string> = {
        'Arapey Regular': 'serif', // Fallback to serif
        'Clear Sans': 'sans-serif', // Fallback to sans-serif
        'Didact Gothic': 'Didact Gothic',
        'Montserrat ExtraBold': 'Montserrat',
        'Montserrat SemiBold': 'Montserrat',
        'OpenSans Bold': 'Open Sans',
        'Permanent Marker': 'Permanent Marker',
        'Roboto': 'Roboto',
        'Sue Ellen Francisco': 'cursive', // Fallback to cursive
        'UniNeue': 'sans-serif', // Fallback to sans-serif
        'WorkSans Light': 'Work Sans'
      }
      
      return fontMap[fontFamily] || 'Montserrat'
    }

    // Get the user from the authenticated session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const authenticatedUserId = user.id;
    console.log(`🔐 Authenticated user: ${authenticatedUserId}`);

    const body: CreateVideoRequestBody = await request.json();
    const { 
      imageUrls,
      orderedContentUrls,
      orderedContentTypes,
      audioUrl, 
      compressedAudioUrl,
      audioDuration, 
      subtitlesUrl, 
      thumbnailUrl, 
      segmentTimings,
      selectedMusicTrack,
      selectedMusicTracks,
      customMusicFiles,
      useCustomMusic,
      // Volume controls
      voiceoverVolume,
      musicVolume,
      // Subtitle styling properties
      fontFamily,
      fontSize,
      fontColor,
      fontWeight,
      strokeWidth,
      textTransform,
      // Other properties
      enableOverlay,
      zoomEffect,
      dustOverlay,
      snowOverlay,
      screenDisplacementOverlay,
      fireOverlay
    } = body;
    // Apply defaults for undefined overlay values
    const finalDustOverlay = dustOverlay || false;
    const finalSnowOverlay = snowOverlay || false;
    const finalScreenDisplacementOverlay = screenDisplacementOverlay || false;
    const finalFireOverlay = fireOverlay || false;

    console.log(`✨ Overlay Effects - Dust: ${finalDustOverlay}, Snow: ${finalSnowOverlay}, Screen: ${finalScreenDisplacementOverlay}, Fire: ${finalFireOverlay}`);
    
    // Apply volume defaults if not provided
    const finalVoiceoverVolume = voiceoverVolume ?? 0.8; // Default 80%
    const finalMusicVolume = musicVolume ?? 0.3; // Default 30%
    
    console.log(`🎵 Music Config: ${selectedMusicTracks?.length ? selectedMusicTracks.length + ' tracks in queue' : selectedMusicTrack ? '1 single track' : customMusicFiles?.length ? customMusicFiles.length + ' uploaded files' : 'none'}`);
    console.log(`🔊 Audio Volumes - Voiceover: ${Math.round(finalVoiceoverVolume * 100)}%, Music: ${Math.round(finalMusicVolume * 100)}%`);
   
    // Validate inputs
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json<CreateVideoResponse>({ error: 'Image URLs are required.' }, { status: 400 });
    }
    if (!audioUrl) {
      return NextResponse.json<CreateVideoResponse>({ error: 'Audio URL is required.' }, { status: 400 });
    }

    // Validate segment timings if provided
    if (segmentTimings) {
      if (!Array.isArray(segmentTimings) || segmentTimings.length === 0) {
        return NextResponse.json<CreateVideoResponse>({ error: 'Segment timings must be a non-empty array when provided.' }, { status: 400 });
      }
    }

    // Generate a unique ID for this video
    const videoId = uuidv4();
    console.log(`Starting video creation with ID: ${videoId} for user: ${authenticatedUserId}`);

    // Determine video creation mode and calculate durations
    let totalDuration: number;
    let imageDuration: number;
    let isSegmentedVideo = false;

    if (segmentTimings && segmentTimings.length > 0) {
      // Segmented video: use precise timing from segment timings
      isSegmentedVideo = true;
      totalDuration = segmentTimings.reduce((sum, timing) => sum + timing.duration, 0);
      imageDuration = 0; // Not used for segmented videos
      
      console.log(`Segmented video configuration:
        - Total duration: ${totalDuration.toFixed(2)} seconds
        - Number of segments: ${segmentTimings.length}
        - Individual durations: ${segmentTimings.map(t => t.duration.toFixed(2)).join(', ')}s`);
    } else {
      // Traditional video: use voiceover duration and distribute evenly
      console.log('Using traditional video timing with audio duration...');

      const audioDurationValue = audioDuration || await getAudioDuration(audioUrl);
      totalDuration = audioDurationValue || 300;

      // Calculate image duration based on total content count
      const totalContentCount = orderedContentUrls ? orderedContentUrls.length : imageUrls.length;
      imageDuration = totalContentCount > 0 ? totalDuration / totalContentCount : 0;

      console.log(`Traditional video configuration:
        - Total duration (voiceover): ${totalDuration.toFixed(1)} seconds
        - Total content items: ${totalContentCount}
        - Per-item duration: ${imageDuration.toFixed(2)} seconds`);
    }
    
    // Initialize tracks array
    let tracks = [];

    // Track for dust overlay (if dustOverlay is enabled)
    if (finalDustOverlay) {
        const overlayDuration = 19; // Each overlay video is 19 seconds long
        const dustOverlayUrl = 'https://byktarizdjtreqwudqmv.supabase.co/storage/v1/object/public/video-generator/overlay.webm';
        
        // Calculate how many clips needed to cover total duration
        const numClips = Math.ceil(totalDuration / overlayDuration);
        console.log(`✨ Adding dust particles overlay: ${numClips} clips to cover ${totalDuration}s`);
        
        const dustClips = [];
        for (let i = 0; i < numClips; i++) {
            const startTime = i * overlayDuration;
            const remainingDuration = totalDuration - startTime;
            const clipLength = Math.min(overlayDuration, remainingDuration);
            
            if (clipLength > 0) {
                dustClips.push({
                    asset: {
                        type: 'video',
                        src: dustOverlayUrl,
                        volume: 0
                    },
                    start: startTime,
                    length: clipLength,
                    fit: 'cover',
                    opacity: 0.15
                });
            }
        }
        
        const overlayTrack = { clips: dustClips };
        tracks.push(overlayTrack);
    }

    // Track for snow overlay (if snowOverlay is enabled)
    if (finalSnowOverlay) {
        const overlayDuration = 19; // Each overlay video is 19 seconds long
        const snowOverlayUrl = 'https://byktarizdjtreqwudqmv.supabase.co/storage/v1/object/public/video-generator/overlays/snow-falling-2023-11-27-04-51-47-utc.webm';
        
        // Calculate how many clips needed to cover total duration
        const numClips = Math.ceil(totalDuration / overlayDuration);
        console.log(`❄️ Adding snow effect overlay: ${numClips} clips to cover ${totalDuration}s`);
        
        const snowClips = [];
        for (let i = 0; i < numClips; i++) {
            const startTime = i * overlayDuration;
            const remainingDuration = totalDuration - startTime;
            const clipLength = Math.min(overlayDuration, remainingDuration);
            
            if (clipLength > 0) {
                snowClips.push({
                    asset: {
                        type: 'video',
                        src: snowOverlayUrl,
                        volume: 0
                    },
                    start: startTime,
                    length: clipLength,
                    fit: 'cover',
                    opacity: 0.2
                });
            }
        }
        
        const snowOverlayTrack = { clips: snowClips };
        tracks.push(snowOverlayTrack);
    }

    // Track for screen displacement overlay (if screenDisplacementOverlay is enabled)
    if (finalScreenDisplacementOverlay) {
        const overlayDuration = 19; // Each overlay video is 19 seconds long
        const screenDisplacementOverlayUrl = 'https://byktarizdjtreqwudqmv.supabase.co/storage/v1/object/public/video-generator/overlays/screen-displacement-map-glitch-effect-digital-pixe-2024-07-17-05-42-56-utc.webm';
        
        // Calculate how many clips needed to cover total duration
        const numClips = Math.ceil(totalDuration / overlayDuration);
        console.log(`📺 Adding screen displacement overlay: ${numClips} clips to cover ${totalDuration}s`);
        
        const screenClips = [];
        for (let i = 0; i < numClips; i++) {
            const startTime = i * overlayDuration;
            const remainingDuration = totalDuration - startTime;
            const clipLength = Math.min(overlayDuration, remainingDuration);
            
            if (clipLength > 0) {
                screenClips.push({
                    asset: {
                        type: 'video',
                        src: screenDisplacementOverlayUrl,
                        volume: 0
                    },
                    start: startTime,
                    length: clipLength,
                    fit: 'cover',
                    opacity: 0.25
                });
            }
        }
        
        const screenDisplacementOverlayTrack = { clips: screenClips };
        tracks.push(screenDisplacementOverlayTrack);
    }

    // Track for fire overlay (if fireOverlay is enabled)
    if (finalFireOverlay) {
        const overlayDuration = 19; // Each overlay video is 19 seconds long
        const fireOverlayUrl = 'https://byktarizdjtreqwudqmv.supabase.co/storage/v1/object/public/video-generator/overlays/Fire%20Particles%20Overlay.webm';
        
        // Calculate how many clips needed to cover total duration
        const numClips = Math.ceil(totalDuration / overlayDuration);
        console.log(`🔥 Adding fire effect overlay: ${numClips} clips to cover ${totalDuration}s`);
        
        const fireClips = [];
        for (let i = 0; i < numClips; i++) {
            const startTime = i * overlayDuration;
            const remainingDuration = totalDuration - startTime;
            const clipLength = Math.min(overlayDuration, remainingDuration);
            
            if (clipLength > 0) {
                fireClips.push({
                    asset: {
                        type: 'video',
                        src: fireOverlayUrl,
                        volume: 0
                    },
                    start: startTime,
                    length: clipLength,
                    fit: 'cover',
                    opacity: 0.3
                });
            }
        }
        
        const fireOverlayTrack = { clips: fireClips };
        tracks.push(fireOverlayTrack);
    }

    // Track for subtitles (captions) - Add after overlay if it exists
    if (subtitlesUrl) {
      console.log(`Adding subtitles to video: ${subtitlesUrl}`);
      const transformedSubtitlesUrl = await processSubtitleFile(subtitlesUrl, textTransform || 'uppercase');
      const resolvedFontColor = fontColor || '#ffffff';
      console.log(`🎨 Resolved font color for Shotstack: ${resolvedFontColor}`);
      
      const captionTrack = {
        clips: [
          {
            asset: {
              type: "caption",
              src: transformedSubtitlesUrl,
              font: {
                family: getShotstackFontFamily(fontFamily || 'Montserrat ExtraBold'),
                size: fontSize || 24,
                color: resolvedFontColor,
                weight: fontWeight || '700',
                stroke: "#000000",
                strokeWidth: strokeWidth || 2
              },
              background: {
                color: "#ffffff",
                opacity: 0,
                padding: 12,
              },
              // Default margin positioning
              margin: {
                top: 0.75,
                left: 0,
                right: 0
              }
            },
            start: 0,
            length: totalDuration
          }
        ]
      };
      tracks.push(captionTrack);
    }

    // Track for media content - Create slideshow with timing based on mode
    if (isSegmentedVideo && segmentTimings) {
      // Segmented video: use precise timing
      console.log(`🎬 Creating segmented video with ${imageUrls.length} precisely timed media assets:`);
      let currentTime = 0;
      const mediaClips = imageUrls.map((url, index) => {
        const duration = segmentTimings[index].duration;
        const assetType = orderedContentTypes && orderedContentTypes[index] ? orderedContentTypes[index] : 'image';
        const startTime = currentTime;
        
        console.log(`   Segment ${index + 1}: ${duration.toFixed(2)}s at ${startTime.toFixed(2)}s (${assetType})`);
        
        const clip = {
          asset: {
            type: assetType === 'animation' ? 'image' : assetType, // Map animation to image
            src: url
          },
          start: startTime,
          length: duration,
          fit: "cover",
          ...(zoomEffect && (assetType === 'image' || assetType === 'animation') && { effect: index % 2 === 0 ? "zoomIn" : "zoomOut" })
        };
        
        currentTime += duration;
        return clip;
      });

      const mediaTrack = {
        clips: mediaClips
      };
      tracks.push(mediaTrack);
    } else {
      // Traditional video: equal timing for all media assets
      const urlsToProcess = orderedContentUrls || imageUrls;
      const typesToProcess = orderedContentTypes || imageUrls.map(() => 'image');
      
      console.log(`🎬 Creating traditional slideshow with ${urlsToProcess.length} media assets:`);
      let runningTime = 0;
      const mediaClips = urlsToProcess.map((url, index) => {
        const assetType = typesToProcess[index] || 'image';
        const startTime = runningTime;
        runningTime += imageDuration;
        
        console.log(`   Asset ${index + 1}: ${assetType} display, ${imageDuration.toFixed(2)}s at ${startTime.toFixed(2)}s`);
        
        return {
          asset: {
            type: assetType === 'animation' ? 'image' : assetType, // Map animation to image
            src: url
          },
          start: startTime,
          length: imageDuration,
          fit: "cover",
          ...(zoomEffect && (assetType === 'image' || assetType === 'animation') && { effect: index % 2 === 0 ? "zoomIn" : "zoomOut" })
        };
      });

      const mediaTrack = {
        clips: mediaClips
      };
      tracks.push(mediaTrack);
    }

    // Track for main audio (voiceover) - Always add if audioUrl is present
    const audioUrlToUse = audioUrl || compressedAudioUrl;
    if (audioUrlToUse) {
        console.log(`🎤 Adding primary voiceover audio: ${audioUrl ? 'original' : 'compressed'} - ${audioUrlToUse}`);
        
        const voiceoverTrack = {
            clips: [{
                asset: {
                    type: "audio",
                    src: audioUrlToUse,
                    volume: finalVoiceoverVolume // User-controlled voiceover volume
                },
                start: 0,
                length: totalDuration
            }]
        };
        tracks.push(voiceoverTrack);
    } else {
        console.warn('⚠️ No voiceover audio URL provided for video generation');
    }

    // Track for background music (if useCustomMusic is enabled)
      
    if (useCustomMusic && (selectedMusicTracks?.length || selectedMusicTrack || (customMusicFiles && customMusicFiles.length > 0))) {
        console.log(`🎶 Adding background music: ${selectedMusicTracks?.length ? selectedMusicTracks.length + ' selected tracks' : selectedMusicTrack ? 'Single search result' : (customMusicFiles?.length || 0) + ' uploaded file(s)'}`);
        
        if (selectedMusicTracks && selectedMusicTracks.length > 0) {
            // Use multiple selected tracks in sequence
            console.log(`🎵 Creating background music sequence from ${selectedMusicTracks.length} selected tracks`);
            
            // Validate that tracks have required properties
            const validTracks = selectedMusicTracks.filter(track => track.preview_url && track.title);
            if (validTracks.length === 0) {
                console.warn('⚠️ No valid tracks found in selectedMusicTracks - tracks missing preview_url or title');
                return;
            }
            console.log(`🎵 Valid tracks found: ${validTracks.length}/${selectedMusicTracks.length}`);
            
            const musicClips = [];
            let currentTime = 0;
            let trackIndex = 0;
            
            // Sort tracks by order to ensure correct sequence
            const sortedTracks = [...validTracks].sort((a, b) => (a.order || 0) - (b.order || 0));
            
            while (currentTime < totalDuration) {
                for (const track of sortedTracks) {
                    if (currentTime >= totalDuration) break;
                    
                    const trackDuration = track.duration || 30; // Default to 30s if duration not available
                    const clipDuration = Math.min(trackDuration, totalDuration - currentTime);
                    
                    if (clipDuration > 0) {
                        musicClips.push({
                            asset: {
                                type: "audio",
                                src: track.preview_url,
                                volume: finalMusicVolume // User-controlled music volume
                            },
                            start: currentTime,
                            length: clipDuration
                        });
                        
                        console.log(`   Adding track #${track.order || (trackIndex + 1)}: "${track.title}" by ${track.artist} - ${clipDuration.toFixed(1)}s at ${currentTime.toFixed(1)}s`);
                        currentTime += clipDuration;
                        trackIndex++;
                    }
                }
            }
            
            const musicTrack = {
                clips: musicClips
            };
            tracks.push(musicTrack);
            
        } else if (selectedMusicTrack) {
            // Use selected track from search results as background music
            console.log(`🔍 Adding background music track: ${selectedMusicTrack.title} by ${selectedMusicTrack.artist}`);
            
            // Calculate how many times we need to repeat the track to cover total duration
            const trackDuration = selectedMusicTrack.duration || 30; // Default to 30s if duration not available
            const loopCount = Math.ceil(totalDuration / trackDuration);
            
            console.log(`🔄 Creating ${loopCount} background music clips to loop ${trackDuration}s track over ${totalDuration}s total duration`);
            
            const musicClips = [];
            for (let i = 0; i < loopCount; i++) {
                const startTime = i * trackDuration;
                const remainingDuration = totalDuration - startTime;
                const clipLength = Math.min(trackDuration, remainingDuration);
                
                if (clipLength > 0) {
                    musicClips.push({
                        asset: {
                            type: "audio",
                            src: selectedMusicTrack.preview_url,
                            volume: finalMusicVolume // User-controlled music volume
                        },
                        start: startTime,
                        length: clipLength
                    });
                }
            }
            
            const musicTrack = {
                clips: musicClips
            };
            tracks.push(musicTrack);
        } else if (customMusicFiles && customMusicFiles.length > 0) {
            // Handle custom music files
            console.log(`🎵 Creating background music sequence from ${customMusicFiles.length} music files`);
            
            const musicClips = [];
            let currentTime = 0;
            let sequenceIndex = 0;
            
            while (currentTime < totalDuration) {
                for (const musicFile of customMusicFiles) {
                    if (currentTime >= totalDuration) break;
                    
                    const fileDuration = musicFile.duration || 30;
                    const clipDuration = Math.min(fileDuration, totalDuration - currentTime);
                    
                    musicClips.push({
                        asset: {
                            type: "audio",
                            src: musicFile.url,
                            volume: finalMusicVolume // User-controlled music volume
                        },
                        start: currentTime,
                        length: clipDuration
                    });
                    
                    console.log(`   Adding background music ${musicFile.name}: ${clipDuration.toFixed(1)}s at ${currentTime.toFixed(1)}s`);
                    currentTime += clipDuration;
                }
                sequenceIndex++;
            }
            
            const musicTrack = {
                clips: musicClips
            };
            tracks.push(musicTrack);
        }
    } else {
        console.log('🔇 No background music selected - using voiceover only');
    }


    
    // Log the track structure for debugging
    // console.log('📊 Final track structure:');
    // tracks.forEach((track, index) => {
    //   const assetType = track.clips[0]?.asset?.type || 'unknown';
    //   console.log(`  Track ${index}: ${assetType}`);
    // });

    const timeline: any = {
      tracks: tracks
    };

    const shotstackPayload = {
      timeline: timeline,
      output: {
        format: "mp4",
        size: {
          width: 1280,
          height: 720
        }
      },
      callback: process.env.SHOTSTACK_CALLBACK_URL
    };

    // Write payload to JSON file for debugging
    try {
      const payloadFileName = `shotstack-payload-${videoId}-${Date.now()}.json`;
      const payloadPath = join(process.cwd(), 'debug', payloadFileName);
      
      // Create debug directory if it doesn't exist
      const debugDir = join(process.cwd(), 'debug');
      try {
        const fs = require('fs');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
      } catch (dirError) {
        console.warn('Could not create debug directory:', dirError);
      }
      
      // Write the payload with pretty formatting
      const formattedPayload = {
        metadata: {
          videoId: videoId,
          timestamp: new Date().toISOString(),
          videoType: isSegmentedVideo ? 'Segmented' : 'Traditional',
          totalDuration: totalDuration,
          imageCount: imageUrls.length,
          hasAudio: !!audioUrl,
          hasSubtitles: !!subtitlesUrl,
          hasMusic: useCustomMusic,
          selectedMusicTrack: selectedMusicTrack ? selectedMusicTrack.title : 'None',
          customMusicFiles: customMusicFiles?.length || 0,
          dustOverlay: dustOverlay
        },
        payload: shotstackPayload
      };
      
      writeFileSync(payloadPath, JSON.stringify(formattedPayload, null, 2));
      console.log(`📄 Shotstack payload saved to: ${payloadPath}`);
    } catch (writeError) {
      console.warn('Could not write payload to file:', writeError);
    }

    console.log(JSON.stringify(shotstackPayload, null, 2));

    console.log("📤 Sending Shotstack API request with payload summary:");
    console.log(`- Video type: ${isSegmentedVideo ? 'Segmented' : 'Traditional'}`);
    console.log(`- Total tracks: ${tracks.length}`);
    console.log(`- Media assets: ${imageUrls.length}`);
    console.log(`- Audio: ${audioUrl ? 'YES' : 'NO'}`);
    console.log(`- Background Music: ${useCustomMusic ? 'YES' : 'NO'}`);
    console.log(`- Selected Music Track: ${selectedMusicTrack ? 'YES' : 'NO'}`);
    console.log(`- Custom Music Files: ${customMusicFiles?.length || 0}`);
    console.log(`- Dust Overlay: ${dustOverlay ? 'YES' : 'NO'}`);
    console.log(`- Zoom Effect: ${zoomEffect ? 'YES' : 'NO'}`);
    console.log(`- Subtitles: ${subtitlesUrl ? 'YES' : 'NO'}`);
    console.log(`- Font Color: ${fontColor || '#ffffff'}`);
    console.log(`- Total duration: ${totalDuration.toFixed(2)}s`);
    
    // Make Shotstack API call BEFORE creating database record
    const shotstackResponse = await fetch(`${SHOTSTACK_ENDPOINT}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SHOTSTACK_API_KEY || ''
      },
      body: JSON.stringify(shotstackPayload),
    });

    // If Shotstack returns an error, return it directly to user without saving any record
    if (!shotstackResponse.ok) {
      const errorData = await shotstackResponse.json();
      console.error('Shotstack API error:', errorData);
      
      return NextResponse.json<CreateVideoResponse>(
        { 
          error: 'Failed to create video with Shotstack API', 
          details: errorData.message || JSON.stringify(errorData) 
        },
        { status: shotstackResponse.status }
      );
    }

    const responseData = await shotstackResponse.json();
    const shotstackId = responseData.response.id;
    console.log("Response from Shotstack API:", responseData);
    console.log("Shotstack ID:", shotstackId);

    // Only create database record AFTER Shotstack successfully accepts the job
    
    // Prepare metadata for segmented videos
    const metadata = isSegmentedVideo && segmentTimings ? {
      type: 'segmented',
      segment_timings: segmentTimings,
      total_duration: totalDuration,
      scenes_count: imageUrls.length
    } : null;
    
    const { error: dbError } = await supabase
      .from('video_records')
      .insert({
        id: videoId,
        user_id: authenticatedUserId,
        status: 'processing',
        shotstack_id: shotstackId,
        image_urls: imageUrls,
        audio_url: audioUrl,
        subtitles_url: subtitlesUrl,
        // Use provided thumbnail URL if available, otherwise fall back to first image
        thumbnail_url: thumbnailUrl || imageUrls[0],
        // Store metadata in error_message field for segmented videos (temporary solution)
        error_message: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error creating video record in database:', dbError);
      return NextResponse.json<CreateVideoResponse>(
        { error: 'Failed to create video record.', details: dbError.message },
        { status: 500 }
      );
    }

    console.log(`✅ ${isSegmentedVideo ? 'Segmented' : 'Traditional'} video record created successfully with Shotstack ID: ${shotstackId}`);

    // Return success response with video ID and shotstack ID
    return NextResponse.json<CreateVideoResponse>({
      message: `${isSegmentedVideo ? 'Segmented' : 'Traditional'} video creation job started successfully`,
      video_id: videoId,
      shotstack_id: shotstackId
    }, { status: 202 });

  } catch (error: any) {
    console.error('Error in /api/create-video route:', error);
    return NextResponse.json<CreateVideoResponse>(
      { error: 'Failed to process video creation request', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';