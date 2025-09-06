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
    let referenceImage: File | null = null;
    let numberOfScenes: number = 5;
    let referenceAnalysis: any = null;

    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // New FormData approach with reference image
      const formData = await request.formData();
      script = formData.get('script') as string;
      referenceImage = formData.get('referenceImage') as File;
      const numberOfScenesStr = formData.get('numberOfScenes') as string;
      numberOfScenes = numberOfScenesStr ? parseInt(numberOfScenesStr) : 10;
      
      console.log(`🖼️ Reference image provided: ${referenceImage !== null}`);
      console.log(`🎯 Number of scenes requested: ${numberOfScenes}`);
      
      // Perform comprehensive reference image analysis
      if (referenceImage) {
        console.log("🔍 Starting comprehensive reference image analysis for scene extraction...");
        try {
          const buffer = Buffer.from(await referenceImage.arrayBuffer());
          const base64Image = buffer.toString('base64');
          
          const visionResponse = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this reference image for UI display. Provide a brief breakdown:

ART_STYLE: [Brief description of the artistic style]
CHARACTER_DESIGN: [Brief character design description]
COLOR_PALETTE: [Main colors used]
TECHNIQUE: [Drawing technique used]

Keep each section to 1-2 sentences.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${referenceImage.type};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 300
          });
          
          const analysisText = visionResponse.choices[0]?.message?.content || "";
          
          // Parse the simplified structured response
          referenceAnalysis = {
            artStyle: extractSection(analysisText, 'ART_STYLE'),
            characterDesign: extractSection(analysisText, 'CHARACTER_DESIGN'),
            colorPalette: extractSection(analysisText, 'COLOR_PALETTE'),
            proportions: "Match reference proportions",
            technique: extractSection(analysisText, 'TECHNIQUE'),
            visualElements: "Use reference visual elements",
            atmosphere: "Create reference atmosphere",
            composition: "Apply reference composition",
            sceneGuidance: "Apply consistent reference styling across all scenes",
            fullAnalysis: analysisText
          };
          
          console.log("📝 Reference analysis for scenes completed:");
          console.log("🎨 Art Style:", referenceAnalysis.artStyle?.substring(0, 100) + "...");
          console.log("📋 Scene Guidance:", referenceAnalysis.sceneGuidance?.substring(0, 100) + "...");
          
        } catch (error) {
          console.warn("⚠️ Could not analyze reference image for scenes:", error);
          referenceAnalysis = {
            sceneGuidance: "Apply the reference image style consistently across all scenes"
          };
        }
      }
    } else {
      // Legacy JSON approach
      const data = await request.json();
      script = data.script;
      numberOfScenes = data.numberOfScenes || 5;
    }

    // Helper function to extract sections from analysis
    function extractSection(text: string, sectionName: string): string {
      const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z_]+:|$)`);
      const match = text.match(regex);
      return match?.[1]?.trim() || `Apply ${sectionName.toLowerCase()} from reference image`;
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
    
    // Create system prompt based on whether we have reference analysis
    let systemPrompt: string;
    
    if (referenceAnalysis) {
      // Create concise summaries for the prompt
      const artStyleSummary = referenceAnalysis.artStyle.substring(0, 80) + (referenceAnalysis.artStyle.length > 80 ? "..." : "")
      const characterSummary = referenceAnalysis.characterDesign.substring(0, 60) + (referenceAnalysis.characterDesign.length > 60 ? "..." : "")
      const colorSummary = referenceAnalysis.colorPalette.substring(0, 50) + (referenceAnalysis.colorPalette.length > 50 ? "..." : "")
      const techniqueSummary = referenceAnalysis.technique.substring(0, 60) + (referenceAnalysis.technique.length > 60 ? "..." : "")
      
      systemPrompt = `You are an expert animation director. Create animation scenes using this REFERENCE STYLE ANALYSIS:

STYLE TO APPLY:
• Art: ${artStyleSummary}
• Characters: ${characterSummary}
• Colors: ${colorSummary}
• Technique: ${techniqueSummary}

CHARACTER STRATEGY:
${characterAnalysis.characters.length > 1 ? `
DETECTED: ${characterAnalysis.characters.join(', ')}
- Apply analyzed style to ALL characters consistently
- Each character follows same artistic approach but remains distinguishable
- Maintain visual consistency across all scenes
` : `
- Apply analyzed style consistently to all visual elements
- Maintain complete stylistic coherence
`}`;
    } else {
      systemPrompt = `You are an expert animation director specializing in character-based video content. Your task is to analyze a script and create animation scenes that apply consistent visual styling.

STYLE APPLICATION INSTRUCTION:
"Create consistent visual styling across all animation scenes."

CHARACTER VARIATION STRATEGY:
${characterAnalysis.characters.length > 1 ? `
DETECTED CHARACTERS: ${characterAnalysis.characters.join(', ')}
- Maintain consistent artistic approach across all characters
- Each character should be distinguishable but follow the same visual style
- Apply consistent styling to clothing, features, and proportions
` : `
Apply consistent visual styling to all scenes and characters.
`}`;
    }

    systemPrompt += `

For each scene, provide:
1. A descriptive title
2. A detailed animation prompt that:${referenceAnalysis ? `
   - Incorporates the analyzed style elements
   - Applies consistent character design and colors` : `
   - Creates consistent visual styling
   - Applies coherent character design`}
   - Includes dynamic camera movements and cinematic effects
   - Specifies motion, lighting, and atmosphere
3. Character variation description
4. Duration (5-10 seconds)
5. Key visual effects

Return a JSON array with exactly ${Math.max(characterAnalysis.suggestedScenes, 3)} scenes:
[
  {
    "id": "scene_1",
    "title": "Scene Title",
    "prompt": "${referenceAnalysis ? `Apply reference style consistently. [describe scene action with camera movements, lighting, effects]` : `Create scene with consistent styling. [describe scene action with camera movements, lighting, effects]`}",
    "characterVariation": "How the reference style is adapted for this scene",
    "duration": 6,
    "effects": ["zoom", "particles", "character_motion", "lighting"]
  }
]

PROMPT REQUIREMENTS:
- Apply the analyzed style consistently${referenceAnalysis ? ' using the reference analysis' : ''}
- Add cinematic camera movements (zoom, pan, rotation, tracking)
- Describe lighting and atmospheric effects  
- Make suitable for AI image generation (landscape 16:9 format)
- Keep each prompt 50-150 words for optimal generation

Script to analyze:
"${script}"`

    console.log(`📝 System prompt length: ${systemPrompt.length} characters`);

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

    // Validate and enhance scenes with character variations and reference analysis
    const validatedScenes = extractedScenes.map((scene, index) => ({
      id: scene.id || `scene_${index + 1}`,
      title: scene.title || `Character Scene ${index + 1}`,
      prompt: scene.prompt || (referenceAnalysis ? 
        `Apply the analyzed reference style: ${referenceAnalysis.artStyle} with ${referenceAnalysis.characterDesign}. Character performing dynamic motion with smooth camera tracking in landscape format.` :
        `Character performing dynamic motion with smooth camera tracking in consistent visual style.`),
      characterVariation: scene.characterVariation || (referenceAnalysis ?
        `Reference style (${referenceAnalysis.artStyle}) applied to scene ${index + 1}` :
        `Consistent style applied to scene ${index + 1}`),
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
      referenceAnalysis: referenceAnalysis,
      referenceUsed: referenceImage !== null,
      enhancedPrompts: referenceAnalysis !== null
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