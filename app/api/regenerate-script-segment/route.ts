import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      segmentIndex, 
      segmentContent, 
      title, 
      theme, 
      additionalPrompt, 
      researchContext, 
      forbiddenWords, 
      modelName = "gpt-4o-mini"
    } = body;

    console.log(`🔄 Regenerating script segment ${segmentIndex + 1}`);

    if (!segmentContent) {
      return NextResponse.json(
        { error: "Missing segmentContent for regeneration" },
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

    // Build additional instructions
    let additionalInstructions = "";
    
    if (researchContext && researchContext.trim()) {
      additionalInstructions += `
RESEARCH CONTEXT:
${researchContext.trim()}
`;
    }
    
    if (forbiddenWords && forbiddenWords.trim()) {
      const wordsList = forbiddenWords.split(',').map((word: string) => word.trim()).filter(Boolean);
      if (wordsList.length > 0) {
        additionalInstructions += `
FORBIDDEN WORDS:
Avoid these words: ${wordsList.join(', ')}.
`;
      }
    }

    // Create the regeneration prompt
    const safeTitle = (title && title.trim()) ? title : `Script Segment ${segmentIndex + 1}`
    const safeTheme = (theme && theme.trim()) ? theme : 'No specific theme'

    const regenerationPrompt = `
You are a professional script writer. I need you to rewrite/improve a segment of a script while ensuring it flows naturally within the larger narrative context.

SCRIPT DETAILS:
- Title: ${safeTitle}
- Theme: ${safeTheme}
- This is segment ${segmentIndex + 1} of a larger script

CURRENT SEGMENT CONTENT TO REWRITE:
${segmentContent}

REGENERATION INSTRUCTIONS:
${additionalPrompt}

${additionalInstructions}

CONTEXTUAL FLOW REQUIREMENTS:
- This segment must connect smoothly with the content before and after it
- Preserve any section headers, timestamps, or structural elements that provide narrative continuity
- Maintain the same tone and pacing as the original to ensure seamless integration
- Keep the same general length to maintain overall script timing

MARKDOWN FORMATTING REQUIREMENTS:
- When including any Call-to-Action (CTA) text, wrap it in **bold markdown** (e.g., **Subscribe to our channel for more amazing content!**)
- When including any Hook text, wrap it in **bold markdown** (e.g., **What if I told you everything you know is wrong?**)
- This formatting helps distinguish interactive elements from regular narrative content

IMPORTANT FORMATTING RULES:
1. Do NOT begin your rewritten content with the title, section name, or any form of header/title text.
2. Do NOT include any greetings like "Hi!", "Hello", or similar phrases unless they are part of the natural narrative.
3. Start directly with the narrative content.
4. Do NOT repeat the title within the content.
5. Maintain the same approximate word count as the original segment.
6. Preserve the original structure (paragraphs, sections) for natural flow continuity.
7. Focus on enhancing clarity, engagement, and smooth transitions rather than restructuring.

Please provide ONLY the rewritten segment content (the actual script text that will be spoken), maintaining the original's structural flow and formatting. Do not add explanations or meta-commentary. The improved content should integrate seamlessly when regeneration is complete.
`;

    console.log(`📝 Sending segment regeneration request to ${modelName}`);
    const response = await model.invoke(regenerationPrompt);
    
    // Extract content from response
    let regeneratedContent = "";
    if (typeof response.content === 'string') {
      regeneratedContent = response.content;
    } else if (Array.isArray(response.content)) {
      regeneratedContent = response.content
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null && 'text' in item) return item.text;
          return '';
        })
        .join('\n');
    }

    // Clean up the content
    regeneratedContent = regeneratedContent.trim();
    
    // Calculate word count
    const wordCount = regeneratedContent.split(/\s+/).filter(Boolean).length;

    if (!regeneratedContent) {
      throw new Error('No content generated from model');
    }

    console.log(`✅ Successfully regenerated script segment ${segmentIndex + 1} with ${wordCount} words`);

    return NextResponse.json({
      success: true,
      regeneratedContent: regeneratedContent,
      wordCount: wordCount
    });

  } catch (error) {
    console.error('Error regenerating script segment:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate script segment: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 