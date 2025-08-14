import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

// Function to remove all links from content and replace with "LINK REMOVED"
function removeLinksFromContent(content: string): string {
  console.log('🔗 Removing links from content')
  
  let processedContent = content
  
  // Remove markdown links [text](url) -> "text LINK REMOVED"
  processedContent = processedContent.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1 LINK REMOVED')
  
  // Remove markdown reference links [text][ref] -> "text LINK REMOVED"
  processedContent = processedContent.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1 LINK REMOVED')
  
  // Remove HTML links <a href="url">text</a> -> "text LINK REMOVED"
  processedContent = processedContent.replace(/<a[^>]*href="[^"]*"[^>]*>([^<]*)<\/a>/gi, '$1 LINK REMOVED')
  
  // Remove plain URLs (http/https/ftp)
  processedContent = processedContent.replace(/(https?:\/\/[^\s]+)/g, 'LINK REMOVED')
  processedContent = processedContent.replace(/(ftp:\/\/[^\s]+)/g, 'LINK REMOVED')
  
  // Remove www URLs
  processedContent = processedContent.replace(/(www\.[^\s]+)/g, 'LINK REMOVED')
  
  // Remove email links
  processedContent = processedContent.replace(/mailto:[^\s]+/g, 'LINK REMOVED')
  
  // Remove reference link definitions [ref]: url
  processedContent = processedContent.replace(/^\[[^\]]+\]:\s*[^\s]+.*$/gm, '')
  
  // Clean up multiple consecutive "LINK REMOVED" occurrences
  processedContent = processedContent.replace(/(\s*LINK REMOVED\s*){2,}/g, ' LINK REMOVED ')
  
  // Clean up extra whitespace
  processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n')
  
  console.log('✅ Successfully removed all links from content')
  return processedContent.trim()
}

interface WebSearchResult {
  title: string
  link: string
  description: string
  source?: string
  date?: string
}

interface PerplexityResponse {
  id: string
  model: string
  created: number
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    search_context_size?: string
    citation_tokens?: number
    num_search_queries?: number
    reasoning_tokens?: number
  }
  object: string
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      content: string
      role: string
    }
  }>
  citations?: string[]
  search_results?: Array<{
    title: string
    url: string
    date: string
    last_updated?: string
  }>
}

// Enhanced Zod schema for rich research extraction (similar to Gemini analysis)
const ArticleSummarySchema = z.object({
  articleId: z.string().describe("Unique identifier for the article"),
  title: z.string().describe("Article title"),
  url: z.string().describe("Article URL"),
  source: z.string().describe("Source publication name"),
  keyPoints: z.array(z.string()).describe("3-5 key points from this article"),
  mainTopic: z.string().describe("Primary topic/theme of the article"),
  keyQuotes: z.array(z.string()).describe("Important quotes from the article"),
  narrativeElements: z.array(z.string()).describe("Story elements, conflicts, or dramatic points"),
  emotionalTone: z.string().describe("Emotional tone of the article (e.g., urgent, optimistic, analytical)"),
  dramaticElements: z.array(z.string()).describe("Dramatic or compelling elements for storytelling"),
  contextualInfo: z.string().describe("Background context and significance"),
  overallTheme: z.string().describe("Overall theme or message of the article"),
  date: z.string().optional().describe("Publication date if available")
})

const ResearchExtractionSchema = z.object({
  overallTheme: z.string().describe("Central theme connecting all research findings"),
  keyInsights: z.array(z.string()).describe("5-7 major insights from the research"),
  articleSummaries: z.array(ArticleSummarySchema).describe("Detailed analysis of key articles"),
  commonPatterns: z.array(z.string()).describe("Patterns or trends across multiple sources"),
  actionableItems: z.array(z.string()).describe("Specific actionable recommendations"),
  narrativeThemes: z.array(z.string()).describe("Story themes for content creation"),
  characterInsights: z.array(z.string()).describe("Insights about people, organizations, or key figures"),
  conflictElements: z.array(z.string()).describe("Tensions, conflicts, or controversies discovered"),
  visualAudioCues: z.array(z.string()).describe("Visual or audio elements that could enhance content"),
  audienceQuestions: z.array(z.string()).describe("Engaging questions or hooks for audience engagement")
})

// Get raw research from Perplexity
async function getPerplexityResearch(query: string, region: string = 'us', language: string = 'en'): Promise<PerplexityResponse> {
  console.log(`🔍 Getting raw research from Perplexity for: "${query}" (region: ${region}, language: ${language})`)
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a comprehensive research assistant. Provide detailed, well-sourced research with specific facts, data, quotes, and citations. Include current information, multiple perspectives, dramatic elements, and compelling storytelling angles on the topic. Always prioritize English-language sources and provide responses in English. Focus on credible news sources, academic publications, official websites, and professional publications. Avoid social media platforms including YouTube, Instagram, TikTok, Twitter, Facebook, LinkedIn, Reddit, and similar platforms.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      search_mode: 'web',
      reasoning_effort: 'high',
      temperature: 0.2,
      top_p: 0.9,
      return_images: false,
      return_related_questions: false,
      top_k: 0,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 0,
      web_search_options: {
        search_context_size: 'high',
        search_recency_filter: 'month',
        search_domain_filter: 'all',
        region: region,
        language: language
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Perplexity API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
  }

  const data: PerplexityResponse = await response.json()
  
  // Write raw Perplexity response to file
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `perplexity-response-${timestamp}.txt`
    const filePath = path.join(process.cwd(), 'logs', filename)
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    
    // Write the raw response to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    console.log(`📝 Raw Perplexity response saved to: ${filename}`)
  } catch (fileError) {
    console.error('Failed to save Perplexity response to file:', fileError)
  }
  
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid response from Perplexity API')
  }

  return data
}

// Extract rich structured data using LLM
async function extractRichResearchData(perplexityData: PerplexityResponse, maxResults: number): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, using basic extraction')
    return extractBasicStructure(perplexityData, maxResults)
  }

  console.log(`🤖 Extracting rich research data using LLM`)

  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 8000
  })

  const content = perplexityData.choices[0].message.content
  const searchResults = perplexityData.search_results || []
  const citations = perplexityData.citations || []

  const systemPrompt = `You are an expert research analyst specializing in extracting rich, structured insights from comprehensive research content. Your task is to analyze research from Perplexity AI and extract detailed, creative, and actionable insights.

Focus on creating:
- Compelling narrative elements and storytelling angles
- Visual and audio cues that could enhance content creation
- Engaging audience questions and hooks
- Dramatic elements and conflicts within the research
- Character insights about people, organizations involved
- Detailed analysis of individual articles with rich metadata

Extract comprehensive insights that go beyond basic facts to include emotional tone, dramatic elements, creative possibilities, and storytelling potential.`

  const userPrompt = `Analyze this comprehensive research and extract rich, structured insights:

RESEARCH CONTENT:
${content}

SEARCH RESULTS:
${JSON.stringify(searchResults, null, 2)}

CITATIONS:
${JSON.stringify(citations, null, 2)}

Extract detailed research insights including:
1. Overall themes and key insights
2. Detailed analysis of up to ${Math.min(maxResults, 8)} key articles with rich metadata
3. Creative elements: visual/audio cues, audience questions, story ideas
4. Dramatic elements: conflicts, tensions, compelling angles
5. Character insights about key figures or organizations
6. Actionable recommendations and narrative themes

Focus on creating content that would be excellent for storytelling, video creation, and audience engagement.`

  try {
    const modelWithStructure = model.withStructuredOutput(ResearchExtractionSchema)
    
    const structuredOutput = await modelWithStructure.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])

    console.log(`✅ Extracted rich research data with ${structuredOutput.articleSummaries.length} article analyses`)
    return structuredOutput

  } catch (error) {
    console.error('LLM extraction error, falling back to basic extraction:', error)
    return extractBasicStructure(perplexityData, maxResults)
  }
}

// Fallback extraction method
function extractBasicStructure(perplexityData: PerplexityResponse, maxResults: number): any {
  console.log('📝 Using basic extraction as fallback')
  
  const content = perplexityData.choices[0].message.content
  const searchResults = perplexityData.search_results || []
  const citations = perplexityData.citations || []
  
  const articleSummaries: any[] = []

  // Create basic article summaries from search results
  if (searchResults.length > 0) {
    searchResults.slice(0, maxResults).forEach((result, index) => {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
      const relevantContent = sentences.slice(index * 2, (index * 2) + 3).join('. ').trim()

      articleSummaries.push({
        articleId: `article-${index + 1}`,
        title: result.title,
        url: result.url,
        source: new URL(result.url).hostname,
        keyPoints: [relevantContent || `Key insights from ${result.title}`],
        mainTopic: `Research findings from ${result.title}`,
        keyQuotes: [relevantContent.substring(0, 200)],
        narrativeElements: [`Analysis from ${result.title}`],
        emotionalTone: 'Informative',
        dramaticElements: ['Research findings'],
        contextualInfo: relevantContent || `Content from ${result.title}`,
        overallTheme: `Insights from ${result.title}`,
        date: result.date
      })
    })
  }

  // Basic structure with fallback values
  return {
    overallTheme: `Research findings on the requested topic`,
    keyInsights: [
      'Comprehensive research analysis from multiple sources',
      'Current information and expert perspectives',
      'Data-driven insights and recommendations'
    ],
    articleSummaries,
    commonPatterns: ['Emerging trends in the research area'],
    actionableItems: ['Review detailed findings', 'Consider implementation strategies'],
    narrativeThemes: ['Research-based insights', 'Expert analysis'],
    characterInsights: ['Key figures and organizations involved'],
    conflictElements: ['Different perspectives on the topic'],
    visualAudioCues: ['Charts and data visualizations', 'Expert interview clips'],
    audienceQuestions: ['What does this mean for your industry?', 'How might this affect you?']
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/research/web-search (Perplexity + Rich LLM Extraction) ===')
  
  try {
    const { query, context, maxResults = 10, region = 'us', language = 'en' } = await request.json()
    
    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Perplexity API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🔍 Processing rich research request: "${query}" (max: ${maxResults} results)`)
    
    // Enhance query with context if provided
    const enhancedQuery = context ? `${query}\n\nContext: ${context}` : query
    
    // Step 1: Get comprehensive research from Perplexity
    const perplexityData = await getPerplexityResearch(enhancedQuery, region, language)
    console.log(`📊 Perplexity provided ${perplexityData.search_results?.length || 0} source results`)
    
    console.log(`✅ Perplexity search completed with ${perplexityData.search_results?.length || 0} search results`)
    
    // Social media domains that Firecrawl cannot scrape
    const socialMediaDomains = [
      'youtube.com',
      'youtu.be',
      'instagram.com',
      'facebook.com',
      'fb.com',
      'tiktok.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'snapchat.com',
      'pinterest.com',
      'reddit.com',
      'discord.com',
      'telegram.org',
      'whatsapp.com',
      'wechat.com',
      'weibo.com',
      'vk.com',
      'twitch.tv',
      'clubhouse.com'
    ]

    // Function to check if a URL is from a social media platform
    const isSocialMediaUrl = (url: string): boolean => {
      try {
        const hostname = new URL(url).hostname.toLowerCase()
        return socialMediaDomains.some(domain => 
          hostname === domain || 
          hostname.endsWith(`.${domain}`) ||
          hostname.includes(domain.split('.')[0])
        )
      } catch {
        return false
      }
    }

    // Extract and filter available links from Perplexity search results
    const allLinks = (perplexityData.search_results || []).map((result: any) => ({
      url: result.url,
      title: result.title,
      source: new URL(result.url).hostname,
      date: result.date,
      last_updated: result.last_updated,
      isSocialMedia: isSocialMediaUrl(result.url)
    }))

    // Filter out social media links for scraping
    const availableLinks = allLinks.filter(link => !link.isSocialMedia)
    const filteredLinks = allLinks.filter(link => link.isSocialMedia)

    // Create filtering stats
    const filteringStats = {
      totalFound: allLinks.length,
      availableForScraping: availableLinks.length,
      filteredOut: filteredLinks.length,
      filteredDomains: [...new Set(filteredLinks.map(link => link.source))],
      reason: 'Social media platforms cannot be scraped by Firecrawl'
    }

    console.log(`🔍 Filtering results: ${allLinks.length} total, ${availableLinks.length} available, ${filteredLinks.length} filtered (social media)`)
    
    // Clean links from Perplexity content
    const rawContent = perplexityData.choices[0]?.message?.content || ''
    const cleanedContent = rawContent ? removeLinksFromContent(rawContent) : ''
    
    // Step 2: Extract rich structured data using LLM (optional - for advanced analysis)
    const structuredData = await extractRichResearchData(perplexityData, Math.min(maxResults, 8))
    
    return NextResponse.json({
      success: true,
      perplexityData, // Raw Perplexity response
      query: enhancedQuery,
      perplexityUsage: perplexityData.usage,
      availableLinks, // Links available for scraping (filtered)
      filteringStats, // Information about what was filtered
      content: cleanedContent, // Content with links removed
      citations: perplexityData.citations || [],
      search_results: perplexityData.search_results || [],
      structuredData, // Rich extracted insights
      results: availableLinks.map(link => ({
        title: link.title,
        link: link.url,
        description: cleanedContent.substring(0, 200) + '...',
        source: link.source,
        date: link.date
      }))
    })

  } catch (error) {
    console.error('Research processing error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process research request'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Perplexity AI research with rich LLM extraction API is running',
    endpoints: {
      POST: 'Research using Perplexity AI with comprehensive structured data extraction'
    }
  })
} 