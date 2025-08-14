"use server";

import { NextResponse } from "next/server";
import { listGoogleTtsVoices, GoogleVoice } from "@/utils/google-tts-utils";

export async function GET(request: Request) {
  try {
    console.log("API: Fetching Google TTS voices...");
    const googleVoices = await listGoogleTtsVoices();
    console.log(`API: Successfully fetched ${googleVoices.length} Google TTS voices.`);
    
    // Transform Google voices to match the expected format (id + name)
    const voices = googleVoices.map((voice: GoogleVoice) => ({
      id: voice.name, // Use the voice name as the ID
      name: `${voice.name} (${voice.languageCodes.join(', ')}) - ${voice.ssmlGender}`, // Create a descriptive name
      sortKey: voice.name // Keep original name for sorting
    }));
    
    // Sort voices by language prefix first, then by voice name
    const sortedVoices = voices.sort((a, b) => {
      // Extract language prefix (e.g., "en-US" from "en-US-Wavenet-D")
      const langPrefixA = a.sortKey.match(/^([a-z]{2}-[A-Z]{2})/)?.[1] || '';
      const langPrefixB = b.sortKey.match(/^([a-z]{2}-[A-Z]{2})/)?.[1] || '';
      
      // First sort by language prefix
      if (langPrefixA !== langPrefixB) {
        return langPrefixA.localeCompare(langPrefixB);
      }
      
      // Then sort by voice name within the same language
      return a.sortKey.localeCompare(b.sortKey);
    });
    
    // Remove the sortKey from final output
    const finalVoices = sortedVoices.map(({ sortKey, ...voice }) => voice);
    
    console.log(`API: Transformed and sorted ${finalVoices.length} formatted voices`);
    return NextResponse.json({ voices: finalVoices });
  } catch (error: any) {
    console.error("API: Error fetching Google TTS voices:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google TTS voices", details: error.message },
      { status: 500 }
    );
  }
} 