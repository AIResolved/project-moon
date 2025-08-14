import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBZxCR32V4JAWYUF0dZmh1lNAPqlW1e-Ew'

interface ChannelAnalysisParams {
  channelUrl: string
  userPrompt?: string
}

interface CustomSession {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface VideoWithStats {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: any
    channelTitle: string
  }
  statistics: {
    viewCount: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails: {
    duration: string
  }
}

// Function to get session from cookies (NextAuth v5 compatible)
async function getSessionFromCookies(): Promise<CustomSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token')
    
    if (!sessionToken) {
      return null
    }

    // For now, return null since we can't easily decode JWT in production
    // The API will fall back to using the API key
    return null
  } catch (error) {
    console.error('Error getting session from cookies:', error)
    return null
  }
}

// Function to refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const data = await response.json()
    
    if (response.ok && data.access_token) {
      return data.access_token
    } else {
      return null
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Function to get valid access token
async function getValidAccessToken(session: CustomSession): Promise<string | null> {
  if (!session.accessToken) {
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expiresAt || 0
  const isExpired = now >= (expiresAt - 300) // 5 minute buffer

  if (isExpired) {
    if (session.refreshToken) {
      const newToken = await refreshAccessToken(session.refreshToken)
      if (newToken) {
        return newToken
      }
    }
    return null
  }

  return session.accessToken
}

// Extract channel ID from various YouTube URL formats
function extractChannelId(url: string): string | null {
  if (!url) {
    return null
  }
  
  // If it's already a channel ID (starts with UC and is 24 characters)
  if (url.match(/^UC[\w-]{22}$/)) {
    return url
  }
  
  // Remove any trailing slashes and query parameters
  url = url.split('?')[0].replace(/\/$/, '')
  
  // Extract from different URL formats
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
    /youtube\.com\/user\/([\w-]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      if (pattern.source.includes('channel')) {
        return match[1] // Direct channel ID
      } else {
        return match[1] // Username/handle - will need to resolve
      }
    }
  }
  
  return null
}

// Resolve username/handle to channel ID
async function resolveChannelId(usernameOrHandle: string, urlType: string, accessToken?: string): Promise<string | null> {
  try {
    let url: string
    
    if (urlType === 'handle') {
      // For @handles, we need to search
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(usernameOrHandle)}&type=channel&maxResults=1`
    } else {
      // For usernames and custom URLs, try channels endpoint
      url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(usernameOrHandle)}`
    }
    
    // Use OAuth token if available, otherwise fall back to API key
    if (accessToken) {
      url += `&access_token=${accessToken}`
    } else {
      url += `&key=${API_KEY}`
    }
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.items && data.items.length > 0) {
      const channelId = urlType === 'handle' ? data.items[0].snippet.channelId : data.items[0].id
      return channelId
    }
    
    return null
  } catch (error) {
    console.error('Error resolving channel ID:', error)
    return null
  }
}

// Function to fetch all videos from a channel (with pagination)
async function fetchAllChannelVideos(channelId: string, accessToken?: string): Promise<VideoWithStats[]> {
  const allVideos: any[] = []
  let nextPageToken = ''
  let pageCount = 0
  const maxPages = 20 // Limit to prevent infinite loops, adjust as needed
  
  console.log('🔍 Starting to fetch all videos for channel:', channelId)
  
  do {
    try {
      // Build search parameters for this page
      const searchParams = new URLSearchParams({
        part: 'snippet,id',
        channelId: channelId,
        type: 'video',
        order: 'date', // Get all videos in chronological order
        maxResults: '50', // Maximum allowed per request
      })

      if (nextPageToken) {
        searchParams.append('pageToken', nextPageToken)
      }

      // Use OAuth token if available, otherwise fall back to API key
      if (accessToken) {
        searchParams.append('access_token', accessToken)
      } else {
        searchParams.append('key', API_KEY)
      }

      console.log(`📄 Fetching page ${pageCount + 1} of videos...`)
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`)
      
      if (!response.ok) {
        console.error('❌ Failed to fetch videos page:', response.status)
        break
      }

      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        allVideos.push(...data.items)
        console.log(`✅ Fetched ${data.items.length} videos (total: ${allVideos.length})`)
      }
      
      nextPageToken = data.nextPageToken || ''
      pageCount++
      
      // Add a small delay to be respectful to the API
      if (nextPageToken && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
    } catch (error) {
      console.error('💥 Error fetching videos page:', error)
      break
    }
  } while (nextPageToken && pageCount < maxPages)
  
  console.log(`🎯 Total videos fetched: ${allVideos.length}`)
  
  // Now fetch statistics for all videos
  if (allVideos.length > 0) {
    console.log('📊 Fetching statistics for all videos...')
    const videosWithStats: VideoWithStats[] = []
    
    // Process videos in batches of 50 (YouTube API limit)
    for (let i = 0; i < allVideos.length; i += 50) {
      const batch = allVideos.slice(i, i + 50)
      const videoIds = batch.map(video => video.id.videoId).join(',')
      
      const detailsParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        id: videoIds
      })

      if (accessToken) {
        detailsParams.append('access_token', accessToken)
      } else {
        detailsParams.append('key', API_KEY)
      }

      try {
        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams}`)
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json()
          
          // Merge statistics with video data
          const batchWithStats = batch.map(video => {
            const details = detailsData.items?.find((detail: any) => detail.id === video.id.videoId)
            return {
              ...video,
              statistics: details?.statistics || { viewCount: '0' },
              contentDetails: details?.contentDetails || { duration: 'PT0S' }
            }
          })
          
          videosWithStats.push(...batchWithStats)
          console.log(`📊 Processed batch ${Math.floor(i/50) + 1}, total processed: ${videosWithStats.length}`)
          
          // Add delay between batches
          if (i + 50 < allVideos.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      } catch (error) {
        console.error('💥 Error fetching video details batch:', error)
      }
    }
    
    return videosWithStats
  }
  
  return []
}

// Function to generate title suggestions using OpenAI
async function generateTitleSuggestions(topTitles: string[], userPrompt?: string): Promise<{
  suggestions: string[]
  analysis: string
}> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Based on these top-performing YouTube video titles from a channel:

${topTitles.map((title, index) => `${index + 1}. ${title}`).join('\n')}

User's custom prompt: ${userPrompt || 'No specific requirements provided'}

Please analyze these titles and provide:
1. 10 new video title suggestions that follow the successful patterns
2. A brief analysis of what makes these titles successful

Focus on the patterns in language, structure, emotional triggers, and formatting that make these titles successful.

Return your response in the following JSON format:
{
  "suggestions": ["title 1", "title 2", ...],
  "analysis": "Brief analysis of successful patterns"
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a YouTube title optimization expert. Analyze successful video titles and generate new suggestions that follow proven patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Try to parse JSON from the response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          suggestions: result.suggestions || [],
          analysis: result.analysis || 'No analysis provided'
        }
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI JSON response:', parseError)
    }

    // Fallback if JSON parsing fails
    return {
      suggestions: [],
      analysis: content
    }

  } catch (error) {
    console.error('Error generating title suggestions:', error)
    return {
      suggestions: [],
      analysis: 'Error generating analysis'
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 YouTube channel analysis API endpoint hit')
  
  try {
    const session = await getSessionFromCookies()
    const { channelUrl, userPrompt }: ChannelAnalysisParams = await request.json()
    
    console.log('📋 Request params:', { channelUrl, userPrompt })
    
    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Please provide a channel URL.' },
        { status: 400 }
      )
    }

    let validAccessToken: string | null = null

    // Get valid access token if session exists
    if (session) {
      validAccessToken = await getValidAccessToken(session)
    }
    
    // Extract and resolve channel ID
    console.log('🔗 Processing channel URL:', channelUrl)
    let channelId = extractChannelId(channelUrl)
    
    if (!channelId) {
      return NextResponse.json(
        { error: 'Could not extract channel ID from the provided URL. Please check the format.' },
        { status: 400 }
      )
    }
    
    // If it's not a direct channel ID, try to resolve it
    if (!channelId.match(/^UC[\w-]{22}$/)) {
      const urlType = channelUrl.includes('@') ? 'handle' : 'username'
      const resolvedId = await resolveChannelId(channelId, urlType, validAccessToken || undefined)
      
      if (!resolvedId) {
        return NextResponse.json(
          { error: 'Could not find channel. Please verify the URL is correct.' },
          { status: 404 }
        )
      }
      
      channelId = resolvedId
    }

    console.log('✅ Channel ID resolved to:', channelId)

    // Fetch all videos from the channel
    console.log('🎬 Fetching all videos from channel...')
    const allVideos = await fetchAllChannelVideos(channelId, validAccessToken || undefined)
    
    if (allVideos.length === 0) {
      return NextResponse.json(
        { error: 'No videos found for this channel or channel is private.' },
        { status: 404 }
      )
    }

    console.log(`📊 Total videos found: ${allVideos.length}`)

    // Sort videos by view count (descending)
    const sortedVideos = allVideos
      .filter(video => video.statistics && video.statistics.viewCount)
      .sort((a, b) => {
        const viewsA = parseInt(a.statistics.viewCount) || 0
        const viewsB = parseInt(b.statistics.viewCount) || 0
        return viewsB - viewsA
      })

    console.log(`🔝 Sorted ${sortedVideos.length} videos by view count`)

    // Get top 10 performing videos
    const top10Videos = sortedVideos.slice(0, 10)
    const top10Titles = top10Videos.map(video => video.snippet.title)

    console.log('🎯 Top 10 video titles:', top10Titles)

    // Generate title suggestions using AI
    console.log('🤖 Generating title suggestions...')
    const aiSuggestions = await generateTitleSuggestions(top10Titles, userPrompt)

    // Get channel info
    const channelInfoParams = new URLSearchParams({
      part: 'snippet,statistics',
      id: channelId
    })

    if (validAccessToken) {
      channelInfoParams.append('access_token', validAccessToken)
    } else {
      channelInfoParams.append('key', API_KEY)
    }

    let channelInfo = null
    try {
      const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?${channelInfoParams}`)
      if (channelResponse.ok) {
        const channelData = await channelResponse.json()
        channelInfo = channelData.items?.[0] || null
      }
    } catch (error) {
      console.error('Error fetching channel info:', error)
    }

    console.log('✅ Channel analysis completed successfully')

    return NextResponse.json({
      success: true,
      data: {
        channelInfo,
        totalVideos: allVideos.length,
        analyzedVideos: sortedVideos.length,
        top10Videos: top10Videos.map(video => ({
          id: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          publishedAt: video.snippet.publishedAt,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount || '0',
          commentCount: video.statistics.commentCount || '0',
          duration: video.contentDetails.duration,
          thumbnails: video.snippet.thumbnails
        })),
        titleSuggestions: aiSuggestions.suggestions,
        analysis: aiSuggestions.analysis,
        userPrompt
      },
      authenticated: !!validAccessToken
    })
    
  } catch (error) {
    console.error('💥 YouTube channel analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'YouTube channel analysis API is working',
    method: 'GET',
    usage: 'Use POST method to analyze a channel'
  })
}


