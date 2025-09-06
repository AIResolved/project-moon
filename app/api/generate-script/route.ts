import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Zod schema for script sections
const scriptSectionsSchema = z.array(z.object({
  title: z.string(),
  writingInstructions: z.string(),
  narrativeRole: z.string().describe("The role this section plays in the overall story structure"),
  storyArc: z.string().describe("How this section contributes to the complete story arc")
}));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is the new script generation flow
    if ('title' in body && 'theme' in body) {
      return handleNewScriptGeneration(body);
    }
    
    // Otherwise, handle the old image-based script generation
    return handleImageScriptGeneration(body);
  } catch (error) {
    console.error('Error in script generation route:', error)
    return NextResponse.json(
      { error: 'Failed to generate script: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

function getFormatSpecificPrompt(
  title: string,
  theme: string,
  povSelection: string,
  scriptFormat: string,
  audience: string,
  normalizedSections: number,
  additionalInstructions: string,
  parser: any
): string {
  const baseInfo = `
- Title: ${title}
- Theme: ${theme || "No specific theme provided"}
- POV: ${povSelection}
- Format: ${scriptFormat}
- Target Audience: ${audience || "General audience"}
`;

  switch (scriptFormat) {
    case 'Facts':
      return `Create a comprehensive ${normalizedSections}-part factual presentation for "${title}".

FACTUAL CONTENT REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} sections that logically organize the factual information
2. Each section should focus on a specific aspect or category of facts about the topic
3. Present information in a clear, educational format
4. Use bullet points, numbered lists, or clear statements to present facts
5. Include specific data, statistics, dates, and verifiable information when relevant

CONTENT REQUIREMENTS:
- Focus on accuracy, clarity, and educational value
- Present information in an engaging but informative manner
- Use clear, direct language appropriate for the target audience
- Avoid fictional elements, characters, or narrative storylines
- Include relevant examples, case studies, or real-world applications
- Structure information from general to specific within each section

${additionalInstructions}

${parser.getFormatInstructions()}

Create an informative, fact-based presentation that educates the audience about "${title}" through well-organized, verifiable information.`;

    case 'Documentary':
      return `Create a ${normalizedSections}-part documentary script outline for "${title}".

DOCUMENTARY REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} sections that build a comprehensive documentary narrative
2. Include interview segments, archival footage cues, and expert commentary
3. Balance storytelling with factual information and evidence
4. Progress from background/context to deeper investigation or analysis
5. Conclude with insights, implications, or calls to action

CONTENT REQUIREMENTS:
- Combine narrative storytelling with factual documentation
- Include references to real people, events, and evidence
- Suggest interview subjects and visual elements
- Maintain journalistic integrity while engaging the audience
- Use documentary-style language and pacing
- Include transitions between different types of content (interviews, footage, narration)

${additionalInstructions}

${parser.getFormatInstructions()}

Create a compelling documentary script that informs and engages viewers about "${title}" through a blend of storytelling and factual investigation.`;

    case 'Tutorial':
      return `Create a step-by-step ${normalizedSections}-part tutorial for "${title}".

TUTORIAL REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} sections that represent logical learning progression
2. Each section should build upon knowledge from previous sections
3. Include clear step-by-step instructions and explanations
4. Provide examples, tips, and common mistakes to avoid
5. End with practical application or next steps for the learner

CONTENT REQUIREMENTS:
- Use clear, instructional language that's easy to follow
- Break down complex concepts into manageable steps
- Include practical examples and real-world applications
- Anticipate common questions and provide clarification
- Use "how-to" language and direct instruction
- Include checkpoints or ways to verify understanding

${additionalInstructions}

${parser.getFormatInstructions()}

Create a comprehensive tutorial that effectively teaches the audience about "${title}" through clear, actionable instruction.`;

    case 'Interview':
      return `Create a ${normalizedSections}-part interview script format for "${title}".

INTERVIEW FORMAT REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} segments that explore different aspects of the topic
2. Format as interviewer questions and anticipated responses
3. Progress from general introduction to deeper, more specific topics
4. Include follow-up questions and conversation flow
5. Conclude with summary insights or key takeaways

CONTENT REQUIREMENTS:
- Write both interviewer questions and suggested responses/topics
- Use conversational, engaging language appropriate for dialogue
- Include probing follow-up questions to explore topics deeply
- Balance prepared structure with natural conversation flow
- Include transitions between topics and sections
- Consider audience engagement through relatable questions

${additionalInstructions}

${parser.getFormatInstructions()}

Create an engaging interview-style script that explores "${title}" through thoughtful questions and comprehensive discussion.`;

    case 'Presentation':
      return `Create a ${normalizedSections}-part presentation script for "${title}".

PRESENTATION REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} sections with clear presentation flow
2. Include opening hook, main content sections, and strong conclusion
3. Structure for visual aids, slides, and audience interaction points
4. Build arguments or information logically and persuasively
5. Include clear transitions between sections and key points

CONTENT REQUIREMENTS:
- Use presentation-style language suitable for speaking aloud
- Include cues for visual elements, slides, or demonstrations
- Structure content for maximum audience engagement and retention
- Use rhetorical devices, repetition, and memorable phrases
- Include opportunities for audience questions or interaction
- Balance informative content with persuasive elements

${additionalInstructions}

${parser.getFormatInstructions()}

Create a compelling presentation script that effectively communicates "${title}" to engage and inform the audience.`;

    case 'Story':
    default:
      return `Create a complete ${normalizedSections}-part story script outline for "${title}".

STORY REQUIREMENTS:
${baseInfo}

STRUCTURAL REQUIREMENTS:
1. Create exactly ${normalizedSections} sections that naturally divide the complete story
2. Each section must have a clear narrative purpose (setup, development, climax, resolution)
3. The final section MUST provide a satisfying conclusion to the story
4. Maintain consistent character names, locations, and details throughout
5. Ensure the story has a complete arc from beginning to end

CONTENT REQUIREMENTS:
- Focus on compelling storytelling and natural narrative flow
- Avoid repetitive content, especially avoid repeating the introduction in later sections
- Each section should advance the story meaningfully
- Use specific, consistent details (if mentioning locations, use the same names throughout)
- Create engaging, original content that serves the story

${additionalInstructions}

${parser.getFormatInstructions()}

Create a compelling, complete story that audiences will want to follow from start to finish. Make sure the story reaches a proper conclusion in the final section.`;
  }
}

async function handleNewScriptGeneration(body: any) {
  const { 
    title, 
    theme, 
    additionalPrompt,
    sectionPrompt = "", // New separate prompt for section generation
    researchContext,
    inspirationalTranscript, 
    forbiddenWords,
    modelName = "gpt-4o-mini",
    povSelection = "3rd Person",
    scriptFormat = "Story",
    audience = "",
    targetSections = 3 // Note: frontend may pass desired word count; we'll normalize below
  } = body;
  
  if (!title) {
    return NextResponse.json(
      { error: "Missing required title field" },
      { status: 400 }
    );
  }

  // Initialize the model
  let model;
  if (modelName.startsWith('claude')) {
    model = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      modelName: modelName,
    });
  } else {
    model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: modelName,
    });
  }

  // Create a parser based on our Zod schema
  const parser = StructuredOutputParser.fromZodSchema(scriptSectionsSchema);

  // Build additions to the prompt based on optional parameters
  let additionalInstructions = "";
  
  // Add research context if provided
  if (researchContext && researchContext.trim()) {
    additionalInstructions += `
RESEARCH CONTEXT:
The following research insights should be incorporated into your script to ensure it's backed by data and analysis:

${researchContext.trim()}

Use this research to inform the content, themes, and narrative direction of your script sections.
`;
  }
  
  // Add transcript as inspiration if provided
  if (inspirationalTranscript && inspirationalTranscript.trim()) {
    additionalInstructions += `
INSPIRATIONAL TRANSCRIPT FOR STYLE REFERENCE ONLY:
The following transcript should ONLY be used as inspiration for the tone, style, structure, and format of your script.
DO NOT use the content, topic, or subject matter from this transcript.
Your script must be about the title "${title}" and theme "${theme || 'provided'}", NOT about the topics mentioned in this transcript.

Use this transcript to understand:
- Writing style and tone
- Narrative structure and pacing
- How scenes flow and transition
- Storytelling techniques and format
- Dialogue style (if applicable)

TRANSCRIPT FOR STYLE REFERENCE:
${inspirationalTranscript.slice(0, 5000).trim()}

IMPORTANT: Create your story about "${title}" using the above transcript's STYLE ONLY, not its content or topic.
`;
  }
  
  // Add forbidden words if provided
  if (forbiddenWords && forbiddenWords.trim()) {
    const wordsList = forbiddenWords.split(',').map((word: string) => word.trim()).filter(Boolean);
    if (wordsList.length > 0) {
      additionalInstructions += `
FORBIDDEN WORDS AND PHRASES:
The following words and phrases should be completely avoided in your script outline: ${wordsList.join(', ')}.
Also avoid: "Would you like me to continue", "Let me continue", "Shall I proceed", "Do you want more", and similar interactive prompts.
`;
    }
  }
  
  // Add any section-specific custom instructions
  if (sectionPrompt && sectionPrompt.trim()) {
    additionalInstructions += `
SECTION GENERATION INSTRUCTIONS:
${sectionPrompt.trim()}
`;
  }
  
  // Add any additional custom instructions
  if (additionalPrompt && additionalPrompt.trim()) {
    additionalInstructions += `
ADDITIONAL GENERAL INSTRUCTIONS:
${additionalPrompt.trim()}
`;
  }

  // Create a comprehensive story structure prompt
  const systemPrompt = `You are a master storyteller and script writer. Your task is to create a complete, well-structured narrative outline that tells a full story from beginning to end.

CRITICAL REQUIREMENTS:
1. Create a COMPLETE story that has a clear beginning, middle, and satisfying ending/resolution
2. Ensure the story naturally flows from introduction through conflict to resolution
3. The final section must provide closure and resolution to the central conflict or question
4. Maintain consistency in character names, locations, and story elements throughout
5. Do not use interactive phrases like "Would you like me to continue" or similar
6. Focus on quality storytelling rather than meeting specific length requirements
7. Create natural section breaks based on story beats, not arbitrary divisions

STORY STRUCTURE GUIDELINES:
- Opening: Establish the premise, characters, and central question/conflict
- Development: Build tension, explore the topic, introduce complications
- Climax: Address the central conflict or reveal key insights
- Resolution: Provide closure, answers, and meaningful conclusion

Each section should serve a specific narrative purpose and contribute to the complete story arc.`;

  // Normalize: if frontend passed a large number (assumed desired words), convert to sections (~750 words per section)
  const normalizedSections = typeof targetSections === 'number' && targetSections > 20
    ? Math.max(1, Math.ceil(targetSections / 750))
    : targetSections;

  const userPrompt = getFormatSpecificPrompt(
    title, 
    theme, 
    povSelection, 
    scriptFormat, 
    audience, 
    normalizedSections, 
    additionalInstructions,
    parser
  );

  try {
    console.log(`Generating ${targetSections} sections for story structure`);

    // Generate the complete outline in one request to ensure consistency
    const result = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    let resultContent = "";
    if (typeof result.content === 'string') {
      resultContent = result.content;
    } else if (Array.isArray(result.content)) {
      resultContent = result.content
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) return item.text;
          return '';
        })
        .join('\n');
    }

    console.log("Raw LLM result:", resultContent);

    // Parse the result
    const sections = await parser.parse(resultContent);
    console.log("Parsed sections:", sections);

    return NextResponse.json({
      sections: sections,
      success: true,
      message: `Generated ${sections.length} story sections with complete narrative arc`
    });

  } catch (error) {
    console.error("Error generating script outline:", error);
    
    // Fallback with manual structure if parsing fails
    const fallbackSections = [
      {
        title: "Opening",
        writingInstructions: `Introduce the central premise of "${title}". Set up the main question, conflict, or journey that will drive the narrative. Establish key characters or concepts. Create an engaging hook that draws the audience in.`,
        narrativeRole: "Introduction and setup",
        storyArc: "Establishes the foundation and central premise"
      },
      {
        title: "Development", 
        writingInstructions: `Develop the central story of "${title}". Build tension, explore the main themes, introduce complications or deeper insights. Advance the narrative significantly from the opening.`,
        narrativeRole: "Story development and conflict building",
        storyArc: "Builds tension and develops the central narrative"
      },
      {
        title: "Resolution",
        writingInstructions: `Bring "${title}" to a satisfying conclusion. Address the central conflict or question established in the opening. Provide closure, resolution, and meaningful takeaways for the audience. End the story completely.`,
        narrativeRole: "Climax and resolution", 
        storyArc: "Provides closure and completes the story arc"
      }
    ];

    return NextResponse.json({
      sections: fallbackSections,
      success: true,
      message: "Generated fallback story structure"
    });
  }
}

async function handleImageScriptGeneration(body: any) {
  const { imageDataUrl, imageName, prompt, batchInfo, wordCount } = body;

    if (!imageDataUrl || !prompt) {
      return NextResponse.json(
        { error: 'Image data and prompt are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using mock generation')
      const mockScript = generateMockScript(imageName, prompt, wordCount)
      return NextResponse.json({
        success: true,
        script: mockScript,
        imageName: imageName,
        usingMock: true
      })
    }

    // Log batch information if provided
    if (batchInfo) {
      console.log(`🚀 [Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}] Generating script ${batchInfo.imageIndex}/${batchInfo.batchSize} for: ${imageName}`)
    } else {
      console.log(`🚀 Generating script for image: ${imageName}`)
    }

    // Calculate max_tokens based on word count (roughly 1.3 tokens per word, with some buffer)
    const targetWordCount = wordCount || 150 // Default to 150 words if not specified
    const maxTokens = Math.min(Math.max(Math.round(targetWordCount * 1.5), 100), 1000) // Min 100, max 1000 tokens

    let wordCountInstruction = ""
    if (targetWordCount > 800) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount+200} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 500) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount+150} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 300) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount+100} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 100) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount+30} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 50) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 25) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount} words. feel free to add some extra words to make it more detailed and engaging.`
    } else if (targetWordCount > 10) {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount} words. feel free to add some extra words to make it more detailed and engaging.`
    } else {
      wordCountInstruction = `Please write a very detailed script approximately ${targetWordCount+300} words. feel free to add some extra words to make it more detailed and engaging.`
    }
    // Create word count instruction

    try {
      const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${prompt}`
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `${wordCountInstruction}`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl, // Using data URL directly
                },
              },
            ],
          }
        ],
      })

      const script = response.choices[0]?.message?.content?.trim()
      
      if (script) {
        if (batchInfo) {
          console.log(`✅ [Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}] Script generated ${batchInfo.imageIndex}/${batchInfo.batchSize} for: ${imageName}`)
        } else {
          console.log(`✅ Generated script for image: ${imageName}`)
        }
        return NextResponse.json({
          success: true,
          script: script,
          imageName: imageName,
          usingMock: false
        })
      } else {
        console.error(`❌ No script generated for image: ${imageName}`)
        throw new Error('No content generated from OpenAI')
      }

    } catch (openaiError: any) {
      if (batchInfo) {
        console.error(`❌ [Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}] OpenAI API error for ${imageName}:`, openaiError)
      } else {
        console.error(`❌ OpenAI API error for ${imageName}:`, openaiError)
      }
      
      // Fallback to mock if OpenAI fails
      const mockScript = generateMockScript(imageName, prompt, wordCount)
      return NextResponse.json({
        success: true,
        script: `[AI Unavailable - Mock Script]\n\n${mockScript}`,
        imageName: imageName,
        usingMock: true,
        error: openaiError.message
      })
  }
}

// Enhanced mock script generation function (fallback)
function generateMockScript(imageName: string, prompt: string, wordCount?: number): string {
  const targetWordCount = wordCount || 150
  
  const templates = [
    `In this captivating image titled "${imageName}", we witness a compelling visual narrative. ${prompt} The composition draws our attention through carefully balanced elements, where light and shadow work together to create depth and meaning. Every detail contributes to the overall story, from the subtle color palette to the thoughtful framing that guides our emotional response.`,
    
    `"${imageName}" presents a striking visual story that speaks directly to the viewer's imagination. ${prompt} The artistic vision is evident in the way visual elements are orchestrated - the interplay of textures, the rhythm of lines, and the harmony of colors all work to create a cohesive and impactful image. The photographer's or artist's technical skill is matched by their creative vision.`,
    
    `This remarkable image, "${imageName}", captures a moment that transcends the ordinary. ${prompt} The visual narrative unfolds through layers of meaning - from the immediate visual impact to the subtle details that reward closer inspection. The composition demonstrates mastery of both technical execution and artistic vision, creating an image that resonates with emotional depth.`,
    
    `In "${imageName}", we encounter a powerful visual statement that demands attention. ${prompt} The image succeeds in creating a dialogue between the subject and the viewer, using visual language that speaks across cultural and temporal boundaries. The careful attention to light, composition, and timing results in a photograph that captures not just a moment, but an entire mood and atmosphere.`
  ]

  const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
  
  // Enhanced context based on image characteristics
  let additionalContext = ""
  const lowerName = imageName.toLowerCase()
  
  if (lowerName.includes('landscape') || lowerName.includes('nature') || lowerName.includes('outdoor')) {
    additionalContext = " The natural world reveals its beauty through this composition, where organic forms and natural lighting create a sense of peace and wonder. The image invites us to pause and appreciate the subtle complexities of the natural environment."
  } else if (lowerName.includes('portrait') || lowerName.includes('people') || lowerName.includes('person')) {
    additionalContext = " The human presence in this image adds layers of emotional complexity, where expression, gesture, and positioning work together to tell a deeply personal story. The connection between subject and viewer creates an intimate and engaging experience."
  } else if (lowerName.includes('architecture') || lowerName.includes('building') || lowerName.includes('urban')) {
    additionalContext = " The architectural elements showcase the intersection of human creativity and functional design, where geometric forms and structural elements create a visual rhythm that speaks to our built environment's impact on daily life."
  } else if (lowerName.includes('abstract') || lowerName.includes('art') || lowerName.includes('creative')) {
    additionalContext = " The abstract qualities of this composition challenge conventional viewing, inviting interpretation and personal reflection. The interplay of form, color, and texture creates a visual language that speaks to the imagination."
  } else {
    additionalContext = " The unique character of this image stems from its ability to transform the ordinary into something extraordinary, revealing beauty and meaning in unexpected places."
  }

  // Combine template and additional context
  let fullScript = randomTemplate + additionalContext
  
  // Adjust script length to match target word count
  const words = fullScript.split(/\s+/)
  
  if (words.length > targetWordCount) {
    // Truncate to target word count
    fullScript = words.slice(0, targetWordCount).join(' ')
    if (!fullScript.endsWith('.')) {
      fullScript += '.'
    }
  } else if (words.length < targetWordCount && targetWordCount > 100) {
    // Extend with additional descriptive content
    const extensions = [
      " The interplay of light and shadow creates a dynamic visual rhythm that guides the viewer's eye through the composition.",
      " Each element within the frame has been carefully considered, contributing to the overall narrative and emotional impact.",
      " The technical execution demonstrates a deep understanding of both artistic principles and the medium's capabilities.",
      " This image stands as a testament to the photographer's ability to capture not just what is seen, but what is felt.",
      " The composition invites multiple readings, revealing new details and meanings with each viewing experience.",
      " Through careful use of color, texture, and form, the image creates a lasting impression that resonates long after viewing."
    ]
    
    while (fullScript.split(/\s+/).length < targetWordCount && extensions.length > 0) {
      const randomExtension = extensions.splice(Math.floor(Math.random() * extensions.length), 1)[0]
      fullScript += randomExtension
      
      if (fullScript.split(/\s+/).length >= targetWordCount) {
        const finalWords = fullScript.split(/\s+/).slice(0, targetWordCount)
        fullScript = finalWords.join(' ')
        if (!fullScript.endsWith('.')) {
          fullScript += '.'
        }
        break
      }
    }
  }

  return fullScript
}
