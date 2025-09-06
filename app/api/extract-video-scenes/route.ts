import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractVideoScenesRequestBody {
  script: string;
  numberOfScenes: number;
  userId?: string;
}

interface ScriptSummary {
  storySummary: string;
  mainCharacters: string;
  setting: string;
  tone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExtractVideoScenesRequestBody;
    const { script, numberOfScenes, userId = "unknown_user" } = body;

    if (!script || typeof script !== 'string' || script.trim() === '') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    if (!numberOfScenes || numberOfScenes < 1 || numberOfScenes > 1000) {
      return NextResponse.json({ 
        error: 'Number of scenes must be between 1 and 1000' 
      }, { status: 400 });
    }

    console.log(`🎬 Extracting ${numberOfScenes} video scenes from script for user ${userId}`);

    // Step 1: Generate script summary for context
    console.log('📖 Generating script summary for context...');
    const scriptSummary = await generateScriptSummary(script);
    console.log('✅ Script summary generated:', scriptSummary);

    // Step 2: Calculate chunk size based on script length and desired number of scenes
    const textLength = script.length;
    const chunkSize = Math.ceil(textLength / numberOfScenes);
    const chunkOverlap = Math.min(Math.floor(chunkSize * 0.1), 200); // 10% overlap, max 200 chars

    console.log(`Text length: ${textLength}, Chunk size: ${chunkSize}, Chunk overlap: ${chunkOverlap}`);

    // Step 3: Create text splitter with calculated parameters
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    // Step 4: Split the text into chunks
    const chunks = await splitter.createDocuments([script]);

    // Limit to the requested number of scenes
    const limitedChunks = chunks.slice(0, numberOfScenes);
    
    console.log(`Created ${limitedChunks.length} chunks from script`);

    // Step 5: Process each chunk to generate video prompts with script context
    const scenePromises = limitedChunks.map(async (chunk, index) => {
      try {
        const chunkText = chunk.pageContent;
        
        // Generate detailed video prompt and search query for this chunk with script context
        const promptResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert video prompt creator for AI video generation and stock video search. Your task is to create both detailed AI video prompts and simple search queries for finding stock videos.

STORY CONTEXT:
- Story Summary: ${scriptSummary.storySummary}
- Main Characters: ${scriptSummary.mainCharacters}
- Setting: ${scriptSummary.setting}
- Tone & Atmosphere: ${scriptSummary.tone}

You need to generate TWO outputs:

1. DETAILED AI VIDEO PROMPT (20-35 words):
- Includes SPECIFIC character details (age, gender, appearance, clothing)
- Describes precise actions and movements
- Mentions camera work (close-up, wide shot, panning, tracking, etc.)
- Details lighting and atmosphere
- Maintains consistency with the overall story context
- Uses cinematic language suitable for video generation
- Focuses on visual motion and dynamic elements

2. SEARCH QUERY (max 50 characters):
Simple keywords for stock video search (e.g., "woman walking city", "sunset beach", "office meeting")

Examples:
- AI Prompt: "Close-up of a 25-year-old brunette woman in white dress slowly turning toward camera, tears in blue eyes, soft morning light streaming through window, cinematic"
- Search Query: "woman turning sad window light"

Remember: This is for VIDEO generation, not images. Focus on movement, action, and cinematic elements with very detailed character and environment descriptions.`
            },
            {
              role: "user", 
              content: `Based on the story context above, create both outputs for this script section (Scene ${index + 1} of ${numberOfScenes}):

${chunkText}

FORMAT YOUR RESPONSE AS:
VIDEO_PROMPT: [detailed video prompt here]
SEARCH_QUERY: [simple keywords here]

Generate content that captures the essence of this scene while maintaining story consistency.`
            }
          ],
        });

        let responseText = promptResponse.choices[0]?.message.content?.trim() || 
          `VIDEO_PROMPT: A cinematic scene depicting: ${chunkText.substring(0, 100)}...\nSEARCH_QUERY: scene video`;

        // Parse the AI response to extract both video prompt and search query
        let videoPrompt = '';
        let searchQuery = '';
        
        const videoPromptMatch = responseText.match(/VIDEO_PROMPT:\s*([\s\S]*?)(?=\nSEARCH_QUERY:|$)/);
        const searchQueryMatch = responseText.match(/SEARCH_QUERY:\s*(.*?)$/m);
        
        if (videoPromptMatch && searchQueryMatch) {
          videoPrompt = videoPromptMatch[1].trim();
          searchQuery = searchQueryMatch[1].trim();
        } else {
          // Fallback if parsing fails
          videoPrompt = responseText.includes('VIDEO_PROMPT:') ? 
            responseText.split('VIDEO_PROMPT:')[1].split('SEARCH_QUERY:')[0].trim() : 
            responseText;
          searchQuery = responseText.includes('SEARCH_QUERY:') ? 
            responseText.split('SEARCH_QUERY:')[1].trim() : 
            `video scene ${index + 1}`;
        }

        // Ensure video prompt is detailed but manageable (20-35 words ideal for detailed video generation)
        const words = videoPrompt.split(' ');
        if (words.length > 50) {
          videoPrompt = words.slice(0, 50).join(' ');
        }
        
        // Increased character limit for detailed video prompts (detailed descriptions need more space)
        if (videoPrompt.length > 400) {
          videoPrompt = videoPrompt.substring(0, 400).trim();
          // Ensure we don't cut off mid-word
          const lastSpace = videoPrompt.lastIndexOf(' ');
          if (lastSpace > 350) {
            videoPrompt = videoPrompt.substring(0, lastSpace);
          }
        }

        // Ensure search query is under 50 characters
        if (searchQuery.length > 50) {
          searchQuery = searchQuery.substring(0, 47) + '...';
        }

        return {
          chunkIndex: index,
          originalText: chunkText,
          videoPrompt: videoPrompt,
          searchQuery: searchQuery,
          summary: `Scene ${index + 1}`,
        };
      } catch (error: any) {
        console.error(`Error generating video prompt for chunk ${index + 1}:`, error);
        
        // Provide fallback data for failed chunk analysis
        return {
          chunkIndex: index,
          originalText: chunk.pageContent,
          videoPrompt: `A cinematic scene from the story, section ${index + 1}`,
          searchQuery: `video scene ${index + 1}`,
          summary: `Scene ${index + 1}`,
          error: error.message || 'Unknown error'
        };
      }
    });

    const scenes = await Promise.all(scenePromises);
    
    console.log(`✅ Successfully extracted ${scenes.length} video scenes with prompts`);
    
    return NextResponse.json({ 
      scenes,
      totalScenes: scenes.length,
      scriptSummary
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in video scene extraction:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to extract video scenes from script' 
    }, { status: 500 });
  }
}

// Helper function to generate script summary
async function generateScriptSummary(script: string): Promise<ScriptSummary> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert story analyst for video content creation. Analyze the provided script and generate a structured summary that will help create contextually relevant video content.

Please provide a JSON response with exactly these four fields:
- storySummary: A concise summary of the overall story and narrative arc (2-3 sentences)
- mainCharacters: Key characters or subjects mentioned in the story (1-2 sentences)
- setting: The main setting, location, or environment of the story (1 sentence)
- tone: The overall tone, mood, and atmosphere of the story (1 sentence)

Focus on visual elements that would be important for video generation.`
        },
        {
          role: "user",
          content: `Analyze this script and provide the structured summary:\n\n${script}`
        }
      ],
    });

    const content = response.choices[0]?.message.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Try to parse as JSON, fallback to text parsing
    try {
      const parsed = JSON.parse(content);
      return {
        storySummary: parsed.storySummary || 'A narrative story',
        mainCharacters: parsed.mainCharacters || 'Various characters',
        setting: parsed.setting || 'Various locations',
        tone: parsed.tone || 'Neutral tone'
      };
    } catch {
      // Fallback to a basic summary if JSON parsing fails
      return {
        storySummary: content.substring(0, 200) + '...',
        mainCharacters: 'Characters from the story',
        setting: 'Story setting',
        tone: 'Narrative tone'
      };
    }
  } catch (error) {
    console.error('Error generating script summary:', error);
    // Return a basic fallback summary
    return {
      storySummary: 'A story with various scenes and narrative elements',
      mainCharacters: 'Characters throughout the story',
      setting: 'Various settings and locations',
      tone: 'Mixed tone and atmosphere'
    };
  }
}