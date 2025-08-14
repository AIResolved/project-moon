import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fsPromises from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import os from 'os';
import path from 'path';
import { uploadFileToSupabase } from "@/lib/wellsaid-utils";
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateSubtitlesRequestBody {
    audioUrl: string;
    userId?: string;
}

// Comprehensive SRT reformatting utility
function reformatSrtContent(srt: string): string {
    console.log("🔄 Starting SRT reformatting with 4-word segments...")
    
    try {
        const lines = srt.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        const subtitles: Array<{
            index: number
            startTime: string
            endTime: string
            text: string
        }> = []
        
        // Parse existing SRT format
        let i = 0
        while (i < lines.length) {
            const indexLine = lines[i]
            if (!indexLine || !indexLine.match(/^\d+$/)) {
                i++
                continue
            }
            
            const timingLine = lines[i + 1]
            const textLines: string[] = []
            
            // Collect all text lines for this subtitle
            let j = i + 2
            while (j < lines.length && !lines[j].match(/^\d+$/)) {
                if (lines[j].includes('-->')) {
                    j++
                    continue
                }
                textLines.push(lines[j])
                j++
            }
            
            if (timingLine && timingLine.includes('-->')) {
                const [startTime, endTime] = timingLine.split(' --> ')
                const text = textLines.join(' ').trim().toUpperCase()
                
                if (text) {
                    subtitles.push({
                        index: parseInt(indexLine),
                        startTime: startTime.trim(),
                        endTime: endTime.trim(),
                        text
                    })
                }
            }
            
            i = j
        }
        
        console.log(`📊 Parsed ${subtitles.length} original subtitle segments`)
        
        // Split into 4-word segments with distributed timing
        const reformattedSubtitles: Array<{
            index: number
            startTime: string
            endTime: string
            text: string
        }> = []
        
        let newIndex = 1
        
        for (const subtitle of subtitles) {
            const words = subtitle.text.split(/\s+/).filter(word => word.length > 0)
            
            if (words.length <= 4) {
                // Keep as is if 4 words or fewer
                reformattedSubtitles.push({
                    ...subtitle,
                    index: newIndex++
                })
            } else {
                // Split into segments of max 4 words
                const segments: string[] = []
                for (let i = 0; i < words.length; i += 4) {
                    segments.push(words.slice(i, i + 4).join(' '))
                }
                
                // Calculate timing for each segment
                const totalDurationMs = timeToMs(subtitle.endTime) - timeToMs(subtitle.startTime)
                const segmentDurationMs = Math.floor(totalDurationMs / segments.length)
                
                for (let i = 0; i < segments.length; i++) {
                    const segmentStartMs = timeToMs(subtitle.startTime) + (i * segmentDurationMs)
                    const segmentEndMs = i === segments.length - 1 
                        ? timeToMs(subtitle.endTime) // Last segment gets the exact end time
                        : segmentStartMs + segmentDurationMs
                    
                    reformattedSubtitles.push({
                        index: newIndex++,
                        startTime: msToTime(segmentStartMs),
                        endTime: msToTime(segmentEndMs),
                        text: segments[i]
                    })
                }
            }
        }
        
        console.log(`✅ Reformatted into ${reformattedSubtitles.length} segments (4 words max each)`)
        
        // Generate new SRT content
        const reformattedSrt = reformattedSubtitles
            .map(sub => `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`)
            .join('\n')
        
        return reformattedSrt
        
    } catch (error) {
        console.error('❌ Error reformatting SRT:', error)
        // Fallback to simple cleanup if parsing fails
        return srt
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n') + '\n'
    }
}

// Helper function to convert SRT time format to milliseconds
function timeToMs(timeStr: string): number {
    // Format: HH:MM:SS,mmm
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
    if (!match) {
        console.warn(`⚠️ Invalid time format: ${timeStr}`)
        return 0
    }
    
    const hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const seconds = parseInt(match[3])
    const milliseconds = parseInt(match[4])
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds
}

// Helper function to convert milliseconds to SRT time format
function msToTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const milliseconds = ms % 1000
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { audioUrl, userId = "unknown_user" } = body as GenerateSubtitlesRequestBody;

    if (!audioUrl) {
        return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key is not configured.");
        return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }
    
    const tempDir = path.join(os.tmpdir(), 'audio_downloads_srt');
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    let extension = '.tmp';
    try {
        const urlPath = new URL(audioUrl).pathname;
        const ext = path.extname(urlPath);
        if (ext) extension = ext;
    } catch (e) {
        console.warn('Could not parse audio URL for extension, using .tmp: ' + audioUrl);
    }
    const tempFileName = uuidv4() + extension;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
        console.log("🔤 Downloading audio from: " + audioUrl + " to " + tempFilePath);
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok || !audioResponse.body) {
            throw new Error("Failed to download audio file: " + audioResponse.statusText);
        }
        
        // Stream download to temporary file
        const fileStream = createWriteStream(tempFilePath);
        const reader = audioResponse.body.getReader();
        
        await new Promise<void>((resolve, reject) => {
            fileStream.on('open', async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) fileStream.write(value);
                    }
                    fileStream.end();
                } catch (streamError) {
                    reject(streamError);
                }
            });
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });
        
        console.log("📥 Audio downloaded successfully. Generating subtitles with Whisper...");

        const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempFilePath),
            model: "whisper-1",
            response_format: "srt",
        });
        
        const rawSrt = transcription as unknown as string; 
        
        if (typeof rawSrt !== 'string' || rawSrt.trim() === '') {
            console.error("OpenAI Whisper did not return a valid non-empty SRT string.");
            throw new Error('Failed to generate valid SRT data from OpenAI.');
        }
        
        console.log("🔤 Raw SRT generated. Reformatting...");
        const reformattedSrt = reformatSrtContent(rawSrt);
        console.log("☁️ SRT reformatted. Uploading to Supabase...");

        const srtFileName = 'subtitles_' + Date.now() + '.srt';
        const destinationPath = 'subtitles/' + srtFileName;
        
        // Convert string to buffer for upload
        const srtBuffer = Buffer.from(reformattedSrt, 'utf-8');
        
        // Create temporary file for upload
        const tempSrtPath = path.join(tempDir, srtFileName);
        await fsPromises.writeFile(tempSrtPath, srtBuffer);

        const supabaseUrl = await uploadFileToSupabase(
            tempSrtPath,
            destinationPath,
            'text/srt'
        );

        if (!supabaseUrl) {
            throw new Error("Failed to upload reformatted SRT to Supabase.");
        }

        // Clean up temporary SRT file
        await fsPromises.unlink(tempSrtPath);

        console.log("✅ Subtitles generated and uploaded: " + supabaseUrl);
        return NextResponse.json({ 
            success: true,
            subtitlesUrl: supabaseUrl,
            message: "Subtitles generated successfully"
        });

    } catch (error: any) {
        console.error("❌ Error generating subtitles: " + error.message + (error.stack ? " Stack: " + error.stack : ""));
        return NextResponse.json({ error: error.message || "Failed to generate subtitles" }, { status: 500 });
    } finally {
        try {
            await fsPromises.unlink(tempFilePath);
            console.log("🧹 Cleaned up temporary audio file: " + tempFilePath);
        } catch (cleanupError: any) {
            if (cleanupError.code !== 'ENOENT') {
                 console.warn("⚠️ Failed to clean up temporary audio file " + tempFilePath + ": " + cleanupError.message);
            }
        }
    }
} 