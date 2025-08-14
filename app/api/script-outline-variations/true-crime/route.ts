import { NextRequest, NextResponse } from "next/server";
import { scriptSectionsResponseSchema } from "../../../../types/script-section";
import { createModelInstance } from "../../../../lib/utils/model-factory";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      targetSections = 5,
      additionalPrompt = "",
      researchContext = "",
      forbiddenWords = "",
      modelName = "gpt-4o-mini",
      audience = "",
      povSelection = "3rd",
      scriptFormat = "Documentary"
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }

    // Read style file for fundamentals
    const stylePath = join(process.cwd(), 'lib', 'data', 'feeder_script_style.txt');
    const styleContent = readFileSync(stylePath, 'utf-8');

    const model = createModelInstance(modelName, 0.7) as any;

    // Build prompt
    const extra = [] as string[];
    if (researchContext && String(researchContext).trim()) {
      extra.push(`RESEARCH CONTEXT (use for facts, dates, names):\n${String(researchContext).trim()}`);
    }
    if (forbiddenWords && String(forbiddenWords).trim()) {
      extra.push(`FORBIDDEN WORDS: Avoid: ${String(forbiddenWords).trim()}`);
    }
    if (additionalPrompt && String(additionalPrompt).trim()) {
      extra.push(`ADDITIONAL INSTRUCTIONS:\n${String(additionalPrompt).trim()}`);
    }

    const system = `You are a professional true-crime outline architect creating ethical, respectful, well-structured documentary outlines. Output must be structured as JSON matching the provided schema.`;

    const user = `Create a ${targetSections}-section true-crime script outline for the case titled "${title}".

STYLE & FUNDAMENTALS:\n${styleContent}

ETHICAL GUIDELINES:
- Respect victims and families; avoid sensationalism or graphic descriptions
- Focus on verified facts, timelines, and credible sources
- Maintain objectivity; separate facts from speculation
- Provide context and societal implications where appropriate

SUGGESTED CONTENT AREAS (adapt as appropriate to the case):
- Victim(s): background, humanity, timeline leading up to events
- Perpetrator(s): background, motives, methods (without glorification)
- Investigators: process, challenges, breakthroughs, forensic findings
- Family/Community impact: response, resilience, ongoing effects
- Legal Proceedings: trial, verdict, sentencing, aftermath

STRUCTURE REQUIREMENTS FOR EACH SECTION:
1) title (descriptive, concise)
2) writingInstructions (150-250 words) detailing what facts to cover, sources/evidence, questions raised, narrative flow, and how it advances the case understanding
3) image_generation_prompt (10-25 words) describing an appropriate non-graphic visual for this section (no taboo content)

AUDIENCE: ${audience || 'general audience'}
POV: ${povSelection}
FORMAT: ${scriptFormat}

${extra.join('\n\n')}

Return only a JSON object matching: ${scriptSectionsResponseSchema.toString()}`;

    // log prompt
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    writeFileSync(join(logsDir, `true_crime_outline_${Date.now()}.txt`), `${system}\n\n---\n\n${user}`, 'utf-8');

    const response = await model.withStructuredOutput(scriptSectionsResponseSchema).invoke([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]);

    return NextResponse.json({ success: true, sections: response.sections });
  } catch (error) {
    console.error('Error generating true crime outline:', error);
    return NextResponse.json({ error: 'Failed to generate true crime outline' }, { status: 500 });
  }
}



