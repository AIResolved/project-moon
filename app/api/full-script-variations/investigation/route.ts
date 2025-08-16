import { NextRequest, NextResponse } from "next/server";
import { createModelInstance } from "../../../../lib/utils/model-factory";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      title: scriptTitle,
      sections = [],
      selectedModel = 'gpt-4o-mini',
      selectedView = '3rd', // '1st' | '2nd' | '3rd'
      excludedWords = '',
      desiredWordCount = '',
      additionalData = ''
    } = await request.json();

    if (!scriptTitle || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'Missing title or sections' }, { status: 400 });
    }

    const model: any = createModelInstance(selectedModel, 0.7);

    // Prepare logging
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

    const detailedSections: Array<{ index: number; title: string; detailedContent: string; wordCount: number }> = [];

    for (let currentIndex = 0; currentIndex < sections.length; currentIndex++) {
      const sec = sections[currentIndex];
      const prev = detailedSections[currentIndex - 1]?.detailedContent || '';
      const nextSectionTitle = sections[currentIndex + 1]?.title || '';
      const prevSectionTitle = sections[currentIndex - 1]?.title || '';
      const prevSectionContent = prev;

      const userContent = `
You are a storyteller/narrator writing for a middle school audience (8th grade level). Write a detailed, engaging section for the following part of a script:

- Write in ${selectedView === "3rd" ? "3rd person" : (selectedView === "2nd" ? "2nd person" : "1st person")}.
- Use simple, everyday language that an 8th grader would understand.
- Avoid complex vocabulary, technical jargon, or "fancy" words.
- Explain any necessary complex concepts in simple terms.
- Do not include scene directions or narrator markers, only the spoken text.
- Avoid welcoming phrases at the beginning.
- Exclude these words if possible: ${excludedWords || "None specified"}
- Ensure coherence and flow from the previous section to this one.
- Avoid repetition of phrases, sentences, or ideas within this section.
- Only use an investigative or mysterious tone if it's specifically appropriate for this section's content.
- Do not force comparisons to "Stranger Things" or other horror/mystery media unless directly relevant.
- ${desiredWordCount ? `If this section is about factual information, aim for approximately ${Math.floor(parseInt(String(desiredWordCount)) / sections.length)} words.` : "If this section is about factual information, present it clearly without unnecessary mystery."}

Title: ${sec.title}
Domain: ${scriptTitle}
Section Description: ${sec.format || "No specific format provided"}

Current Section: ${sec.title}
Previous Section: ${prevSectionTitle}
${currentIndex > 0 ? `Previous Section Content: ${prevSectionContent}` : ""}
Next Section: ${nextSectionTitle}

${additionalData ? "IMPORTANT: Use ALL relevant examples, places, or items mentioned in the additional data provided. Don't omit important information." : ""}`;

      const messages = [
        { role: 'system', content: 'You write clear, engaging narrative suitable for spoken delivery. Output only the script text, no headings.' },
        { role: 'user', content: userContent }
      ];

      const result = await model.invoke(messages);

      let content = '';
      if (typeof result.content === 'string') content = result.content;
      else if (Array.isArray(result.content)) {
        content = result.content.map((item: any) => (typeof item === 'string' ? item : (item?.text || ''))).join('\n');
      }
      content = (content || '').trim();

      const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
      detailedSections.push({ index: currentIndex, title: sec.title, detailedContent: content, wordCount });

      // log
      const fname = join(logsDir, `investigation_full_section_${currentIndex + 1}_${Date.now()}.txt`);
      writeFileSync(fname, userContent + "\n\n---\n\n" + content, 'utf-8');
    }

    const scriptWithMarkdown = detailedSections
      .map(s => `**${s.title}**\n\n${s.detailedContent}`)
      .join("\n\n");

    return NextResponse.json({ success: true, detailedSections, scriptWithMarkdown, wordCount: scriptWithMarkdown.split(/\s+/).filter(Boolean).length });
  } catch (error) {
    console.error('Error generating investigation full script:', error);
    return NextResponse.json({ error: 'Failed to generate investigation full script' }, { status: 500 });
  }
}






