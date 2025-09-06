import { NextRequest, NextResponse } from "next/server";
import { createModelInstance } from "../../../../lib/utils/model-factory";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      theme = '',
      titles = [],
      sectionPrompt = '',
      scriptPrompt = '',
      additionalPrompt = '',
      forbiddenWords = '',
      selectedModel = 'gpt-4o-mini',
      targetSections = 2400
    } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json({ error: 'Section titles are required' }, { status: 400 });
    }

    const model = createModelInstance(selectedModel, 0.7);

    let prompt = `Generate detailed writing instructions for each section of a script.

Overall Script Title: "${title}"
${theme ? `Theme: ${theme}\n` : ''}
Target Word Count: ${targetSections} words
Number of Sections: ${titles.length}

${sectionPrompt ? `Section Generation Instructions: ${sectionPrompt}\n` : ''}
${scriptPrompt ? `Script Writing Instructions: ${scriptPrompt}\n` : ''}
${additionalPrompt ? `Additional Instructions: ${additionalPrompt}\n` : ''}
${forbiddenWords ? `Forbidden Words (avoid these): ${forbiddenWords}\n` : ''}

Section Titles:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each section title, generate detailed writing instructions that specify:
- What specific content should be covered in this section
- The narrative approach and tone for this particular section
- Key points or elements that must be included
- How this section connects to the overall script story
- Approximate word count for this section (aim for ~${Math.floor(targetSections / titles.length)} words per section)

Return the response as a JSON array of objects, where each object has:
{
  "title": "The section title",
  "writingInstructions": "Detailed writing instructions for this section"
}

Example format:
[
  {
    "title": "Section Title 1",
    "writingInstructions": "Detailed instructions for what to write in this section..."
  },
  {
    "title": "Section Title 2", 
    "writingInstructions": "Detailed instructions for what to write in this section..."
  }
]

Return ONLY the JSON array, no additional text or explanations.`;

    console.log(`📝 Generating writing instructions for ${titles.length} sections (NEW Script)`);

    const result = await model.invoke(prompt);
    let responseText = '';
    
    // Handle different response types
    if (typeof result === 'string') {
      responseText = result;
    } else if (result && typeof result === 'object') {
      if ('content' in result && typeof result.content === 'string') {
        responseText = result.content;
      } else if ('text' in result && typeof result.text === 'string') {
        responseText = result.text;
      } else if (Array.isArray(result.content)) {
        responseText = result.content.map((c: any) => c.text || c.content || '').join('');
      } else {
        responseText = JSON.stringify(result);
      }
    }
    
    console.log('Raw AI response for writing instructions:', responseText.substring(0, 500) + '...');

    // Extract JSON array from response
    let sections: Array<{title: string, writingInstructions: string}> = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        sections = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to parse the entire response as JSON
        sections = JSON.parse(responseText);
      }
      
      // Validate the structure
      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('Invalid sections format');
      }
      
      // Ensure each section has required fields
      sections = sections.filter(s => 
        s && typeof s === 'object' && 
        typeof s.title === 'string' && 
        typeof s.writingInstructions === 'string' &&
        s.title.trim() && s.writingInstructions.trim()
      );
      
      if (sections.length === 0) {
        throw new Error('No valid sections generated');
      }

    } catch (parseError) {
      console.error('Failed to parse sections JSON:', parseError);
      console.error('Response text:', responseText);
      
      // Fallback: create sections from titles with basic instructions
      sections = titles.map((title: string) => ({
        title: title.trim(),
        writingInstructions: `Write a compelling section about "${title.trim()}" that contributes to the overall script narrative. Include relevant details, evidence, and maintain an engaging tone throughout. Target approximately ${Math.floor(targetSections / titles.length)} words for this section.`
      }));
    }

    console.log(`✅ Generated writing instructions for ${sections.length} sections (NEW Script)`);

    return NextResponse.json({
      success: true,
      sections,
      meta: {
        title,
        theme,
        numSections: sections.length,
        targetWordCount: targetSections
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
