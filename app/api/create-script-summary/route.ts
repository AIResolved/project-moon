import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CreateScriptSummaryRequestBody {
  script: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateScriptSummaryRequestBody;
    const { script, userId = "unknown_user" } = body;

    if (!script || typeof script !== 'string' || script.trim() === '') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    console.log(`📝 Creating script summary for user ${userId}`);

    try {
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a script analysis expert. Create a detailed summary that focuses on character descriptions and consistent details for visual representation. This summary will be used to ensure consistent character appearance across multiple image generations.`
          },
          {
            role: "user",
            content: `Analyze this script and create a comprehensive summary focusing on:

1. MAIN CHARACTERS: Name, age, gender, physical appearance, clothing style, personality traits
2. SETTING: Time period, location, atmosphere, recurring environments
3. VISUAL STYLE: Overall mood, tone, visual themes
4. RECURRING ELEMENTS: Objects, symbols, or visual motifs that appear throughout

Script to analyze:
${script}

Provide a concise but detailed summary (max 300 words) that will help maintain visual consistency across scene-by-scene image generation.`
          }
        ],
      });
      
      const scriptSummary = summaryResponse.choices[0]?.message.content?.trim() || '';
      console.log('✅ Script summary created successfully');
      
      return NextResponse.json({
        summary: scriptSummary
      }, { status: 200 });

    } catch (error: any) {
      console.error('Failed to create script summary:', error);
      return NextResponse.json({
        summary: '',
        error: error.message || 'Failed to create script summary'
      }, { status: 200 }); // Return 200 with empty summary to allow processing to continue
    }

  } catch (error: any) {
    console.error('Error in script summary creation:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create script summary' 
    }, { status: 500 });
  }
}



