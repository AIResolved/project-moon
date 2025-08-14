"use server";

import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

interface ScriptSection {
  title: string;
  writingInstructions: string;
  narrativeRole?: string;
  storyArc?: string;
}

// Simple function to remove markdown formatting
function removeMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .trim();
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { 
      title, 
      theme, 
      sections, 
      additionalPrompt,
      scriptPrompt = "", // New separate prompt for script generation
      researchContext, 
      forbiddenWords, 
      modelName = "gpt-4o-mini",
      povSelection = "3rd Person",
      scriptFormat = "Story",
      audience = "",
      inspirationalTranscript
    } = requestData;
    
    console.log("Received request for script generation:");
    console.log("- Title:", title);
    console.log("- Theme:", theme || "Not provided");
    console.log("- POV Selection:", povSelection);
    console.log("- Script Format:", scriptFormat);
    console.log("- Audience:", audience || "Not specified");
    console.log("- Sections:", Array.isArray(sections) ? `${sections.length} sections` : "None");
    console.log("- Additional Prompt:", additionalPrompt ? "Provided" : "None");
    console.log("- Script Prompt:", scriptPrompt ? "Provided" : "None");
    console.log("- Research Context:", researchContext ? "Provided" : "None");
    console.log("- Forbidden Words:", forbiddenWords ? "Provided" : "None");
    console.log("- Model Name:", modelName);
    
    if (!title || !sections || !Array.isArray(sections) || sections.length === 0) {
      console.log("Missing or invalid required fields");
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
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
    console.log("Model initialized");

    // Build additional instructions based on optional parameters
    let additionalInstructions = "";
    
    // Add research context if provided
    if (researchContext && researchContext.trim()) {
      additionalInstructions += `
RESEARCH CONTEXT:
The following research insights should be incorporated into your script to ensure it's backed by data and analysis:

${researchContext.trim()}

Use this research to inform the content, themes, and narrative direction of your script.
`;
    }
    
    // Add script-specific prompt if provided
    if (scriptPrompt && scriptPrompt.trim()) {
      additionalInstructions += `
SCRIPT GENERATION INSTRUCTIONS:
${scriptPrompt.trim()}
`;
    }
    // Add inspirational transcript for STYLE ONLY if provided
    if (inspirationalTranscript && typeof inspirationalTranscript === 'string' && inspirationalTranscript.trim()) {
      additionalInstructions += `
STYLE REFERENCE (DO NOT COPY CONTENT):
The following transcript is provided strictly for tone, pacing, and style reference. Do NOT use its content or topics. The script must remain about "${title}" and its theme.

${inspirationalTranscript.slice(0, 5000).trim()}
`;
    }

    
    // Add general additional prompt if provided
    if (additionalPrompt && additionalPrompt.trim()) {
      additionalInstructions += `
ADDITIONAL GENERAL INSTRUCTIONS:
${additionalPrompt.trim()}
`;
    }
    
    // Add forbidden words if provided
    if (forbiddenWords && forbiddenWords.trim()) {
      const wordsList = forbiddenWords.split(',').map((word: string) => word.trim()).filter(Boolean);
      if (wordsList.length > 0) {
        additionalInstructions += `
FORBIDDEN WORDS AND PHRASES:
The following words and phrases should be completely avoided in your script: ${wordsList.join(', ')}.
Also avoid: "Would you like me to continue", "Let me continue", "Shall I proceed", "Do you want more", and similar interactive prompts.
`;
      }
    }

    // Add reminder about focusing on the title's content, not any reference material
    additionalInstructions += `

CRITICAL CONTENT FOCUS:
Your script must be about "${title}" and the theme "${theme || 'provided'}".
If any inspirational content was used during outline creation, it was ONLY for style reference.
DO NOT include content, topics, or subject matter from any reference material.
Focus exclusively on creating a story about "${title}".

CONSISTENCY REQUIREMENTS:
- Use the same character names throughout (if any characters are introduced)
- Use the same location names throughout (if any locations are mentioned)
- Use the same factual details throughout (dates, statistics, etc.)
- Maintain the same tone and style across all sections
- Ensure each section builds naturally on the previous ones without repetition
`;

    // Create character and setting consistency tracker
    const consistencyContext = {
      characters: new Set<string>(),
      locations: new Set<string>(),
      keyFacts: new Set<string>()
    };

    // Create an async function to process a single section
    const processSection = async (section: ScriptSection, index: number) => {
      try {
        console.log(`Started processing section ${index + 1}: ${section.title}`);
        
        // Build context from previous sections for consistency
        let contextInformation = "";
        if (index > 0) {
          contextInformation = `
PREVIOUS SECTION CONTEXT FOR CONSISTENCY:
This is section ${index + 1} of ${sections.length}. Maintain consistency with the story established in previous sections.
`;
        }

        // Special handling for different section roles
        let roleSpecificInstructions = "";
        if (index === 0) {
          roleSpecificInstructions = `
OPENING SECTION REQUIREMENTS:
- Establish the story foundation without spoiling later developments
- Create an engaging opening that naturally leads into the story
- Set up key elements that will be developed in later sections
- DO NOT summarize the entire story in this opening section
`;
        } else if (index === sections.length - 1) {
          roleSpecificInstructions = `
FINAL SECTION REQUIREMENTS:
- Provide a satisfying conclusion to the story established in previous sections
- Address any questions or conflicts introduced earlier
- Bring the narrative to a meaningful close
- DO NOT leave the story incomplete or with major loose ends
- This must be a proper ending, not a cliffhanger or continuation prompt
`;
        } else {
          roleSpecificInstructions = `
MIDDLE SECTION REQUIREMENTS:
- Continue developing the story from previous sections
- Advance the narrative meaningfully toward the conclusion
- Build on what was established without repeating introductory material
- Prepare for the resolution that will come in the final section
`;
        }
        
        // Create a prompt for this section
        const sectionPrompt = `
You are a professional scriptwriter creating section ${index + 1} of ${sections.length} of a complete narrative script.

SCRIPT OVERVIEW:
TITLE: ${title}
THEME: ${theme || "No specific theme provided"}
POV: Write in ${povSelection} perspective
FORMAT: This is a ${scriptFormat} format script
${audience ? `TARGET AUDIENCE: ${audience}` : ""}

CURRENT SECTION DETAILS:
SECTION ${index + 1} TITLE: ${section.title}
SECTION ROLE: ${section.narrativeRole || 'Story progression'}
STORY ARC CONTRIBUTION: ${section.storyArc || 'Advances the narrative'}
WRITING INSTRUCTIONS: ${section.writingInstructions}

${contextInformation}
${roleSpecificInstructions}
${additionalInstructions}

CRITICAL FORMATTING AND CONTENT RULES:
1. Generate ONLY the spoken narrative content for this section
2. Do NOT include any titles, headers, section names, or meta-commentary
3. Do NOT begin with greetings, introductions, or announcements
4. Start directly with the narrative content
5. Write in ${povSelection} perspective throughout
6. Follow ${scriptFormat} format conventions
7. Do NOT use interactive phrases like "Would you like me to continue", "Let me continue", etc.
8. Do NOT repeat content from other sections - each section should advance the story
9. Maintain consistency in names, places, and facts throughout the script
10. Focus on quality storytelling rather than reaching arbitrary length targets

MARKDOWN FORMATTING:
- Use **bold** for Call-to-Action (CTA) text when specified in writing instructions
- Use **bold** for Hook text when specified in writing instructions  
- Use *italics* for emphasis on important narrative points
- Keep formatting minimal and focused on narrative flow

CONTENT GUIDELINES:
- Create engaging, original content that directly relates to "${title}"
- Each section should feel like a natural part of a complete story
- Build narrative tension and resolution appropriate to this section's role
- Use specific, consistent details throughout
- Write conversational, engaging prose suitable for narration
- Ensure this section contributes meaningfully to the complete story arc

Generate the spoken narrative content for this section, ensuring it flows naturally as part of the complete ${sections.length}-part story about "${title}".`;

        // Generate content for this section
        const response = await model.invoke(sectionPrompt);
        
        // Carefully extract content ensuring it's valid text
        let sectionContent = "";
      
        if (typeof response.content === 'string') {
          sectionContent = response.content;
        } else if (Array.isArray(response.content)) {
          sectionContent = response.content
            .map(item => {
              if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'text' in item) return item.text;
              return '';
            })
            .join('\n');
        }

        // Validate we actually got content
        if (!sectionContent || sectionContent.trim() === '') {
          console.warn(`Warning: Empty content returned for section ${index + 1}`);
          sectionContent = `[Content for "${section.title}" could not be generated.]`;
        }

        // Clean up any unwanted patterns
        sectionContent = sectionContent
          .replace(/^(Title:|Section \d+:|Chapter \d+:).*$/gim, '') // Remove any title/section headers
          .replace(/^#{1,6}\s+.*$/gm, '') // Remove markdown headers
          .replace(/Would you like me to continue.*$/gim, '') // Remove continuation prompts
          .replace(/Let me continue.*$/gim, '') // Remove continuation prompts
          .replace(/Shall I proceed.*$/gim, '') // Remove continuation prompts
          .trim();

        console.log(`Completed section ${index + 1}: ${sectionContent.length} characters generated`);
        return sectionContent;

      } catch (error) {
        console.error(`Error processing section ${index + 1}:`, error);
        return `[Error generating content for section ${index + 1}: ${section.title}]`;
      }
    };

    // Process all sections sequentially to maintain consistency
    console.log("Starting sequential section processing...");
    const scriptSegments: string[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const segment = await processSection(sections[i], i);
      scriptSegments.push(segment);
    }

    // Combine all segments into the final script
    const fullScript = scriptSegments.join('\n\n');
    
    // Create cleaned version for audio (remove all markdown)
    const scriptCleaned = removeMarkdown(fullScript);

    console.log("Script generation completed successfully");
    console.log(`Total script length: ${fullScript.length} characters`);
    console.log(`Cleaned script length: ${scriptCleaned.length} characters`);
    
    return NextResponse.json({
      scriptWithMarkdown: fullScript,
      scriptCleaned: scriptCleaned,
      segments: scriptSegments,
      success: true,
      message: `Generated complete ${sections.length}-section script for "${title}"`
    });
    
  } catch (error) {
    console.error("Error in generate-full-script:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate script", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 