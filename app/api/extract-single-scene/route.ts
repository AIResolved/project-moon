import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractSingleSceneRequestBody {
  chunkText: string;
  chunkIndex: number;
  scriptSummary?: string;
  imageStylePrompt?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExtractSingleSceneRequestBody;
    const { chunkText, chunkIndex, scriptSummary = '', imageStylePrompt = '', userId = "unknown_user" } = body;

    if (!chunkText || typeof chunkText !== 'string' || chunkText.trim() === '') {
      return NextResponse.json({ error: 'Chunk text is required' }, { status: 400 });
    }

    console.log(`🎬 Processing scene ${chunkIndex + 1} for user ${userId}`);

    try {
      // Generate detailed image prompt for this chunk
      const promptResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert visual scene designer creating detailed image prompts for AI generation. Your prompts must be HIGHLY SPECIFIC and include precise character details to prevent AI defaults (like generating males instead of females).

CRITICAL REQUIREMENTS:
- Always specify character's gender, age, and physical description
- Include specific clothing, posture, and facial expressions
- Describe exact setting details, lighting, and atmosphere
- Mention camera angle and composition
- Keep under 200 words but be as descriptive as possible
- Focus on visual accuracy over brevity
- MAINTAIN CHARACTER CONSISTENCY using the provided script summary

${scriptSummary ? `SCRIPT SUMMARY FOR CONSISTENCY:
${scriptSummary}

USE THIS SUMMARY to ensure characters appear consistently across all scenes.` : ''}

${imageStylePrompt ? `ADDITIONAL STYLE GUIDELINES:
${imageStylePrompt}` : ''}`
          },
          {
            role: "user",
            content: `
Convert this story chunk into a DETAILED, specific image prompt (max 200 words).

MANDATORY DETAILS TO INCLUDE:
1. Character specifics: age, gender, physical appearance, clothing, posture (USE SCRIPT SUMMARY FOR CONSISTENCY)
2. Setting: specific location, time of day, weather, objects
3. Action: exact body position, facial expression, what they're doing
4. Atmosphere: lighting type, mood, shadows, colors
5. Camera: angle, distance, focus point
6. Style: realistic, cinematic, photographic

Story chunk:
${chunkText}

Example format: "A [specific age] year old [gender] with [hair/features] wearing [specific clothing], [specific posture/action] in [detailed setting], [specific lighting], [camera angle], [artistic style]"

IMPORTANT: Use the script summary above to maintain consistent character descriptions across all scenes. Be extremely specific about gender, age, and physical details to ensure accurate AI generation.
            `
          }
        ],
      });

      let promptText = promptResponse.choices[0]?.message.content?.trim() || 
        `A detailed scene depicting: ${chunkText.substring(0, 100)}...`;

      // Ensure prompt is under 200 words and 1000 characters for detailed descriptions
      const words = promptText.split(' ');
      if (words.length > 200) {
        promptText = words.slice(0, 200).join(' ');
      }
      
      // Hard limit to 1000 characters for detailed prompts
      if (promptText.length > 1000) {
        promptText = promptText.substring(0, 1000).trim();
        const lastSpace = promptText.lastIndexOf(' ');
        if (lastSpace > 900) {
          promptText = promptText.substring(0, lastSpace);
        }
      }

      console.log(`✅ Generated prompt for scene ${chunkIndex + 1}`);

      return NextResponse.json({
        scene: {
          chunkIndex,
          originalText: chunkText,
          imagePrompt: promptText,
          summary: `Scene ${chunkIndex + 1}`,
        }
      }, { status: 200 });

    } catch (error: any) {
      console.error(`Error generating prompt for chunk ${chunkIndex + 1}:`, error);
      
      return NextResponse.json({
        scene: {
          chunkIndex,
          originalText: chunkText,
          imagePrompt: `A scene from the story, section ${chunkIndex + 1}`,
          summary: `Scene ${chunkIndex + 1}`,
          error: error.message || 'Unknown error'
        }
      }, { status: 200 }); // Return 200 with error info to allow frontend to handle
    }

  } catch (error: any) {
    console.error('Error in single scene extraction:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to extract scene from script chunk' 
    }, { status: 500 });
  }
}



