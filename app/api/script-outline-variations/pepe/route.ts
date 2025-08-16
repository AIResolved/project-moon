import { NextRequest, NextResponse } from "next/server";
import { scriptSectionsResponseSchema } from "../../../../types/script-section";
import { createModelInstance } from "../../../../lib/utils/model-factory";
import { THEME_OPTIONS } from "../../../../lib/features/scripts/scriptsSlice";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ScriptSection } from "../../../../types/script-section";

// Helper function to log prompts to files
function logPromptToFile(prompt: string, filename: string, type: 'outline' | 'detailed' = 'outline') {
  try {
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${timestamp}_${type}_${filename}.txt`;
    const filepath = join(logsDir, fullFilename);
    
    const logContent = `=== ${type.toUpperCase()} GENERATION PROMPT ===
Generated at: ${new Date().toISOString()}
Filename: ${filename}

${prompt}

=== END OF PROMPT ===`;
    
    writeFileSync(filepath, logContent, 'utf-8');
    console.log(`📝 Prompt logged to: ${filepath}`);
  } catch (error) {
    console.error('❌ Failed to log prompt:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      title, 
      wordCount, 
      themeId, 
      additionalPrompt,
      emotionalTone,
      targetAudience,
      forbiddenWords,
      selectedModel,
      uploadedStyle,
      cta,
      ctas,
      inspirationalTranscript,
      regenerateSection,
      researchData,
      generateQuote
    } = await request.json();
    
    if (!title || !wordCount) {
      return NextResponse.json(
        { error: "Missing required fields: title and wordCount are required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not found" },
        { status: 500 }
      );
    }

    // Determine video creation mode and calculate durations
    let totalDuration: number;
    let imageDuration: number;
    let isSegmentedVideo = false;

    // Calculate the number of sections based on word count - more accurate calculation
    const numSections = Math.max(1, Math.ceil(wordCount / 800)); // Aim for ~800 words per section
    const avgWordsPerSection = Math.round(wordCount / numSections);
    
    console.log(`📊 Word distribution: ${wordCount} total words → ${numSections} sections → ~${avgWordsPerSection} words per section`);

    // Handle multiple CTAs
    const activeCTAs = ctas && Array.isArray(ctas) ? ctas.filter((c: any) => c.enabled) : (cta?.enabled ? [cta] : []);
    
    // Determine which sections should contain CTAs
    const ctaSectionIndices: number[] = [];
    activeCTAs.forEach((ctaItem: any) => {
      let ctaSectionIndex = -1;
      if (ctaItem.placement === 'beginning') {
        ctaSectionIndex = 0;
      } else if (ctaItem.placement === 'middle') {
        ctaSectionIndex = Math.floor(numSections / 2);
      } else if (ctaItem.placement === 'end') {
        ctaSectionIndex = numSections - 1;
      } else if (ctaItem.placement === 'custom' && ctaItem.customPosition !== undefined) {
        ctaSectionIndex = Math.min(ctaItem.customPosition - 1, numSections - 1); // Convert to 0-based index
      }
      
      if (ctaSectionIndex >= 0) {
        ctaSectionIndices.push(ctaSectionIndex);
      }
    });

    console.log(`📢 CTA placements: sections ${ctaSectionIndices.map(i => i + 1).join(', ')} of ${numSections} total`);
    if (activeCTAs.length > 0) {
      console.log(`📋 Active CTAs:`, activeCTAs.map(cta => `${cta.type} (${cta.placement})`).join(', '));
    }

    // Get theme instructions if theme is selected (moved up for quote generation)
    const selectedTheme = themeId ? THEME_OPTIONS.find((t: any) => t.id === themeId) : null;
    const themeInstructions = selectedTheme ? `
THEMATIC DIRECTION - ${selectedTheme.name}:
Core Approach: ${selectedTheme.instructions.hook}
Desired Tone: ${selectedTheme.instructions.tone}
Communication Style: ${selectedTheme.instructions.clarity}
Narrative Progression: ${selectedTheme.instructions.narrativeFlow}
Content Balance: ${selectedTheme.instructions.balance}
Audience Connection: ${selectedTheme.instructions.engagement}
Structural Guidelines: ${selectedTheme.instructions.format}
Broader Context: ${selectedTheme.instructions.overall}

CRITICAL: These are thematic guidelines for APPROACH and TONE, not literal phrases to repeat. 
- Use the SPIRIT of these instructions, not the exact wording
- Vary your language extensively - never repeat the same phrases across sections
- Focus on authentic human communication that embodies these principles naturally
- If the theme mentions specific phrases (like "they don't want you to know"), treat them as occasional accent points, not repetitive mantras
` : '';

    // Generate quote if requested
    let generatedQuote = null;
    if (generateQuote) {
      console.log('📜 Generating relevant quote...');
      try {
        const quoteModel = createModelInstance(selectedModel || 'gpt-4o-mini', 0.3); // Lower temperature for more focused results
        
        // First, analyze the script content to understand the main themes
        const scriptAnalysisPrompt = `Analyze this video script content and identify the main subject, key themes, and any prominent figures mentioned:

TITLE: "${title}"
THEME: ${selectedTheme ? selectedTheme.name : 'General'}
${researchData ? `RESEARCH CONTEXT: ${JSON.stringify(researchData.analysis || {}).substring(0, 500)}` : ''}

Based on this information, identify:
1. The PRIMARY subject/topic of this script
2. The main THEMES being explored 
3. Any SPECIFIC HISTORICAL FIGURES, experts, or authorities mentioned or relevant to this topic
4. The PHILOSOPHICAL or PRACTICAL approach being taken

Respond with a brief analysis in this format:
PRIMARY SUBJECT: [main topic]
KEY THEMES: [2-3 main themes]
RELEVANT AUTHORITIES: [specific people who are experts on this subject]
APPROACH: [philosophical, practical, historical, etc.]`;

        const analysisResponse = await quoteModel.invoke(scriptAnalysisPrompt);
        let analysisContent = "";
        if (typeof analysisResponse.content === 'string') {
          analysisContent = analysisResponse.content;
        } else if (Array.isArray(analysisResponse.content)) {
          analysisContent = analysisResponse.content
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string') return item.text;
              return '';
            })
            .join('\n');
        }

        console.log('📊 Script analysis for quote:', analysisContent.substring(0, 200));

        // Now generate a highly relevant quote based on the analysis
        const quotePrompt = `Based on this script analysis, find a profound, verified quote that perfectly captures the essence of this content:

${analysisContent}

SCRIPT DETAILS:
Title: "${title}"
Theme: ${selectedTheme ? selectedTheme.name : 'General'}
${themeInstructions ? `Theme Context: ${themeInstructions.substring(0, 300)}` : ''}

QUOTE REQUIREMENTS:
- Must be from a REAL, credible authority figure directly relevant to the subject matter
- Prioritize quotes from specific figures mentioned in the analysis if any
- Must be PROFOUND and thought-provoking, not generic motivational quotes
- Should capture the CORE ESSENCE of what this script is exploring
- Must be VERIFIED and authentic (not misattributed)
- Should be intellectually substantial and meaningful to the topic

QUOTE SOURCES TO PRIORITIZE:
1. If the script is about a specific person (like Edgar Cayce), prioritize their own quotes
2. If it's about a philosophical topic, use quotes from relevant philosophers/thinkers
3. If it's about scientific concepts, use quotes from relevant scientists/researchers
4. If it's about spiritual topics, use quotes from authentic spiritual teachers/mystics

VERIFICATION: Only use quotes you can verify are real and properly attributed.

Return ONLY the quote and author in this exact format:
"Quote text here" - Author Name

Do NOT include any explanation, context, or additional text.`;

        const quoteResponse = await quoteModel.invoke(quotePrompt);
        let quoteContent = "";
        if (typeof quoteResponse.content === 'string') {
          quoteContent = quoteResponse.content;
        } else if (Array.isArray(quoteResponse.content)) {
          quoteContent = quoteResponse.content
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string') return item.text;
              return '';
            })
            .join('\n');
        }

        // Parse quote and author with better validation
        const quoteMatch = quoteContent.match(/"([^"]+)"\s*-\s*(.+)/);
        if (quoteMatch && quoteMatch[1] && quoteMatch[2]) {
          generatedQuote = {
            text: quoteMatch[1].trim(),
            author: quoteMatch[2].trim()
          };
          console.log(`✅ Generated contextual quote: "${generatedQuote.text}" - ${generatedQuote.author}`);
        } else {
          // Fallback: try different quote format parsing
          const alternativeMatch = quoteContent.match(/['"]([^'"]+)['"][\s\-–—]*([A-Za-z\s.]+)/);
          if (alternativeMatch && alternativeMatch[1] && alternativeMatch[2]) {
            generatedQuote = {
              text: alternativeMatch[1].trim(),
              author: alternativeMatch[2].trim()
            };
            console.log(`✅ Generated quote (alternative format): "${generatedQuote.text}" - ${generatedQuote.author}`);
          } else {
            console.warn('❌ Quote generation failed - could not parse response:', quoteContent);
          }
        }
      } catch (quoteError) {
        console.error('❌ Quote generation failed:', quoteError);
        // Continue without quote if generation fails
      }
    }

    // Use uploaded style if available, otherwise read the feeder script style file
    const styleContent = `ADVANCED SCRIPTWRITING STYLE GUIDE

    CORE PHILOSOPHY:
    Write scripts that sound like intelligent, passionate humans speaking naturally about topics they care deeply about. Your goal is to inform, engage, and inspire through authentic communication, not to manipulate through repetitive shock tactics or AI-generated patterns.
    
    VOICE & AUTHENTICITY:
    - Write as if you're an expert friend sharing fascinating insights over coffee
    - Maintain genuine enthusiasm for the subject matter without artificial excitement
    - Use your natural speaking voice, not an artificial "YouTube voice" or AI-generated tone
    - Be confident in your knowledge without being arrogant or sensationalistic
    - Show respect for your audience's intelligence and critical thinking abilities
    - Vary your language extensively - no phrase should appear more than once per script
    
    CONTENT STRUCTURE:
    - Open with a compelling hook that promises genuine value, not dramatic claims
    - Build your argument through logical progression and varied evidence
    - Use specific examples, case studies, and relatable scenarios with verifiable details
    - Address potential objections or alternative viewpoints naturally and respectfully
    - Conclude with actionable insights or thought-provoking questions that inspire further exploration
    
    LANGUAGE PATTERNS:
    - Favor clear, direct communication over dramatic declarations or catchphrases
    - Use rhetorical questions strategically to engage thinking, not just for effect (max 1-2 per section)
    - Vary sentence length and structure extensively to create natural rhythm
    - Include specific details and examples that readers can verify or relate to
    - Balance "you" statements with broader observations and "we" inclusivity
    - Never repeat the same sentence structures, transitions, or rhetorical devices
    
    ENGAGEMENT TECHNIQUES:
    - Start with observations most people can relate to or agree with
    - Build complexity gradually, taking readers on a journey of discovery
    - Use analogies and metaphors that illuminate rather than confuse
    - Include moments of surprise or revelation that feel earned through evidence, not forced
    - Connect individual experiences to larger patterns or principles through logical progression
    - Create engagement through substance and insight, not manipulation or artificial urgency
    
    DEPTH & SUBSTANCE:
    - Research your topics thoroughly and include specific, verifiable information
    - Explain not just what happens, but why it happens and how it works
    - Draw connections between different ideas, fields, or time periods with supporting evidence
    - Provide historical context or comparative examples when relevant
    - Offer practical applications or next steps for the information shared
    - Support claims with concrete examples, statistics, or documented cases
    
    CRITICAL: WHAT TO ABSOLUTELY AVOID (AI PATTERNS):
    - Repetitive catchphrases like "they don't want you to know," "your life is a lie," "wake up," "the truth is"
    - Formulaic language patterns that sound interchangeable between topics
    - Overly dramatic declarations that sound artificial or manipulative
    - Generic advice that could apply to any topic without supporting specifics
    - Vague accusations without specific evidence, examples, or verifiable sources
    - Lists of benefits or promises without substantive backing
    - Artificial excitement or urgency ("This will SHOCK you!" "You won't believe...")
    - Repetitive sentence structures or transitions between paragraphs
    - Generic conspiracy language without specific, documented examples
    - Empty escalation words ("incredible," "unbelievable," "shocking") without substance
    
    WHAT TO AVOID:
    - Talking down to your audience or assuming they're uninformed
    - Leaving audiences feeling hopeless or powerless without practical guidance
    - Conspiracy thinking that lacks nuance, evidence, or constructive purpose
    - Emotional manipulation rather than intellectual engagement
    - Generic spiritual or motivational language without specific application
    - Repetitive rhetorical devices or formulaic opening/closing patterns
    
    EMOTIONAL INTELLIGENCE:
    - Acknowledge the complexity of human experience and decision-making
    - Validate common struggles and frustrations without exploiting them for engagement
    - Balance challenging ideas with hope, practical guidance, and empowerment
    - Show empathy for different perspectives and life circumstances
    - Inspire action through genuine empowerment and understanding, not fear or shame
    - Build trust through transparency about sources, reasoning, and limitations
    
    NATURAL CONVERSATION PATTERNS:
    - Use conversational connectors that sound natural when spoken
    - Include thoughtful pauses and transitions that respect the content's weight
    - Build ideas through association and logical flow rather than dramatic jumps
    - Reference shared human experiences without assuming universal responses
    - Acknowledge uncertainty or complexity when appropriate
    - Maintain intellectual humility while demonstrating expertise
    
    EXAMPLE TRANSFORMATIONS:
    
    AVOID (AI Pattern): "Your life is a lie. They've been programming your mind since birth. Wake up!"
    BETTER: "Think about the last major decision you made. How many of the factors you considered—what success looks like, what others would think, what's 'realistic'—actually came from your own experience versus what you absorbed from family, media, and culture? Most of us are living by rules we never consciously chose, and recognizing this is the first step toward more intentional living."
    
    AVOID (AI Pattern): "The system doesn't want you to know this secret truth that will change everything."
    BETTER: "Here's something interesting that doesn't get discussed much in mainstream conversations about [topic]. When you examine the research from [specific source], a different pattern emerges that challenges some common assumptions we might not even realize we're making."
    
    AVOID (AI Pattern): "This ancient secret will unlock your hidden potential and transform your reality instantly."
    BETTER: "Archaeological evidence from [specific location/time] suggests that ancient practitioners understood something about [specific concept] that we're only beginning to rediscover through modern research. The practical applications they developed offer insights we can test and adapt today."
    
    AVOID (AI Pattern): "They never wanted you to discover this powerful technique that elites have used for centuries."
    BETTER: "Historical records show that certain practices were primarily accessible to educated elites, not because of secrecy, but due to literacy barriers and resource limitations. Understanding how these techniques work gives us the opportunity to evaluate their relevance for our own circumstances."
    
    PRACTICAL APPLICATION STANDARDS:
    - Research topics thoroughly using credible, verifiable sources
    - Include specific examples, statistics, or documented case studies
    - Explain complex concepts using simple, relatable analogies rooted in common experience
    - Connect abstract ideas to concrete, everyday applications
    - Provide actionable insights or practical next steps with clear guidance
    - Maintain a conversational tone that demonstrates expertise without condescension
    - Build trust through transparency about sources, reasoning, and practical limitations
    - Vary language extensively - treat every section as a unique conversation
    
    VERIFICATION CHECKLIST:
    Before considering any script complete, ensure it:
    ✓ Sounds like a knowledgeable human expert sharing genuine insights
    ✓ Contains specific, verifiable information unique to the topic
    ✓ Uses completely varied language with no repeated phrases or structures
    ✓ Builds arguments through evidence and logic rather than emotion or manipulation
    ✓ Respects audience intelligence and promotes critical thinking
    ✓ Provides practical value that viewers can verify or apply
    ✓ Maintains conversational authenticity throughout
    ✓ Avoids all AI-generated language patterns and clichés
    
    This approach creates content that educates, engages, and empowers audiences through authentic expertise and genuine human communication, completely avoiding artificial AI patterns that undermine credibility and engagement.`

    // Initialize the model using the factory
    const model = createModelInstance(selectedModel || 'gpt-4o-mini', 0.7);

    // Build additions to the prompt based on optional parameters
    let additionalInstructions = "";
    
    // Add transcript as inspiration if provided
    if (inspirationalTranscript && inspirationalTranscript.trim()) {
      additionalInstructions += `
    INSPIRATIONAL TRANSCRIPT FOR STYLE REFERENCE ONLY:
    The following transcript should ONLY be used as inspiration for the tone, style, structure, and format of your script.
    DO NOT use the content, topic, or subject matter from this transcript.
    Your script must be about the title "${title}" and theme "${selectedTheme ? selectedTheme.name : 'provided'}", NOT about the topics mentioned in this transcript.
    
    Use this transcript to understand:
    - Writing style and tone
    - Narrative structure and pacing
    - How scenes flow and transition
    - Storytelling techniques and format
    - Dialogue style (if applicable)
    
    TRANSCRIPT FOR STYLE REFERENCE:
    ${inspirationalTranscript.trim()}
    
    IMPORTANT: Create your story about "${title}" using the above transcript's STYLE ONLY, not its content or topic.
    `;
    }
    
    // Add forbidden words if provided
    if (forbiddenWords && forbiddenWords.trim()) {
      const wordsList = forbiddenWords.split(',').map((word: string) => word.trim()).filter(Boolean);
      if (wordsList.length > 0) {
        additionalInstructions += `
    FORBIDDEN WORDS:
    The following words should be completely avoided in your script outline: ${wordsList.join(', ')}.
    `;
      }
    }
    
    // Add any additional custom instructions
    if (additionalPrompt && additionalPrompt.trim()) {
      additionalInstructions += `
    ADDITIONAL INSTRUCTIONS:
    ${additionalPrompt.trim()}
    `;
    }

    // Check if this is a single section regeneration
    if (regenerateSection && regenerateSection.sectionId && regenerateSection.currentTitle) {
      console.log(`🔄 Regenerating single section: "${regenerateSection.currentTitle}"`);
      
      // For single section regeneration, we only generate 1 section
      const singleSectionPrompt = `You are an expert script writer creating a compelling, persuasive video script. Regenerate a single section for a ${wordCount}-word script.

TITLE: "${title}"
CURRENT SECTION TO REGENERATE: "${regenerateSection.currentTitle}"
TOTAL SECTIONS IN SCRIPT: ${numSections}

STYLE GUIDE TO FOLLOW:
${styleContent}

${themeInstructions}
${emotionalTone ? `EMOTIONAL TONE: ${emotionalTone}` : ''}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
${forbiddenWords ? `FORBIDDEN WORDS (avoid these): ${forbiddenWords}` : ''}
${additionalInstructions}

Create a NEW version of this section with:
1. A compelling title that captures the essence of that part of the script (can be different from the current title)
2. Detailed writing instructions that specify the emotional tone, key points to cover, rhetorical devices to use, and how it fits into the overall narrative arc
3. A visual prompt for image generation that describes the scene, mood, and visual elements that would complement this section (avoid controversial or taboo topics)

Each section should be approximately ${avgWordsPerSection} words and packed with genuine educational value. Focus on creating content that informs, inspires, and empowers through authentic expertise.

CRITICAL WORD COUNT REQUIREMENT:
- Each section MUST be a minimum of 500 words
- Section 1 (Introduction): Maximum 170 words - capture attention through genuine intrigue and establish credibility
- Sections 2-${numSections}: Target approximately ${avgWordsPerSection} words each (minimum 800 words)
- If a section is shorter than the minimum, expand with additional examples, explanations, or insights
- Better to go over the target than fall significantly short
- The total script should aim for ${wordCount} words across all sections

${forbiddenWords ? `IMPORTANT: Avoid using any of these forbidden words: ${forbiddenWords}` : ''}

Return the response as a JSON object with a "sections" array containing the single regenerated section.`;

      console.log(`🚀 Regenerating single section: "${regenerateSection.currentTitle}"`);

      // Generate the single section using withStructuredOutput
      const response = await (model as any).withStructuredOutput(scriptSectionsResponseSchema).invoke(singleSectionPrompt);
      
      // Log the prompt for debugging
      logPromptToFile(singleSectionPrompt, `single_section_regen_${regenerateSection.currentTitle.replace(/[^a-zA-Z0-9]/g, '_')}`, 'outline');
      
      console.log(`✅ Successfully regenerated section: "${response.sections[0]?.title || 'Untitled'}"`);

      return NextResponse.json({
        success: true,
        sections: response.sections,
        meta: {
          title,
          wordCount,
          numSections: 1,
          avgWordsPerSection,
          theme: selectedTheme ? {
            id: selectedTheme.id,
            name: selectedTheme.name
          } : null,
          regeneration: {
            originalTitle: regenerateSection.currentTitle,
            newTitle: response.sections[0]?.title
          }
        }
      });
    }

    // Define batch size for processing
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(numSections / BATCH_SIZE);
    let allSections: ScriptSection[] = [];
    
    console.log(`Generating ${numSections} sections in ${totalBatches} batch(es) of max ${BATCH_SIZE} each`);

    // Process sections in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startSection = batchIndex * BATCH_SIZE;
      const endSection = Math.min((batchIndex + 1) * BATCH_SIZE, numSections);
      const batchSize = endSection - startSection;
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches}: sections ${startSection + 1} to ${endSection}`);
      
      // Create context from previous sections if this isn't the first batch
      let contextInstructions = "";
      if (batchIndex > 0) {
        // Get the last 3 sections or fewer from the previous batch
        const contextSections = allSections.slice(-3);
        contextInstructions = `
    CONTEXT FROM PREVIOUS SECTIONS:
    Here are the last ${contextSections.length} sections that were already created to maintain continuity:
    ${contextSections.map((section, i) => 
      `Section ${startSection - contextSections.length + i + 1}: "${section.title}"
      Writing Instructions: ${section.writingInstructions.substring(0, 150)}...`
    ).join('\n\n')}

    Ensure that your new sections maintain narrative continuity with these previous sections.
    `;
      }

      // Adjust CTA section index for current batch
      let batchCtaSectionIndex = -1;
      if (cta?.enabled && ctaSectionIndices.includes(startSection)) {
        batchCtaSectionIndex = ctaSectionIndices.indexOf(startSection);
      }

      // Create the batch prompt
      const batchPrompt = `You are a master storyteller and researcher creating compelling, authentic video content that sounds like a passionate expert sharing genuine insights. Your goal is to educate and engage through natural human communication, not AI-generated content patterns.

TITLE: "${title}"
CURRENT BATCH: Sections ${startSection + 1} to ${endSection} of ${numSections} total sections
BATCH SIZE: ${batchSize}

FUNDAMENTAL WRITING PRINCIPLES:
${styleContent}

THEMATIC DIRECTION:
${themeInstructions}

${emotionalTone ? `EMOTIONAL APPROACH: ${emotionalTone}` : ''}
${targetAudience ? `INTENDED AUDIENCE: ${targetAudience}` : ''}

${researchData ? `
RESEARCH FOUNDATION:
Incorporate these research insights to create authoritative, fact-based content:

Analysis: ${JSON.stringify(researchData.analysis || {}, null, 2)}
Key Findings: ${researchData.searchResults ? researchData.searchResults.slice(0, 5).map((result: any) => `- ${result.title}: ${result.description}`).join('\n') : 'No search results available'}

INTEGRATION REQUIREMENTS:
- Weave specific facts, statistics, and insights naturally into the narrative
- Use research to support claims with concrete examples
- Reference current developments and real-world applications
- Build authority through demonstrated knowledge, not dramatic claims
- Make abstract concepts tangible through research-backed examples
` : ''}

${forbiddenWords ? `LANGUAGE RESTRICTIONS: Completely avoid these terms: ${forbiddenWords}` : ''}
${additionalInstructions}
${contextInstructions}

ANTI-AI CONTENT REQUIREMENTS:
- NEVER use repetitive catchphrases or formulaic expressions
- ELIMINATE generic, interchangeable language that could apply to any topic
- REJECT artificial excitement or forced urgency
- NEVER repeat the same rhetorical devices or sentence structures across sections
- AVOID lists of vague benefits or empty promises
- CREATE unique, topic-specific insights that demonstrate genuine expertise

NATURAL HUMAN COMMUNICATION STANDARDS:
- Write as if you're a knowledgeable friend sharing fascinating discoveries
- Use varied sentence structures and natural speech patterns
- Include specific, verifiable details and examples
- Show genuine curiosity and intellectual engagement with the topic
- Build arguments through logic and evidence, not repetitive assertions
- Respect your audience's intelligence and critical thinking abilities
- Connect ideas to real-world experiences and practical applications

CONTENT DEPTH REQUIREMENTS:
- Provide specific, actionable insights that viewers can verify or apply
- Explain underlying mechanisms and causalities, not just surface-level claims
- Include historical context, comparative examples, or case studies
- Address complexity and nuance rather than oversimplifying, but not too much to keep it WIDE TAM & broadly understandable
- Connect individual concepts to broader frameworks or principles
- Offer practical next steps or applications for the information shared

${activeCTAs.length > 0 && ctaSectionIndices.some(idx => idx >= startSection && idx < endSection) ? `
CTA INTEGRATION REQUIREMENTS:
${activeCTAs.map((ctaItem: any, ctaIndex: number) => {
  const ctaSectionIndex = ctaSectionIndices[ctaIndex];
  if (ctaSectionIndex >= startSection && ctaSectionIndex < endSection) {
    const batchPosition = ctaSectionIndex - startSection + 1;
    return `- Section ${batchPosition} of this batch (overall section ${ctaSectionIndex + 1}) must include the following CTA:
${getCTAInstructions(ctaItem.type, ctaItem.content)}${ctaItem.type === 'custom' && ctaItem.content ? `\nCustom CTA Content: ${ctaItem.content}` : ''}
CRITICAL: Integrate the CTA naturally into the content flow - it should feel like a natural extension of the discussion, not an abrupt interruption.`;
  }
  return '';
}).filter(Boolean).join('\n')}
` : ''}

SECTION DEVELOPMENT SPECIFICATIONS:
Each section must demonstrate expertise through detailed, valuable content. Your writing instructions should specify:

1. AUTHENTIC ENGAGEMENT STRATEGY:
   - How to open with genuine intrigue based on real phenomena or questions
   - Specific rhetorical approaches that feel natural and conversational
   - Ways to maintain interest through substantial content, not manipulation tactics

2. SUBSTANTIVE CONTENT FRAMEWORK:
   - Key concepts, facts, or insights to explore with supporting evidence
   - Specific examples, case studies, or practical applications to include
   - Historical context, comparative analysis, or expert perspectives to reference
   - How to explain complex ideas through relatable analogies or examples

3. NATURAL PROGRESSION TECHNIQUES:
   - How this section builds upon previous content and sets up future sections
   - Logical transitions that maintain narrative coherence
   - Ways to introduce complexity gradually without overwhelming the audience
   - Connection strategies linking individual insights to broader themes

4. AUDIENCE RESPECT INDICATORS:
   - How to challenge assumptions while validating viewers' intelligence
   - Ways to present controversial or complex ideas with appropriate nuance
   - Techniques for inspiring curiosity and further exploration
   - Methods for empowering viewers rather than creating dependency

For each section, provide:
1. A compelling, specific title that captures unique value (not generic clickbait)
2. Comprehensive writing instructions (minimum 200 words) detailing:
   - The authentic intellectual journey viewers should experience
   - Specific content points with supporting evidence and examples from research
   - Natural engagement techniques that respect audience intelligence
   - How this section contributes to the overall educational narrative
   - Smooth transition strategies maintaining conversational flow
   - Special emphasis on depth, nuance, and practical applicability
   - Concrete examples, analogies, or case studies to include
   - Key questions to address or insights to reveal
   - Emotional pacing and tonal shifts throughout the section
   - Specific facts, statistics, or expert perspectives to reference
   - How to connect abstract concepts to tangible experiences
   - Methods for building credibility and trust with the audience

CRITICAL WORD COUNT ENFORCEMENT:
- Section 1 (Introduction): Maximum 170 words - capture attention through genuine intrigue and establish credibility
- The first section (introduction) of the script should be 170 words MAXIMUM, and its purpose is to REEL the viewer into watching the full video, it must spark curiosity to keep watching
- Sections 2-${numSections}: Target approximately ${avgWordsPerSection} words each (minimum 500 words)
- Include sufficient detail in writing instructions (200 words minimum)
- Better to exceed targets than fall short - aim for substantial, valuable content
- Special note for sections in this batch (${startSection + 1} to ${endSection}):
  ${startSection === 0 ? '  * Section 1 is the INTRODUCTION - limit to 170 words maximum while establishing credibility' : '  * All sections in this batch should target ~' + avgWordsPerSection + ' words each with minimum 500 words'}

${forbiddenWords ? `FINAL REMINDER: Completely avoid these prohibited terms: ${forbiddenWords}` : ''}

Return the response as a JSON object with a "sections" array containing ${batchSize} section objects.`;

      console.log(`🚀 Generating batch ${batchIndex + 1}/${totalBatches}: ${batchSize} sections for: "${title}"`);

      // Generate the batch of sections using withStructuredOutput
      writeFileSync(`batch_${batchIndex + 1}_of_${totalBatches}.txt`, batchPrompt);
      const response = await (model as any).withStructuredOutput(scriptSectionsResponseSchema).invoke(batchPrompt);
      
      // Log the batch prompt for debugging
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      logPromptToFile(batchPrompt, `batch_${batchIndex + 1}_of_${totalBatches}_${sanitizedTitle}`, 'outline');
      
      console.log(`✅ Successfully generated ${response.sections.length} sections for batch ${batchIndex + 1}`);
      allSections = [...allSections, ...response.sections];
    }

    console.log(`✅ Generated all ${allSections.length} script sections for: "${title}"`);

    return NextResponse.json({
      success: true,
      sections: allSections,
      quote: generatedQuote,
      meta: {
        title,
        wordCount,
        numSections,
        avgWordsPerSection,
        theme: selectedTheme ? {
          id: selectedTheme.id,
          name: selectedTheme.name
        } : null,
        ctas: activeCTAs.length > 0 ? {
          enabled: true,
          count: activeCTAs.length,
          placements: ctaSectionIndices.map(idx => idx + 1),
          types: activeCTAs.map((cta: any) => cta.type)
        } : { enabled: false },
        quote: generatedQuote ? {
          generated: true,
          text: generatedQuote.text,
          author: generatedQuote.author
        } : { generated: false },
        researchUsed: !!researchData,
        batchInfo: {
          totalBatches,
          batchSize: BATCH_SIZE,
          sectionsGenerated: allSections.length
        }
      }
    });

  } catch (error) {
    console.error('Error generating script sections:', error);
    return NextResponse.json(
      { error: 'Failed to generate script sections: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Create new file for Option 1: Title only outline generation 

// Define CTA instructions based on type
const getCTAInstructions = (type: string, content?: string) => {
  switch (type) {
    case 'newsletter':
      return `
IMPORTANT CTA REQUIREMENT: You must incorporate a short CTA to our newsletter called "Insights Academy" (make it clear that it is a free newsletter) where we share more hidden knowledge exclusively. Frame the CTA as if some things are too confidential to share on YouTube (so they are more likely to sign up). Mention that the viewer will receive a free ebook copy of "The Kybalion" (hermetic book) upon signing up for a limited time only (this is not a reward). The viewer must go to the link in the description and enter their email to receive the e-book. This CTA must be incorporated smoothly and in flow with the script around it and can only be 2 sentences max. It must be short, sharp and concise so that viewers won't click off or skip. The CTA must use persuasive sales writing and sound as if some things can't be shared on YouTube, but you must come up with your own that suits the current section. It must be positioned in a way so viewers cannot afford to lose this opportunity to not sign up. Make sure you seamlessly flow into this CTA from the previous paragraph and into the next.`;
    
    case 'engagement':
      return `
IMPORTANT CTA REQUIREMENT: You must incorporate this engagement CTA: "If this video resonated with you, let us know by commenting, 'I understood it.'" CRITICAL: When this CTA is positioned in the final section (end positioning), it MUST be the very last sentence of the entire section. For other positions, integrate it smoothly within the content flow. This should feel natural and be integrated seamlessly with the surrounding content. Make it feel like a genuine request for engagement rather than a forced call-to-action.`;
    
    case 'custom':
      return content ? `
IMPORTANT CTA REQUIREMENT: You must incorporate this custom CTA smoothly into the content: "${content}" This should feel natural and be integrated seamlessly with the surrounding content.` : '';
    
    default:
      return '';
  }
}; 