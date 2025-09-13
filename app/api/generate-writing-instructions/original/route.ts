import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define the Zod schema for structured output
const WritingSection = z.object({
  title: z.string().describe("Section title"),
  writingInstructions: z.string().describe("Detailed, comprehensive writing instructions for this section")
});

const WritingInstructions = z.object({
  sections: z.array(WritingSection).describe("Array of sections with detailed writing instructions")
});

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      theme = '',
      targetAudience = "women over 60",
      genre = "contemporary inspirational fiction novelette",
      outline = null,
      characters = [],
      themes = [],
      setting = '',
      sections = [], // This now contains both title and summary
      sectionPrompt = '',
      scriptPrompt = '',
      additionalPrompt = '',
      forbiddenWords = '',
      selectedModel = 'gpt-4o-mini',
      targetWordCount = 15000
    } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'Sections are required' }, { status: 400 });
    }

    // Create ChatOpenAI model with structured output
    const model = new ChatOpenAI({
      model: selectedModel,
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY
    });

    const structuredModel = model.withStructuredOutput(WritingInstructions);

    let prompt = `Generate detailed writing instructions for each section of "${title}".

STORY DETAILS:
Title: ${title}
Genre: ${genre}
Target Audience: ${targetAudience}
${theme ? `Theme: ${theme}` : ''}
Target Word Count: ${targetWordCount} words

${outline ? `STORY OUTLINE:
Act 1: ${outline.act1}
Act 2: ${outline.act2}
Act 3: ${outline.act3}

` : ''}${characters.length > 0 ? `CHARACTERS:
${characters.map((char: any) => `- ${char.name} (${char.role}): ${char.description}${char.arc ? `\n  Character Arc: ${char.arc}` : ''}`).join('\n')}

` : ''}${setting ? `SETTING: ${setting}

` : ''}${themes.length > 0 ? `THEMES: ${themes.join(', ')}

` : ''}SECTIONS WITH SUMMARIES:
${sections.map((section: any, index: number) => `${index + 1}. ${section.title}\n   Summary: ${section.summary}`).join('\n\n')}

${sectionPrompt ? `Section Guidelines: ${sectionPrompt}\n` : ''}${scriptPrompt ? `Writing Style Instructions: ${scriptPrompt}\n` : ''}${additionalPrompt ? `Additional Instructions: ${additionalPrompt}\n` : ''}${forbiddenWords ? `Words to avoid: ${forbiddenWords}\n` : ''}
For each section provided above, create detailed writing instructions that specify:
1. The specific scenes, dialogue, and actions to be written in that section
2. The tone, mood, and emotional beats to emphasize
3. Key character moments and development points
4. How to incorporate the established themes and character arcs
5. Specific details about setting, atmosphere, and sensory descriptions
6. How the section should connect to the overall story structure
7. Target word count for the section (approximately ${Math.round(targetWordCount / sections.length)} words)

The instructions should be comprehensive enough that any writer could create compelling content that fits perfectly with the established story, characters, and themes.

${sectionPrompt ? `Section Guidelines: ${sectionPrompt}` : ''}
${scriptPrompt ? `Writing Style Instructions: ${scriptPrompt}` : ''}
${additionalPrompt ? `Additional Instructions: ${additionalPrompt}` : ''}
${forbiddenWords ? `Words to avoid: ${forbiddenWords}` : ''}

Generate comprehensive writing instructions for each section that will enable excellent storytelling.`;

    console.log(`📝 Generating writing instructions for ${sections.length} sections (NEW Script - Structured Output)`);

    // Use structured output - no JSON parsing needed!
    const result = await structuredModel.invoke(prompt);

    console.log(`✅ Generated writing instructions for ${result.sections.length} sections (NEW Script - Structured Output)`);

    return NextResponse.json({
      success: true,
      sections: result.sections,
      meta: {
        title,
        theme,
        genre,
        targetAudience,
        numSections: result.sections.length,
        targetWordCount: targetWordCount
      }
    });

  } catch (error) {
    console.error('Error generating writing instructions:', error);
    return NextResponse.json(
      { error: 'Failed to generate writing instructions: ' + (error as Error).message },
      { status: 500 }
    );
  }
}