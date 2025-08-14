import { NextRequest, NextResponse } from 'next/server'
import FirecrawlApp, { ScrapeResponse, ErrorResponse } from '@mendable/firecrawl-js'

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

// Initialize Firecrawl with API key from environment variables
const getFirecrawlApp = () => {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set')
  }
  return new FirecrawlApp({ apiKey })
}

// Function to scrape a single URL using Firecrawl
async function scrapeWithFirecrawl(url: string): Promise<{ content: string; title: string }> {
  console.log(`🔥 Scraping URL with Firecrawl: ${url}`)
  
  try {
    const app = getFirecrawlApp()
    
    const scrapeResult: ScrapeResponse | ErrorResponse = await app.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      includeTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'article', 'section', 'main'],
      excludeTags: ['nav', 'footer', 'aside', 'header', 'script', 'style', 'form', 'iframe'],
      waitFor: 3000,
      timeout: 30000
    })

    if (!scrapeResult.success) {
      const errorResult = scrapeResult as ErrorResponse
      throw new Error(`Firecrawl scraping failed: ${errorResult.error}`)
    }

    const successResult = scrapeResult as ScrapeResponse
    
    if (!successResult.markdown || successResult.markdown.trim().length === 0) {
      throw new Error('No content could be extracted from the page')
    }

    // Clean the content to remove links
    const cleanedContent = removeLinksFromContent(successResult.markdown)
    
    console.log(`✅ Successfully scraped ${url}`)
    console.log(`📄 Content length: ${cleanedContent.length} characters`)
    
    return {
      content: cleanedContent,
      title: successResult.metadata?.title || 'Scraped Article'
    }
    
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/research/scrape-link (Firecrawl) ===')
  
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid URL is required' },
        { status: 400 }
      )
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if Firecrawl API key is configured
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Firecrawl API key not configured' },
        { status: 500 }
      )
    }

    console.log(`🔍 Starting Firecrawl scraping for: ${url}`)
    
    // Social media domains that cannot be scraped
    const socialMediaDomains = [
      'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.com',
      'tiktok.com', 'twitter.com', 'x.com', 'linkedin.com', 'snapchat.com',
      'pinterest.com', 'reddit.com', 'discord.com', 'telegram.org',
      'whatsapp.com', 'wechat.com', 'weibo.com', 'vk.com', 'twitch.tv', 'clubhouse.com'
    ]

    // Check if URL is from a social media platform
    const hostname = new URL(url).hostname.toLowerCase()
    const isSocialMedia = socialMediaDomains.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`) ||
      hostname.includes(domain.split('.')[0])
    )

    if (isSocialMedia) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Social media platforms cannot be scraped with Firecrawl',
          isSocialMedia: true,
          domain: hostname
        },
        { status: 400 }
      )
    }
    
    // Scrape the URL
    const { content, title } = await scrapeWithFirecrawl(url)
    
    console.log(`✅ Successfully completed scraping for ${url}`)
    console.log(`📊 Final content length: ${content.length} characters`)
    
    return NextResponse.json({
      success: true,
      url,
      title,
      content,
      contentLength: content.length,
      timestamp: new Date().toISOString(),
      method: 'firecrawl'
    })

  } catch (error) {
    console.error('Firecrawl scraping error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape URL'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ 
      message: 'Firecrawl link scraping API is running',
      usage: 'POST with { url: "https://example.com" } or GET with ?url=https://example.com',
      requirements: 'FIRECRAWL_API_KEY environment variable must be set'
    })
  }
  
  // Handle GET request by converting to POST body format
  return await POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  }))
} 