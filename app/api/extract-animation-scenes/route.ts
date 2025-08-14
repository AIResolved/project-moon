import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedAnimationScene {
  id: string;
  title: string;
  prompt: string;
  duration?: number;
  effects?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { script, numberOfScenes = 5, mainContext = '' } = await request.json();

    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      );
    }

    console.log(`🎬 Extracting ${numberOfScenes} animation scenes from script...`);
    console.log(`📝 Script length: ${script.length} characters`);
    if (mainContext.trim()) {
      console.log(`🎯 Using main context: "${mainContext}"`);
    }

    const contextInstruction = mainContext.trim() 
      ? `\n\nIMPORTANT: All animation prompts should be based on this image/character context: "${mainContext}"\nEach prompt should start with or include this context and then describe how it moves/animates according to the script scene.`
      : '';

    const systemPrompt = `You are an expert animation director and motion graphics artist. Your task is to analyze a script and extract specific animation scenes that would work well for video content creation.

For each scene, you need to provide:
1. A descriptive title
2. A detailed animation prompt that includes:
   - Camera movements (zoom, pan, rotate, tilt)
   - Visual effects (particles, glow, blur, transitions)
   - Motion characteristics (speed, direction, style)
   - Atmospheric elements (lighting, mood, environment)
3. Suggested duration in seconds
4. Key effects that should be emphasized

Focus on creating visually dynamic and engaging animations that would work well with AI video generation tools.${contextInstruction}

Example animation prompt: "Slow zoom in on a glowing book while golden particles float around it, soft warm lighting creates a magical atmosphere, camera gently rotates 15 degrees clockwise, depth of field effect blurs the background"

${mainContext.trim() ? `Example with context: "A stickman figure on a white background swinging on jungle lianas, camera follows the motion with smooth tracking, green particles fall like leaves, dynamic movement from left to right"` : ''}

Return EXACTLY ${numberOfScenes} scenes as a JSON array with this structure:
[
  {
    "id": "scene_1",
    "title": "Opening Scene Title",
    "prompt": "Detailed animation description with camera movements, effects, and atmosphere${mainContext.trim() ? ' (incorporating the provided context)' : ''}",
    "duration": 8,
    "effects": ["zoom", "particles", "glow", "rotation"]
  }
]

Make each animation prompt:
- Highly specific and detailed (minimum 20 words, maximum 100 words)
- Include precise camera movements and effects
- Specify timing and pacing elements
- Mention visual style and atmosphere
- Be suitable for AI video generation tools
- Focus on dynamic, engaging motion
${mainContext.trim() ? '- MUST incorporate the provided image/character context' : ''}

Script to analyze: "${script}"`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract ${numberOfScenes} animation scenes from this script and return them as a JSON array. Focus on creating dynamic, visually engaging animation prompts.` }
      ],
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log(`🤖 OpenAI response: ${response.substring(0, 200)}...`);

    // Extract JSON from response
    let extractedScenes: ExtractedAnimationScene[];
    try {
      // Try to find JSON array in the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedScenes = JSON.parse(jsonMatch[0]);
      } else {
        // If no array found, try to parse the entire response
        extractedScenes = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback: create basic scenes from the text response
      const lines = response.split('\n').filter(line => line.trim().length > 10);
      extractedScenes = lines.slice(0, numberOfScenes).map((line, index) => ({
        id: `scene_${index + 1}`,
        title: `Animation Scene ${index + 1}`,
        prompt: line.trim().replace(/^\d+\.?\s*/, ''),
        duration: 5 + Math.floor(Math.random() * 10), // Random duration 5-15 seconds
        effects: ['smooth motion', 'dynamic camera']
      }));
    }

    // Ensure we have the right number of scenes
    if (extractedScenes.length > numberOfScenes) {
      extractedScenes = extractedScenes.slice(0, numberOfScenes);
    }

    // Validate and enhance each scene
    const validatedScenes = extractedScenes.map((scene, index) => ({
      id: scene.id || `scene_${index + 1}`,
      title: scene.title || `Animation Scene ${index + 1}`,
      prompt: scene.prompt || 'Dynamic camera movement with smooth transitions',
      duration: scene.duration || (5 + Math.floor(Math.random() * 10)),
      effects: scene.effects || ['camera movement', 'smooth transition']
    }));

    console.log(`✅ Successfully extracted ${validatedScenes.length} animation scenes`);
    validatedScenes.forEach((scene, index) => {
      console.log(`   Scene ${index + 1}: ${scene.title} (${scene.duration}s)`);
    });

    return NextResponse.json({
      success: true,
      scenes: validatedScenes,
      totalScenes: validatedScenes.length,
      scriptLength: script.length
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

export const dynamic = 'force-dynamic';