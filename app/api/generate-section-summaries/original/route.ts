import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define the Zod schema for structured output
const Section = z.object({
  title: z.string().describe("Section title"),
  summary: z.string().describe("Brief 2-3 sentence summary of what happens in this section")
});

const SectionSummaries = z.object({
  sections: z.array(Section).describe("Array of story sections with titles and summaries")
});

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      theme = '',
      targetAudience = "women over 60",
      genre = "contemporary inspirational fiction novelette",
      outline,
      characters = [],
      themes = [],
      setting = '',
      keyPlotPoints = [],
      sectionPrompt = '',
      additionalPrompt = '',
      forbiddenWords = '',
      selectedModel = 'gpt-4o-mini',
      targetWordCount = 15000,
      numberOfSections = 8
    } = await request.json();

    if (!title?.trim() || !outline) {
      return NextResponse.json({ error: 'Title and outline are required' }, { status: 400 });
    }

    // Create ChatOpenAI model with structured output
    const model = new ChatOpenAI({
      model: selectedModel,
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY
    });

    const structuredModel = model.withStructuredOutput(SectionSummaries);

    const systemPrompt = `You are a bestselling fiction author creating section breakdowns for "${title}".

STORY OVERVIEW:
Title: ${title}
Genre: ${genre}
Target Audience: ${targetAudience}
Target Word Count: ${targetWordCount} words
${theme ? `Theme: ${theme}` : ''}

STORY OUTLINE:
Act 1: ${outline.act1}
Act 2: ${outline.act2} 
Act 3: ${outline.act3}

CHARACTERS:
${characters?.map((char: any) => `- ${char.name} (${char.role}): ${char.description}`).join('\n') || 'No characters provided'}

SETTING: ${setting || 'Not specified'}

KEY PLOT POINTS: ${keyPlotPoints?.join(', ') || 'None specified'}

THEMES: ${themes?.join(', ') || 'Not specified'}

INSTRUCTIONS:
Create ${numberOfSections} section titles with brief summaries for this story. Each section should:
1. Have a compelling, descriptive title
2. Include a brief 2-3 sentence summary of what happens in that section
3. Flow logically from the previous section
4. Work together to tell the complete story outlined above
5. Be roughly equal in length (approximately ${Math.round(targetWordCount / numberOfSections)} words each)


${sectionPrompt ? `Section Structure Guidelines: ${sectionPrompt}` : ''}
${additionalPrompt ? `Additional Instructions: ${additionalPrompt}` : ''}
${forbiddenWords ? `Avoid using these words: ${forbiddenWords}` : ''}`;

    console.log(`📝 Generating ${numberOfSections} section summaries for "${title}" (NEW Script - Structured Output)`);

    // Use structured output - no JSON parsing needed!
    const result = await structuredModel.invoke(systemPrompt);

    console.log(`✅ Generated ${result.sections.length} section summaries for "${title}" (NEW Script - Structured Output)`);

    return NextResponse.json({
      success: true,
      sections: result.sections
    });

  } catch (error) {
    console.error('Error generating section summaries:', error);
    return NextResponse.json(
      { error: 'Failed to generate section summaries: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
