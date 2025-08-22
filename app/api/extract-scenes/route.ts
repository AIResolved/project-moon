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
        
        // Generate both detailed image prompt and search query for this chunk
        const promptResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert visual scene designer creating both AI image prompts and web search queries. You need to generate two things:
1. A detailed AI image prompt with HIGHLY SPECIFIC character details
2. A concise search query for finding stock photos/videos on Pexels/Pixabay

CRITICAL REQUIREMENTS:
- Always specify character's gender, age, and physical description in AI prompts
- Include specific clothing, posture, and facial expressions
- Describe exact setting details, lighting, and atmosphere
- Mention camera angle and composition
- Keep AI prompts under 200 words but be as descriptive as possible
- Keep search queries under 50 characters and focus on core visual elements`
            },
            {
              role: "user",
              content: `
Convert this story chunk into TWO outputs:

1. DETAILED AI IMAGE PROMPT (max 200 words):
MANDATORY DETAILS TO INCLUDE:
- Character specifics: age, gender, physical appearance, clothing, posture
- Setting: specific location, time of day, weather, objects
- Action: exact body position, facial expression, what they're doing
- Atmosphere: lighting type, mood, shadows, colors
- Camera: angle, distance, focus point
- Style: realistic, cinematic, photographic

2. SEARCH QUERY (max 50 characters):
Simple keywords for stock photo search (e.g., "woman office laptop", "sunset beach", "city street night")

Story chunk:
${chunkText}

FORMAT YOUR RESPONSE AS:
AI_PROMPT: [detailed prompt here]
SEARCH_QUERY: [simple keywords here]

Be extremely specific about gender, age, and physical details in the AI prompt.
              `
            }
          ],
      
        });

        let responseText = promptResponse.choices[0]?.message.content?.trim() || 
          `AI_PROMPT: A detailed scene depicting: ${chunkText.substring(0, 100)}...\nSEARCH_QUERY: scene story`;

        // Parse the AI response to extract both prompt and search query
        let promptText = '';
        let searchQuery = '';
        
        const aiPromptMatch = responseText.match(/AI_PROMPT:\s*([\s\S]*?)(?=\nSEARCH_QUERY:|$)/);
        const searchQueryMatch = responseText.match(/SEARCH_QUERY:\s*(.*?)$/m);
        
        if (aiPromptMatch && searchQueryMatch) {
          promptText = aiPromptMatch[1].trim();
          searchQuery = searchQueryMatch[1].trim();
        } else {
          // Fallback if parsing fails
          promptText = responseText.includes('AI_PROMPT:') ? 
            responseText.split('AI_PROMPT:')[1].split('SEARCH_QUERY:')[0].trim() : 
            responseText;
          searchQuery = responseText.includes('SEARCH_QUERY:') ? 
            responseText.split('SEARCH_QUERY:')[1].trim() : 
            `scene ${index + 1}`;
        }

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

        // Ensure search query is under 50 characters
        if (searchQuery.length > 50) {
          searchQuery = searchQuery.substring(0, 47) + '...';
        }

        return {
          chunkIndex: index,
          originalText: chunkText,
          imagePrompt: promptText,
          searchQuery: searchQuery,
          summary: `Scene ${index + 1}`,
        };
      } catch (error: any) {
        console.error(`Error generating prompt for chunk ${index + 1}:`, error);
        
        // Provide fallback data for failed chunk analysis
        return {
          chunkIndex: index,
          originalText: chunk.pageContent,
          imagePrompt: `A scene from the story, section ${index + 1}`,
          searchQuery: `scene ${index + 1}`,
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