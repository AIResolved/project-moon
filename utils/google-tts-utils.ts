"use server";

import textToSpeech from '@google-cloud/text-to-speech';

// Configure the Text-to-Speech client using base64-encoded JSON credentials
const googleCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('utf-8'))
  : undefined;

const client = new textToSpeech.TextToSpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: googleCredentialsJson,
});

export interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: 'SSML_VOICE_GENDER_UNSPECIFIED' | 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

/**
 * Lists available Google Cloud Text-to-Speech voices.
 * @returns A promise that resolves to an array of GoogleVoice objects.
 */
export async function listGoogleTtsVoices(): Promise<GoogleVoice[]> {
  try {
    const [result] = await client.listVoices({});
    const voices = result.voices;
    if (!voices) {
      return [];
    }
    return voices.map((voice: any) => ({
      name: voice.name || 'Unknown Name',
      languageCodes: voice.languageCodes || [],
      ssmlGender: voice.ssmlGender as GoogleVoice['ssmlGender'] || 'SSML_VOICE_GENDER_UNSPECIFIED',
      naturalSampleRateHertz: voice.naturalSampleRateHertz || 0,
    }));
  } catch (error) {
    console.error('Error listing Google TTS voices:', error);
    throw new Error('Failed to list Google TTS voices.');
  }
}

/**
 * Synthesizes speech using Google Cloud Text-to-Speech.
 * @param text The text to synthesize.
 * @param voiceName The name of the voice to use (e.g., "en-US-Wavenet-D").
 * @param audioEncoding The audio encoding format.
 * @returns A promise that resolves to the audio content as a Buffer.
 */
export async function synthesizeGoogleTts(
  text: string,
  voiceName: string,
  audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS' = 'MP3'
): Promise<Buffer> {
  try {
    // Extract language code from voice name (supports 2-3 letter language codes)
    // Examples:
    //  - en-US-Wavenet-D           -> en-US
    //  - cmn-CN-Chirp3-HD-Achird   -> cmn-CN
    //  - pt-BR-Polyglot-V2         -> pt-BR
    let languageCode = '';
    const tolerantMatch = voiceName.match(/^([a-z]{2,3}-[A-Z]{2})/);
    if (tolerantMatch) {
      languageCode = tolerantMatch[1];
    } else {
      // Fallback: take first two dash-separated parts if possible
      const parts = voiceName.split('-');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        languageCode = `${parts[0]}-${parts[1]}`;
      }
    }
    if (!languageCode) {
      throw new Error(`Cannot extract language code from voice name: ${voiceName}`);
    }
    
    console.log(`🇬☁️ Google TTS: Using voice=${voiceName}, extracted language=${languageCode}`);
    
    const request = {
      input: { text: text },
      voice: { languageCode: languageCode, name: voiceName },
      audioConfig: { audioEncoding: audioEncoding },
    };

    const [response] = await client.synthesizeSpeech(request);
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS.');
    }
    return Buffer.from(response.audioContent as Uint8Array);
  } catch (error) {
    console.error('Error synthesizing speech with Google TTS:', error);
    throw new Error('Failed to synthesize speech with Google TTS.');
  }
}

// export { client as googleTtsClient }; Commented out or removed 