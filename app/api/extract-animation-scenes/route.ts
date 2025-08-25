import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedAnimationScene {
  id: string;
  title: string;
  prompt: string;
  characterVariation?: string;
  duration?: number;
  effects?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Handle both FormData (with image) and JSON (legacy support)
    let script: string;
    let hasReferenceImage: boolean = false;
    let numberOfScenes: number = 5;

    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // New FormData approach with reference image
      const formData = await request.formData();
      script = formData.get('script') as string;
      const referenceImage = formData.get('referenceImage') as File;
      const numberOfScenesStr = formData.get('numberOfScenes') as string;
      numberOfScenes = numberOfScenesStr ? parseInt(numberOfScenesStr) : 10;
      hasReferenceImage = referenceImage !== null;
      
      console.log(`🖼️ Reference image provided: ${hasReferenceImage}`);
      console.log(`🎯 Number of scenes requested: ${numberOfScenes}`);
    } else {
      // Legacy JSON approach
      const data = await request.json();
      script = data.script;
      numberOfScenes = data.numberOfScenes || 5;
    }

    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      );
    }

    console.log(`🎬 Extracting animation scenes from script with character variations...`);
    console.log(`📝 Script length: ${script.length} characters`);

    // Analyze script for character mentions to create variations
    const characterAnalysis = await analyzeScriptCharacters(script, numberOfScenes);
    
    const systemPrompt = `You are an expert animation director specializing in character-based video content. Your task is to analyze a script and create animation scenes that apply the uploaded reference image style to all characters and scenes.

STYLE APPLICATION INSTRUCTION:
"Refer to the image attached and apply the same style to characters/scene to all characters if applies."

CHARACTER VARIATION STRATEGY:
${characterAnalysis.characters.length > 1 ? `
The script mentions these characters/entities: ${characterAnalysis.characters.join(', ')}
For each scene, apply the uploaded image style to represent different characters:
- Use the exact same art style and visual approach as the reference image
- Adapt the style for different poses, expressions, or character roles
- Maintain complete consistency with the reference image's aesthetic
- If the reference is a stickman, make ALL characters stickman style
- If the reference is cartoon, make ALL characters cartoon style
` : `
Apply the uploaded image style consistently to all scenes and characters.
`}

For each scene, provide:
1. A descriptive title
2. A detailed animation prompt that:
   - Starts with "Refer to the image attached and apply the same style to characters/scene if applies"
   - Describes how the scene applies the reference image style
   - Includes camera movements and cinematic effects
   - Specifies motion, lighting, and atmosphere
3. Character variation description
4. Duration (5-10 seconds)
5. Key visual effects

Return a JSON array with exactly ${Math.max(characterAnalysis.suggestedScenes, 3)} scenes:
[
  {
    "id": "scene_1",
    "title": "Scene Title",
    "prompt": "Refer to the image attached and apply the same style to characters/scene if applies. [describe scene action with camera movements, lighting, effects]",
    "characterVariation": "How the reference style is adapted for this scene",
    "duration": 6,
    "effects": ["zoom", "particles", "character_motion", "lighting"]
  }
]

ANIMATION PROMPT REQUIREMENTS:
- Always start with "Refer to the image attached and apply the same style to characters/scene if applies"
- Describe how the reference style applies to this specific scene
- Add cinematic camera movements (zoom, pan, rotation, tracking)
- Describe lighting and atmospheric effects
- Specify motion timing and dynamics
- Make it suitable for AI video generation
- Keep each prompt 30-100 words

Script to analyze:
"${script}"`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this script and create ${characterAnalysis.suggestedScenes} animation scenes with character variations based on the reference image. Each scene should adapt the reference style for different characters or moods in the script.` }
      ],
      temperature: 0.8, // Slightly higher for more creative variations
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log(`🤖 OpenAI response: ${response.substring(0, 200)}...`);

    // Extract JSON from response
    let extractedScenes: ExtractedAnimationScene[];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedScenes = JSON.parse(jsonMatch[0]);
      } else {
        extractedScenes = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback: create character-aware scenes
      extractedScenes = createFallbackCharacterScenes(script, characterAnalysis);
    }

    // Validate and enhance scenes with character variations
    const validatedScenes = extractedScenes.map((scene, index) => ({
      id: scene.id || `scene_${index + 1}`,
      title: scene.title || `Character Scene ${index + 1}`,
      prompt: scene.prompt || `Refer to the image attached and apply the same style to characters/scene if applies. Character performing dynamic motion with smooth camera tracking`,
      characterVariation: scene.characterVariation || `Reference style applied to scene ${index + 1}`,
      duration: scene.duration || (5 + Math.floor(Math.random() * 6)), // 5-10 seconds
      effects: scene.effects || ['character_animation', 'camera_movement', 'lighting']
    }));

    console.log(`✅ Successfully extracted ${validatedScenes.length} character animation scenes`);
    validatedScenes.forEach((scene, index) => {
      console.log(`   Scene ${index + 1}: ${scene.title} - ${scene.characterVariation}`);
    });

    return NextResponse.json({
      success: true,
      scenes: validatedScenes,
      totalScenes: validatedScenes.length,
      scriptLength: script.length,
      characterAnalysis: characterAnalysis,
      referenceUsed: hasReferenceImage
    });

  } catch (error: any) {
    console.error('❌ Animation scene extraction error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to extract animation scenes',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

// Helper function to analyze script for characters
async function analyzeScriptCharacters(script: string, userRequestedScenes: number = 10) {
  const words = script.split(/\s+/).length;
  const suggestedScenes = Math.min(Math.max(userRequestedScenes, 1), 1000); // Use user-requested scenes, capped at 1-1000
  
  // Simple character detection (could be enhanced with NLP)
  const characterKeywords = ['character', 'person', 'man', 'woman', 'hero', 'villain', 'narrator', 'speaker', 'protagonist', 'friend', 'enemy'];
  const detectedCharacters = [];
  
  // Look for potential character references
  const sentences = script.split(/[.!?]+/);
  for (const sentence of sentences) {
    const words = sentence.toLowerCase().split(/\s+/);
    for (const keyword of characterKeywords) {
      if (words.includes(keyword)) {
        detectedCharacters.push(keyword);
        break;
      }
    }
  }
  
  // Remove duplicates and limit
  const uniqueCharacters = [...new Set(detectedCharacters)].slice(0, 5);
  
  return {
    characters: uniqueCharacters.length > 0 ? uniqueCharacters : ['main character'],
    suggestedScenes: suggestedScenes,
    scriptLength: words,
    hasMultipleCharacters: uniqueCharacters.length > 1
  };
}

// Fallback scene creation with character awareness
function createFallbackCharacterScenes(script: string, analysis: any): ExtractedAnimationScene[] {
  const baseScenes = [
    {
      title: 'Opening Character Introduction',
      prompt: `Refer to the image attached and apply the same style to characters/scene if applies. Character appearing with dramatic zoom-in, soft lighting creates welcoming atmosphere, gentle camera rotation reveals character details`,
      characterVariation: 'Reference style applied to main character introduction',
      effects: ['zoom', 'lighting', 'rotation']
    },
    {
      title: 'Character in Action',
      prompt: `Refer to the image attached and apply the same style to characters/scene if applies. Character performing dynamic movement, camera tracks smoothly from side view, energetic motion with particle effects`,
      characterVariation: 'Reference style applied to active character movement',
      effects: ['tracking', 'motion', 'particles']
    },
    {
      title: 'Character Interaction Scene',
      prompt: `Refer to the image attached and apply the same style to characters/scene if applies. Character gesturing expressively, medium shot with subtle zoom, warm lighting emphasizes emotion`,
      characterVariation: 'Reference style applied to expressive character interaction',
      effects: ['zoom', 'lighting', 'gesture']
    }
  ];

  // Add more scenes based on analysis
  if (analysis.hasMultipleCharacters) {
    baseScenes.push({
      title: 'Secondary Character Variant',
      prompt: `Refer to the image attached and apply the same style to characters/scene if applies. Different character with alternative expression and posture, camera pans around character, cool blue lighting for contrast`,
      characterVariation: 'Reference style adapted for secondary character with different mood',
      effects: ['pan', 'lighting', 'contrast']
    });
  }

  return baseScenes.slice(0, analysis.suggestedScenes).map((scene, index) => ({
    id: `fallback_scene_${index + 1}`,
    title: scene.title,
    prompt: scene.prompt,
    characterVariation: scene.characterVariation,
    duration: 5 + Math.floor(Math.random() * 6),
    effects: scene.effects
  }));
}

export const dynamic = 'force-dynamic';