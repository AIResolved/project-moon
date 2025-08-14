import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sectionIndex, 
      currentSection, 
      additionalPrompt, 
      researchContext, 
      forbiddenWords, 
      title, 
      theme, 
      modelName = "gpt-4o-mini",
      enhancedInstructions
    } = body;

    console.log(`🔄 Regenerating section ${sectionIndex + 1}: "${currentSection.title}"`);

    if (!currentSection) {
      return NextResponse.json(
        { error: "Missing currentSection for regeneration" },
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
    const safeTitle = title && title.trim() ? title : (currentSection.title || 'Untitled Section')
    const safeTheme = theme && theme.trim() ? theme : 'No specific theme'

    const regenerationPrompt = `
You are a professional script writer. I need you to regenerate/improve a section of a script based on the following details:

SCRIPT DETAILS:
- Title: ${safeTitle}
- Theme: ${safeTheme}
- Section ${sectionIndex + 1}: "${currentSection.title}"

CURRENT SECTION DETAILS:
- Title: ${currentSection.title}
- Writing Instructions: ${enhancedInstructions || currentSection.writingInstructions}

REGENERATION INSTRUCTIONS:
${additionalPrompt}

${additionalInstructions}

MARKDOWN FORMATTING REQUIREMENTS:
- When including any Call-to-Action (CTA) text, wrap it in **bold markdown** (e.g., **Subscribe to our channel for more amazing content!**)
- When including any Hook text, wrap it in **bold markdown** (e.g., **What if I told you everything you know is wrong?**)
- This formatting helps distinguish interactive elements from regular narrative content

Please provide a JSON response with the updated section containing:
1. "title" - An improved title for this section
2. "writingInstructions" - Enhanced writing instructions (150-250 words)

The section should be significantly improved based on the regeneration instructions while maintaining the core purpose and flow of the original section.
`;

    console.log(`📝 Sending regeneration request to ${modelName}`);
    const response = await model.invoke(regenerationPrompt);
    
    // Extract content from response
    let contentString = "";
    if (typeof response.content === 'string') {
      contentString = response.content;
    } else if (Array.isArray(response.content)) {
      contentString = response.content
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null && 'text' in item) return item.text;
          return '';
        })
        .join('\n');
    }

    // Try to parse as JSON
    let updatedSection;
    try {
      updatedSection = JSON.parse(contentString);
    } catch (parseError) {
      console.error('Failed to parse JSON response, attempting to extract section data');
      
      // Fallback: try to extract section data from the response
      const titleMatch = contentString.match(/"title"\s*:\s*"([^"]+)"/);
      const instructionsMatch = contentString.match(/"writingInstructions"\s*:\s*"([^"]+)"/);
      
      if (titleMatch && instructionsMatch) {
        updatedSection = {
          title: titleMatch[1],
          writingInstructions: instructionsMatch[1]
        };
      } else {
        // Last resort: use improved version of original section
        updatedSection = {
          title: currentSection.title + " (Improved)",
          writingInstructions: enhancedInstructions || currentSection.writingInstructions
        };
      }
    }

    // Validate the updated section
    if (!updatedSection.title || !updatedSection.writingInstructions) {
      throw new Error('Invalid section data received from model');
    }

    console.log(`✅ Successfully regenerated section ${sectionIndex + 1}: "${updatedSection.title}"`);

    return NextResponse.json({
      success: true,
      updatedSection: updatedSection
    });

  } catch (error) {
    console.error('Error regenerating section:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate section: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 