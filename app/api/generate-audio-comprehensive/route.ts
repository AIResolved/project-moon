"use server";

import { NextResponse } from "next/server";
import { OpenAI } from 'openai';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { uploadFileToSupabase } from "@/lib/wellsaid-utils";
import { v4 as uuidv4 } from 'uuid';
import { synthesizeGoogleTts } from "@/utils/google-tts-utils";

// Constants
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY || "4239d52824be4f088a406121777bb1ba";
const FISH_AUDIO_MODEL_DEFAULT = process.env.FISH_AUDIO_MODEL || "speech-1.6";

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenlabs = elevenLabsApiKey ? new ElevenLabsClient({ apiKey: elevenLabsApiKey }) : null;

const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || "1905235425920819721";
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJMRcODTyBDVVJJT1NPIiwiVXNlck5hbWUiOiJMRcODTyBDVVJJT1NPIiwiQWNjb3VudCI6IiIsIlN1YmplY3RJRCI6IjE5MDUyMzU0MjU5MjkyMDgzMjkiLCJQaG9uZSI6IiIsIkdyb3VwSUQiOiIxOTA1MjM1NDI1OTIwODE5NzIxIiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoiMTB0b3Bkb211bmRvQGdtYWlsLmNvbSIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA0LTI5IDA1OjE5OjE3IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.Xxqk6EK5mA1PbIFHwJIftjLL9fXzIUoZapTbaRy-6LYtL1DuYJht-cVUZHHbWw3jiGFA5HJqhWC6K1CiT5PbTr76P381gme5HKJBhzU_g578sB43AoK4gm7mSWf-mmNcOKeBQF_WhVzmFcWb7YCRbED3Zx0c2p3lunshZOflz_9d-3iEC0199ia6v2ted8jA1NtKc21E7xfJxnwAYEjL-bGIz4b3D_i-MStZsJBxcvtFQ0l77KB1KIUMemBnrOhsEIsE088LOFNfazU0v9-DZTvwjplH8uSojo2P2IHlsdpUYnV0aVUj8ckIBHAStFRkH2Cf9hobMpU1n8QvStDlPA";

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper Functions
async function ensureDir(dirPath: string) {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function generateSingleAudioChunk(
  chunkIndex: number,
  textChunk: string,
  provider: string,
  providerArgs: any,
  baseTempDir: string
): Promise<string> {
  console.log(`🔊 [Chunk ${chunkIndex}] Generating for provider: ${provider}, length: ${textChunk.length}`);
  const { voice, model, fishAudioVoiceId, fishAudioModel, elevenLabsVoiceId, elevenLabsModelId, languageCode, googleTtsVoiceName } = providerArgs;
  
  const tempFileName = `${provider}-${
    provider === "google-tts" ? 
      (googleTtsVoiceName || 'unknown_voice').replace(/[^a-zA-Z0-9]/g, '_') : 
      provider === "elevenlabs" ?
        (elevenLabsVoiceId || 'unknown_voice').replace(/[^a-zA-Z0-9]/g, '_') :
        provider === "fish-audio" ?
          (fishAudioVoiceId || 'unknown_voice').replace(/[^a-zA-Z0-9]/g, '_') :
          (voice || 'unknown_voice').replace(/\s+/g, '_')
  }-chunk${chunkIndex}-${Date.now()}.mp3`;
  const tempFilePath = path.join(baseTempDir, tempFileName);
  
  let audioBuffer: Buffer;

  try {
    switch (provider) {
      case "openai":
        const openaiSelectedVoice = voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "ash" | "ballad" | "coral" | "sage";
        const openaiTTSModel = model || "tts-1"; 
        console.log(`🤖 [Chunk ${chunkIndex}] OpenAI: voice=${openaiSelectedVoice}, model=${openaiTTSModel}`);
        const mp3 = await openai.audio.speech.create({
          model: openaiTTSModel,
          voice: openaiSelectedVoice,
          input: textChunk,
        });
        audioBuffer = Buffer.from(await mp3.arrayBuffer());
        break;

      case "minimax":
        const minimaxTTSModel = model || "speech-02-hd";
        console.log(`🤖 [Chunk ${chunkIndex}] MiniMax: voice=${voice}, model=${minimaxTTSModel}`);
        const minimaxResponse = await fetch(`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
          body: JSON.stringify({
            model: minimaxTTSModel, text: textChunk, stream: false, subtitle_enable: false,
            voice_setting: { voice_id: voice, speed: 1, vol: 1, pitch: 0 },
            audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 }
          })
        });
        if (!minimaxResponse.ok) {
          let errorBody = '';
          try { errorBody = await minimaxResponse.text(); } catch (e) { /* ignore */ }
          throw new Error(`MiniMax API error [Chunk ${chunkIndex}]: ${minimaxResponse.status} ${minimaxResponse.statusText}. Body: ${errorBody}`);
        }
        const minimaxData = await minimaxResponse.json();
        if (!minimaxData.data?.audio) throw new Error(`No audio data from MiniMax [Chunk ${chunkIndex}]. Response: ${JSON.stringify(minimaxData)}`);
        const hexString = minimaxData.data.audio;
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
        }
        audioBuffer = Buffer.from(bytes);
        break;

      case "fishaudio":
        if (!fishAudioVoiceId) throw new Error(`Missing fishAudioVoiceId for Fish Audio [Chunk ${chunkIndex}]`);
        const fishModelToUse = fishAudioModel || FISH_AUDIO_MODEL_DEFAULT;
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio: voiceId=${fishAudioVoiceId}, model=${fishModelToUse}, textLength=${textChunk.length}`);
        
        const fishRequestBody = {
          text: textChunk, 
          format: "mp3", 
          mp3_bitrate: 128,
          reference_id: fishAudioVoiceId, 
          normalize: true, 
          latency: "normal",
        };
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio request body:`, fishRequestBody);
        
        const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`, 
            "Content-Type": "application/json", 
            "Model": fishModelToUse 
          },
          body: JSON.stringify(fishRequestBody)
        });
        
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio response status: ${fishResponse.status}`);
        
        if (!fishResponse.ok || !fishResponse.body) {
          let errorBody = '';
          try { errorBody = await fishResponse.text(); } catch (e) { /* ignore */ }
          console.error(`🐠 [Chunk ${chunkIndex}] Fish Audio API error:`, errorBody);
          throw new Error(`Fish Audio API error [Chunk ${chunkIndex}]: ${fishResponse.status} ${fishResponse.statusText}. Body: ${errorBody}`);
        }
        
        const fishReader = fishResponse.body.getReader();
        const fishChunks: Buffer[] = [];
        while (true) {
          const { done, value } = await fishReader.read();
          if (done) break;
          fishChunks.push(Buffer.from(value)); 
        }
        audioBuffer = Buffer.concat(fishChunks as any);
        console.log(`🐠 [Chunk ${chunkIndex}] Fish Audio completed: ${Math.round(audioBuffer.length / 1024)}KB`);
        break;

      case "voicemaker":
        if (!voice) throw new Error(`Missing voice for VoiceMaker [Chunk ${chunkIndex}]`);
        const vmModel = model || 'neural';
        console.log(`🎵 [Chunk ${chunkIndex}] VoiceMaker: voice=${voice}, engine=${vmModel}`);
        const vmResponse = await fetch('https://developer.voicemaker.in/voice/api', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VOICEMAKER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Engine: vmModel,
            VoiceId: voice,
            LanguageCode: languageCode || 'en-US',
            Text: textChunk,
            OutputFormat: 'mp3',
            SampleRate: '48000',
            Effect: 'default',
            MasterVolume: '0',
            MasterSpeed: '0',
            MasterPitch: '0'
          })
        });
        if (!vmResponse.ok) {
          let errorBody = '';
          try { errorBody = await vmResponse.text(); } catch (e) { /* ignore */ }
          throw new Error(`VoiceMaker API error [Chunk ${chunkIndex}]: ${vmResponse.status} ${vmResponse.statusText}. Body: ${errorBody}`);
        }
        const vmData = await vmResponse.json();
        if (!vmData.success || !vmData.path) {
          throw new Error(`VoiceMaker failed [Chunk ${chunkIndex}]: ${JSON.stringify(vmData)}`);
        }
        // Download the audio file from VoiceMaker's URL
        const vmAudioResponse = await fetch(vmData.path);
        if (!vmAudioResponse.ok) {
          throw new Error(`Failed to download VoiceMaker audio [Chunk ${chunkIndex}]: ${vmAudioResponse.status}`);
        }
        audioBuffer = Buffer.from(await vmAudioResponse.arrayBuffer());
        break;

      case "elevenlabs":
        if (!elevenlabs) throw new Error(`ElevenLabs client not initialized [Chunk ${chunkIndex}]`);
        if (!elevenLabsVoiceId) throw new Error(`Missing elevenLabsVoiceId [Chunk ${chunkIndex}]`);
        const elModelId = elevenLabsModelId || "eleven_multilingual_v2";
        console.log(`🧪 [Chunk ${chunkIndex}] ElevenLabs: voiceId=${elevenLabsVoiceId}, modelId=${elModelId}${languageCode && elModelId === "eleven_flash_v2_5" ? `, language=${languageCode}` : ""}`);
        
        const elConversionParams: any = {
          text: textChunk,
          modelId: elModelId,
          outputFormat: "mp3_44100_128"
        };
        
        if (elModelId === "eleven_flash_v2_5" && languageCode) {
          elConversionParams.languageCode = languageCode;
        }
        
        const elAudioStream = await elevenlabs.textToSpeech.convert(elevenLabsVoiceId, elConversionParams);
        const elStreamChunks: Uint8Array[] = [];
        
        // Handle ReadableStream properly
        const reader = elAudioStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            elStreamChunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        
        const elConcatenatedUint8Array = new Uint8Array(elStreamChunks.reduce((acc, streamChunk) => acc + streamChunk.length, 0));
        let offset = 0;
        for (const streamChunk of elStreamChunks) { 
          elConcatenatedUint8Array.set(streamChunk, offset); 
          offset += streamChunk.length; 
        }
        audioBuffer = Buffer.from(elConcatenatedUint8Array);
        break;
        
      case "google-tts":
        if (!googleTtsVoiceName) throw new Error(`Missing googleTtsVoiceName for Google TTS [Chunk ${chunkIndex}]`);
        console.log(`🇬☁️ [Chunk ${chunkIndex}] Google TTS: voice=${googleTtsVoiceName}`);
        
        try {
          audioBuffer = await synthesizeGoogleTts(textChunk, googleTtsVoiceName);
        } catch (error: any) {
          if (error.message && error.message.includes("Cannot extract language code")) {
            const friendlyError = `Google TTS Error [Chunk ${chunkIndex}]: Invalid voice name format. ${error.message}`;
            console.error(`❌ ${friendlyError}`);
            throw new Error(friendlyError);
          }
          if (error.details || error.message) {
            const friendlyError = `Google TTS Error [Chunk ${chunkIndex}]: ${error.details || error.message}`;
            console.error(`❌ ${friendlyError}`);
            throw new Error(friendlyError);
          }
          throw error;
        }
        break;

      default:
        throw new Error(`Unsupported provider: ${provider} [Chunk ${chunkIndex}]`);
    }

    await fsp.writeFile(tempFilePath, audioBuffer as any); 
    console.log(`💾 [Chunk ${chunkIndex}] Saved to: ${tempFilePath}`);
    return tempFilePath;

  } catch (error: any) {
    console.error(`❌ Error in generateSingleAudioChunk for provider ${provider} [Chunk ${chunkIndex}]: ${error.message}`);
    try { if (fs.existsSync(tempFilePath)) await fsp.rm(tempFilePath); } catch (e) { console.warn(`🧹 Failed to cleanup temp file ${tempFilePath} after error:`, e); }
    throw error; 
  }
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  const { text, provider, voice, model, fishAudioVoiceId, fishAudioModel, elevenLabsVoiceId, elevenLabsModelId, languageCode, userId = "unknown_user", googleTtsVoiceName, chunkIndex } = requestBody;

  console.log(`📥 Received audio generation request for chunk ${chunkIndex}`);
  console.log(`🔍 Request details: provider=${provider}, voice=${voice}, userId=${userId}, text length=${text?.length || 0}`);

  // Validate required fields based on provider
  if (!text || !provider) {
    return NextResponse.json({ error: "Missing required fields: text and provider are required" }, { status: 400 });
  }

  // Provider-specific validation
  switch (provider) {
    case "openai":
    case "minimax":
      if (!voice) {
        return NextResponse.json({ error: `Missing required field 'voice' for ${provider}` }, { status: 400 });
      }
      break;
    case "fishaudio":
      if (!fishAudioVoiceId) {
        return NextResponse.json({ error: "Missing required field 'fishAudioVoiceId' for Fish Audio" }, { status: 400 });
      }
      break;
    case "voicemaker":
      if (!voice) {
        return NextResponse.json({ error: "Missing required field 'voice' for VoiceMaker" }, { status: 400 });
      }
      break;
    case "elevenlabs":
      if (!elevenLabsVoiceId) {
        return NextResponse.json({ error: "Missing required field 'elevenLabsVoiceId' for ElevenLabs" }, { status: 400 });
      }
      break;
    case "google-tts":
      if (!googleTtsVoiceName) {
        return NextResponse.json({ error: "Missing required field 'googleTtsVoiceName' for Google TTS" }, { status: 400 });
      }
      break;
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const baseTempDirRoot = path.join(process.cwd(), 'temp-audio-processing');
  const tempDirForRequest = path.join(baseTempDirRoot, `req-chunk-${chunkIndex}-${uuidv4()}`);

  try {
    await ensureDir(tempDirForRequest);

    const providerSpecificArgs = { voice, model, fishAudioVoiceId, fishAudioModel, elevenLabsVoiceId, elevenLabsModelId, languageCode, provider, googleTtsVoiceName };
    
    const audioChunkPath = await generateSingleAudioChunk(chunkIndex || 0, text, provider, providerSpecificArgs, tempDirForRequest);

    const supabaseDestinationPath = `user_${userId}/audio_chunks/${path.basename(audioChunkPath)}`;
    const audioSupabaseUrl = await uploadFileToSupabase(audioChunkPath, supabaseDestinationPath, 'audio/mpeg');

    if (!audioSupabaseUrl) {
        throw new Error("Failed to upload the audio chunk to Supabase Storage.");
    }

    console.log(`✅ Chunk ${chunkIndex} generated and uploaded successfully.`);
    return NextResponse.json({
      success: true,
      audioUrl: audioSupabaseUrl,
      chunkIndex: chunkIndex,
    });

  } catch (error: any) {
    console.error(`❌ Error generating audio for chunk ${chunkIndex}:`, error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to generate audio for chunk ${chunkIndex}: ${error.message}` },
      { status: 500 }
    );
  } finally {
      try {
          if (fs.existsSync(tempDirForRequest)) {
              await fsp.rm(tempDirForRequest, { recursive: true, force: true });
              console.log(`🚮 Cleaned up request temp directory: ${tempDirForRequest}`);
          }
      } catch (e) {
          console.warn(`⚠️ Failed to cleanup request temp directory ${tempDirForRequest}:`, e);
      }
  }
} 