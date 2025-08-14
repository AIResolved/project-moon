import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractScenesRequestBody {
  script: string;
  numberOfScenes: number;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExtractScenesRequestBody;
    const { script, numberOfScenes, userId = "unknown_user" } = body;

    if (!script || typeof script !== 'string' || script.trim() === '') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    if (!numberOfScenes || numberOfScenes < 1 || numberOfScenes > 200) {
      return NextResponse.json({ 
        error: 'Number of scenes must be between 1 and 20' 
      }, { status: 400 });
    }

    console.log(`🎬 Extracting ${numberOfScenes} scenes from script for user ${userId}`);

    // Calculate chunk size based on script length and desired number of scenes
    const textLength = script.length;
    const chunkSize = Math.ceil(textLength / numberOfScenes);
    const chunkOverlap = Math.min(Math.floor(chunkSize * 0.1), 200); // 10% overlap, max 200 chars

    console.log(`Text length: ${textLength}, Chunk size: ${chunkSize}, Chunk overlap: ${chunkOverlap}`);

    // Create text splitter with calculated parameters
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    // Split the text into chunks
    const chunks = await splitter.createDocuments([script]);

    // Limit to the requested number of scenes
    const limitedChunks = chunks.slice(0, numberOfScenes);
    
    console.log(`Created ${limitedChunks.length} chunks from script`);

    // Process each chunk to generate image prompts
    const scenePromises = limitedChunks.map(async (chunk, index) => {
      try {
        const chunkText = chunk.pageContent;
        
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
- Focus on visual accuracy over brevity`
            },
            {
              role: "user",
              content: `
Convert this story chunk into a DETAILED, specific image prompt (max 200 words).

MANDATORY DETAILS TO INCLUDE:
1. Character specifics: age, gender, physical appearance, clothing, posture
2. Setting: specific location, time of day, weather, objects
3. Action: exact body position, facial expression, what they're doing
4. Atmosphere: lighting type, mood, shadows, colors
5. Camera: angle, distance, focus point
6. Style: realistic, cinematic, photographic

Story chunk:
${chunkText}

Example format: "A [specific age] year old [gender] with [hair/features] wearing [specific clothing], [specific posture/action] in [detailed setting], [specific lighting], [camera angle], [artistic style]"

Be extremely specific about gender, age, and physical details to ensure accurate AI generation.
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
        
        // Hard limit to 1000 characters for detailed prompts (most models support this)
        if (promptText.length > 1000) {
          promptText = promptText.substring(0, 1000).trim();
          // Ensure we don't cut off mid-word
          const lastSpace = promptText.lastIndexOf(' ');
          if (lastSpace > 900) {
            promptText = promptText.substring(0, lastSpace);
          }
        }

        return {
          chunkIndex: index,
          originalText: chunkText,
          imagePrompt: promptText,
          summary: `Scene ${index + 1}`,
        };
      } catch (error: any) {
        console.error(`Error generating prompt for chunk ${index + 1}:`, error);
        
        // Provide fallback data for failed chunk analysis
        return {
          chunkIndex: index,
          originalText: chunk.pageContent,
          imagePrompt: `A scene from the story, section ${index + 1}`,
          summary: `Scene ${index + 1}`,
          error: error.message || 'Unknown error'
        };
      }
    });

    const scenes = await Promise.all(scenePromises);
    
    console.log(`✅ Successfully extracted ${scenes.length} scenes with image prompts`);
    
    return NextResponse.json({ 
      scenes,
      totalScenes: scenes.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in scene extraction:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to extract scenes from script' 
    }, { status: 500 });
  }
} 