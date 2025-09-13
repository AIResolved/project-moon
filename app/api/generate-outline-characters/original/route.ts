import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define the Zod schema for structured output
const StoryCharacter = z.object({
  name: z.string().describe("Character's name"),
  role: z.string().describe("Character's role (Main character/Supporting character/Antagonist)"),
  description: z.string().describe("Detailed character description including personality, background, motivations"),
  arc: z.string().describe("How this character develops throughout the story")
});

const FactsCharacter = z.object({
  name: z.string().describe("Expert's name or title"),
  role: z.string().describe("Expert's role (Narrator/Expert 1/Expert 2/Research Specialist/Host)"),
  description: z.string().describe("Expert's credentials, background, and area of expertise"),
  arc: z.string().describe("How this expert contributes throughout the presentation")
});

const StoryOutline = z.object({
  outline: z.object({
    act1: z.string().describe("Detailed description of Act 1"),
    act2: z.string().describe("Detailed description of Act 2"),
    act3: z.string().describe("Detailed description of Act 3")
  }),
  characters: z.array(StoryCharacter).describe("Array of story characters"),
  themes: z.array(z.string()).describe("List of main themes explored in the story"),
  setting: z.string().describe("Description of the story's setting and time period"),
  keyPlotPoints: z.array(z.string()).describe("List of major plot points and twists")
});

const FactsOutline = z.object({
  outline: z.object({
    introduction: z.string().describe("Introduction and topic overview"),
    mainContent: z.string().describe("Main factual content and evidence"),
    conclusion: z.string().describe("Summary and key takeaways")
  }),
  characters: z.array(FactsCharacter).describe("Array of experts and narrators"),
  themes: z.array(z.string()).describe("List of main topics covered"),
  setting: z.string().describe("Context where facts are presented"),
  keyPlotPoints: z.array(z.string()).describe("List of major facts and evidence points")
});

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      theme = '',
      targetAudience = "women over 60",
      genre = "contemporary inspirational fiction novelette",
      scriptFormat = 'Story',
      sectionPrompt = '',
      additionalPrompt = '',
      forbiddenWords = '',
      selectedModel = 'gpt-4o-mini',
      targetWordCount = 15000
    } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create ChatOpenAI model with structured output
    const model = new ChatOpenAI({
      model: selectedModel,
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY
    });

    // Use appropriate schema based on format
    const isFactualFormat = scriptFormat === 'Facts' || scriptFormat === 'Documentary' || scriptFormat === 'Tutorial' || scriptFormat === 'Interview' || scriptFormat === 'Presentation';
    const structuredModel = model.withStructuredOutput(isFactualFormat ? FactsOutline : StoryOutline);

    // Create prompt based on format
    const prompt = isFactualFormat ? 
      `Generate a detailed factual outline and expert profiles for the ${scriptFormat.toLowerCase()} content: "${title}".

<CONTEXT> You are a professional content creator with expertise in creating ${scriptFormat.toLowerCase()} content. You specialize in presenting factual information in an engaging and informative manner for ${targetAudience}. </CONTEXT>

<CONTENT TYPE> Your content is fact-based, well-researched, and informative. It focuses on delivering accurate information, expert insights, and educational value. The content should be engaging but maintain credibility and factual accuracy throughout.${theme ? ` Focus particularly on topics related to: ${theme}` : ''} </CONTENT TYPE>

<STRUCTURE> All your factual content follows a clear three-part structure:
- Introduction: Hook the audience with an interesting fact or question, introduce the topic, and outline what will be covered.
- Main Content: Present the core information, evidence, expert opinions, and detailed explanations in a logical flow.
- Conclusion: Summarize key points, provide actionable insights, and leave the audience with valuable takeaways. </STRUCTURE>

INSTRUCTIONS:
Create an excellent and informative outline for ${scriptFormat.toLowerCase()} content with the title: "${title}"

Important Notes:
- Create appropriate expert roles (e.g., "Narrator", "Expert 1", "Research Specialist", "Host") instead of fictional characters.
- Focus on factual accuracy and credible information presentation.
- The content should be suitable for ${targetAudience} and maintain their interest throughout.
- Target word count: approximately ${targetWordCount} words.
${sectionPrompt ? `\nAdditional Section Instructions: ${sectionPrompt}` : ''}
${additionalPrompt ? `\nGeneral Instructions: ${additionalPrompt}` : ''}
${forbiddenWords ? `\nAvoid using these words: ${forbiddenWords}` : ''}`

      : 

      `Generate a detailed story outline and character profiles for the story "${title}".

<CONTEXT> You are now acting as a bestselling fiction author with decades of experience and 50 published books. You specialize in writing ${genre} that are heartwarming and inspirational. You cater to ${targetAudience}. </CONTEXT>

<GENRE> Your stories are emotionally driven, feel-good narratives that are over-the-top heartwarming and inspirational, and effectively tug at the audience's heartstrings. They cover themes such as racism and discrimination, compassion and faith, and the journey of overcoming adversity to find hope. Your Stories aim to deeply resonate emotionally with the audience, offering messages of encouragement and leaving them feeling inspired and optimistic about the possibilities for change and redemption in their own lives. They are always easily relatable and accessible to a broad audience.${theme ? ` Focus particularly on themes related to: ${theme}` : ''} </GENRE>

<STRUCTURE> All your stories follow the following narrative framework with a classic three act structure:
- Act 1: The story immediately hooks the audience with the inciting incident provided in the story titles, followed by the first plot twist which (temporarily) resolves this initial conflict and gives newfound hope. However, just as the audience begins to feel relieved, a new challenge is introduced at the end of Act 1, which forms the new central conflict for the rest of the story.
- Act 2: Rising action based on the new central conflict introduced at the end of Act 1, leading to the climax (peak happiness), but then a sudden setback and downturn at the end of Act 2 (momentary fall).
- Act 3: the protagonists are reeling from the fall, but then there is a triumphant resolution and denouement (leading to a new, higher stability). This story arc keeps the audience emotionally invested by taking them on a rollercoaster of highs and lows, and ends with an extremely satisfying and incredibly positive resolution. </STRUCTURE>

INSTRUCTIONS:
Create an excellent and creative outline for a best-selling story with the title: "${title}"

Important Notes:
- The title needs to be fully reaffirmed by the end of Act 1, meaning that "${title}" needs to happen within Act 1.
- Ensure that Act 1 includes a twist that captivates the audience. After the initial twist, incorporate 1-2 more relevant plot twists that deepen the story and maintain the audience engagement.
- The story outline needs to include enough material for a highly engaging story with a word count around ${targetWordCount} words.
- Keep in mind the demographic of the audience (${targetAudience}), who want emotionally-driven-feel-good narratives with strong moral undertones, and an overwhelmingly positive and uplifting feel.
${sectionPrompt ? `\nAdditional Section Instructions: ${sectionPrompt}` : ''}
${additionalPrompt ? `\nGeneral Instructions: ${additionalPrompt}` : ''}
${forbiddenWords ? `\nAvoid using these words: ${forbiddenWords}` : ''}`;

    console.log(`📖 Generating outline and characters for "${title}" (NEW Script - Structured Output)`);

    // Use structured output - no JSON parsing needed!
    const result = await structuredModel.invoke(prompt);

    console.log(`✅ Generated outline and characters for "${title}" (NEW Script - Structured Output)`);

    return NextResponse.json({
      success: true,
      outline: result.outline,
      characters: result.characters,
      themes: result.themes,
      setting: result.setting,
      keyPlotPoints: result.keyPlotPoints
    });

  } catch (error) {
    console.error('Error generating outline and characters:', error);
    return NextResponse.json(
      { error: 'Failed to generate outline and characters: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
