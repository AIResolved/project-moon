import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToSupabase } from '@/lib/wellsaid-utils'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

interface AudioChunk {
  chunkIndex: number
  localFilePath: string
  text: string
  duration: number
}

export async function POST(request: NextRequest) {
  try {
    const { audioChunks, userId = 'unknown_user', generateSubtitles = false, sessionId } = await request.json()

    if (!audioChunks || !Array.isArray(audioChunks) || audioChunks.length === 0) {
      return NextResponse.json(
        { error: 'Audio chunks are required for concatenation' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required for chunk management' },
        { status: 400 }
      )
    }

    console.log(`🔗 Starting audio concatenation for ${audioChunks.length} chunks`)
    console.log(`📊 Total expected duration: ${audioChunks.reduce((sum: number, chunk: AudioChunk) => sum + chunk.duration, 0).toFixed(2)}s`)

    const tempDir = path.join(os.tmpdir(), 'wellsaid-audio', sessionId)

    try {
      // Verify all chunk files exist locally
      console.log(`✅ Verifying ${audioChunks.length} local audio chunks`)
      
      for (let i = 0; i < audioChunks.length; i++) {
        const chunk = audioChunks[i]
        console.log(`✅ [Chunk ${i + 1}/${audioChunks.length}] Verifying: ${chunk.localFilePath}`)

        try {
          await fs.access(chunk.localFilePath)
          console.log(`✅ [Chunk ${i + 1}] File exists: ${chunk.localFilePath}`)
        } catch (error) {
          throw new Error(`Audio chunk file not found: ${chunk.localFilePath}`)
        }
      }

      // Create ffmpeg concat file
      console.log(`📝 Creating ffmpeg concat file`)
      const concatFileName = `concat-final-${Date.now()}.txt`
      const concatFilePath = path.join(tempDir, concatFileName)
      
      // Sort chunks by index to ensure correct order
      const sortedChunks = audioChunks.sort((a: AudioChunk, b: AudioChunk) => a.chunkIndex - b.chunkIndex)
      
      const concatContent = sortedChunks.map((chunk: AudioChunk) => `file '${chunk.localFilePath}'`).join('\n')
      await fs.writeFile(concatFilePath, concatContent)
      
      console.log(`📝 Concat file created with ${sortedChunks.length} entries`)

      // Run ffmpeg concatenation
      const finalFileName = `wellsaid-final-${Date.now()}.mp3`
      const finalFilePath = path.join(tempDir, finalFileName)
      
      const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${finalFilePath}"`
      console.log(`🎬 Running ffmpeg concatenation: ${ffmpegCommand}`)
      
      await execAsync(ffmpegCommand)
      
      console.log(`✅ Audio concatenation completed: ${finalFilePath}`)

      // Get duration of final audio using ffprobe
      console.log(`⏱️ Getting final audio duration`)
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalFilePath}"`)
      const finalDuration = parseFloat(stdout.trim())
      
      if (isNaN(finalDuration) || finalDuration <= 0) {
        throw new Error(`Invalid final duration detected: ${stdout.trim()}`)
      }
      
      console.log(`✅ Final audio duration: ${finalDuration.toFixed(2)}s`)

      // Upload final audio to Supabase
      console.log(`☁️ Uploading final audio to Supabase`)
      const finalSupabaseDestination = `audio/final/${Date.now()}-${finalFileName}`
      const finalPublicUrl = await uploadFileToSupabase(
        finalFilePath,
        finalSupabaseDestination,
        'audio/mpeg'
      )
      
      if (!finalPublicUrl) {
        throw new Error('Failed to upload final audio to storage')
      }
      
      console.log(`☁️ Final audio uploaded: ${finalPublicUrl}`)

      // Start transcription if requested
      let transcriptionJobId: string | undefined

      if (generateSubtitles) {
        try {
          console.log(`🔤 Starting transcription for subtitles generation`)
          
          const transcriptionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/start-transcription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl: finalPublicUrl,
              userId: userId
            })
          })
          
          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json()
            if (transcriptionData.transcriptionJobId) {
              transcriptionJobId = transcriptionData.transcriptionJobId
              console.log(`✅ Transcription job started: ${transcriptionJobId}`)
            }
          } else {
            console.warn(`⚠️ Failed to start transcription, continuing without subtitles`)
          }
        } catch (transcriptionError) {
          console.warn(`⚠️ Transcription error, continuing without subtitles:`, transcriptionError)
        }
      }

      // Clean up all temporary files and directories
      console.log(`🧹 Cleaning up temporary files`)
      
      try {
        // Clean up individual chunk files
        for (const chunk of sortedChunks) {
          try {
            await fs.unlink(chunk.localFilePath)
            console.log(`🧹 Cleaned up chunk: ${chunk.localFilePath}`)
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to clean up chunk ${chunk.localFilePath}:`, cleanupError)
          }
        }
        
        // Clean up concat file
        await fs.unlink(concatFilePath)
        console.log(`🧹 Cleaned up concat file: ${concatFilePath}`)
        
        // Clean up final file
        await fs.unlink(finalFilePath)
        console.log(`🧹 Cleaned up final temp file: ${finalFilePath}`)
        
        // Try to remove the session directory if empty
        try {
          await fs.rmdir(tempDir)
          console.log(`🧹 Cleaned up session directory: ${tempDir}`)
        } catch (error) {
          // Directory might not be empty or already removed, that's okay
          console.log(`📁 Session directory not empty or already removed: ${tempDir}`)
        }
        
      } catch (cleanupError) {
        console.warn(`⚠️ Some cleanup operations failed:`, cleanupError)
      }

      console.log(`🎉 Audio concatenation completed successfully!`)

      return NextResponse.json({
        success: true,
        finalAudioUrl: finalPublicUrl,
        transcriptionJobId: transcriptionJobId,
        finalDuration: finalDuration,
        chunksProcessed: audioChunks.length,
        message: `Successfully concatenated ${audioChunks.length} audio chunks and cleaned up temporary files`
      })

    } catch (error: any) {
      console.error(`❌ Error during audio concatenation:`, error)
      
      // Clean up any temporary files that might exist
      try {
        for (const chunk of audioChunks) {
          try {
            await fs.unlink(chunk.localFilePath)
          } catch (cleanupError) {
            // File might not exist, that's okay
          }
        }
        
        // Try to clean up session directory
        try {
          const files = await fs.readdir(tempDir)
          for (const file of files) {
            await fs.unlink(path.join(tempDir, file))
          }
          await fs.rmdir(tempDir)
        } catch (cleanupError) {
          // Directory cleanup failed, that's okay
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Error cleanup failed:`, cleanupError)
      }
      
      return NextResponse.json(
        { error: `Failed to concatenate audio chunks: ${error.message}` },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in audio concatenation:', error)
    return NextResponse.json(
      { error: 'Internal server error during audio concatenation' },
      { status: 500 }
    )
  }
} 