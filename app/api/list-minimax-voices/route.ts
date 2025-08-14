import { NextRequest, NextResponse } from 'next/server';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

interface MinimaxVoice {
  voice_id: string;
  voice_name: string;
  description: string[];
}

interface MinimaxVoicesResponse {
  system_voice: MinimaxVoice[];
}

export async function GET(request: NextRequest) {
  try {
    if (!MINIMAX_API_KEY) {
      console.warn('MINIMAX_API_KEY not configured, returning mock data');
      return NextResponse.json({
        success: false,
        error: 'Minimax API key not configured. Please add MINIMAX_API_KEY to your environment variables.',
        voices: []
      });
    }

    const response = await fetch('https://api.minimax.io/v1/get_voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        voice_type: 'system'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Minimax API error:', response.status, errorText);
      throw new Error(`Minimax API error: ${response.status} ${errorText}`);
    }

    const data: MinimaxVoicesResponse = await response.json();
    console.log(data);
    
    console.log(`✅ Successfully fetched ${data.system_voice?.length || 0} Minimax voices`);
    
    // Filter and format voices for our use
    const formattedVoices = (data.system_voice || []).map(voice => ({
      id: voice.voice_id,
      name: voice.voice_name || voice.voice_id,
      description: Array.isArray(voice.description) ? voice.description.join(', ') : (voice.description || ''),
      gender: 'unknown', // Minimax doesn't provide gender info
      accent: 'unknown', // Minimax doesn't provide accent info
      language: 'unknown' // Minimax doesn't provide language info
    })).filter(voice => voice.id && voice.name); // Filter out empty voices

    return NextResponse.json({
      success: true,
      voices: formattedVoices
    });

  } catch (error: any) {
    console.error('Error fetching Minimax voices:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      voices: []
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 