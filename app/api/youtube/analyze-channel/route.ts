import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_KEY = process.env.YOUTUBE_API_KEY

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

interface ChannelVideo {
  id: string
    title: string
  views: number
  likes: number
    publishedAt: string
  thumbnail: string
  url: string
  score: number
}

interface AnalysisResult {
  channelName: string
  totalVideos: number
  topVideos: ChannelVideo[]
  suggestedTitles: string[]
  insights: {
    commonKeywords: string[]
    averageViews: number
    topPerformingCategories: string[]
    titlePatterns: string[]
  }
}

// Function to get session from cookies (NextAuth v5 compatible)
async function getSessionFromCookies(): Promise<CustomSession | null> {
  console.log('🍪 Attempting to get session from cookies')
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token')
    
    console.log('🍪 Session token found:', !!sessionToken)
    
    if (!sessionToken) {
      console.log('🍪 No session token in cookies')
      return null
    }

    // For now, return null since we can't easily decode JWT in production
    // The API will fall back to using the API key
    console.log('🍪 Session token exists but returning null (will use API key)')
    return null
  } catch (error) {
    console.error('💥 Error getting session from cookies:', error)
    return null
  }
}

// Function to refresh access token if needed
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  console.log('🔄 Starting token refresh process')
  try {
    console.log('📡 Making token refresh request to Google OAuth')
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

    console.log('📡 Token refresh response status:', response.status)
    const data = await response.json()
    console.log('📡 Token refresh response data:', data)
    
    if (response.ok && data.access_token) {
      console.log('✅ Successfully refreshed access token')
      return data.access_token
    } else {
      console.error('❌ Failed to refresh token:', data)
      return null
    }
  } catch (error) {
    console.error('💥 Error refreshing token:', error)
    return null
  }
}

// Function to get valid access token
async function getValidAccessToken(session: CustomSession): Promise<string | null> {
  console.log('🔍 Checking access token validity')
  console.log('🔍 Session has accessToken:', !!session.accessToken)
  console.log('🔍 Session has refreshToken:', !!session.refreshToken)
  console.log('🔍 Session expiresAt:', session.expiresAt)
  
  if (!session.accessToken) {
    console.log('❌ No access token in session')
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expiresAt || 0
  const isExpired = now >= (expiresAt - 300) // 5 minute buffer
  
  console.log('⏰ Current timestamp:', now)
  console.log('⏰ Token expires at:', expiresAt)
  console.log('⏰ Token is expired:', isExpired)

  if (isExpired) {
    console.log('⚠️ Access token is expired, attempting to refresh')
    if (session.refreshToken) {
      console.log('🔄 Refresh token available, attempting refresh')
      const newToken = await refreshAccessToken(session.refreshToken)
      if (newToken) {
        console.log('✅ Token refresh successful')
        return newToken
      }
    } else {
      console.log('❌ No refresh token available')
    }
    console.log('❌ Failed to refresh token')
    return null
  }

  console.log('✅ Using existing access token')
  return session.accessToken
}

// Extract channel ID from various YouTube URL formats
function extractChannelId(url: string): string | null {
  console.log('🔗 Extracting channel ID from URL:', url)
  
  if (!url) {
    console.log('❌ No URL provided')
    return null
  }
  
  // If it's already a channel ID (starts with UC and is 24 characters)
  if (url.match(/^UC[\w-]{22}$/)) {
    console.log('✅ URL is already a channel ID:', url)
    return url
  }
  
  // Remove any trailing slashes and query parameters
  url = url.split('?')[0].replace(/\/$/, '')
  console.log('🧹 Cleaned URL:', url)
  
  // Extract from different URL formats
  const patterns = [
    /youtube\.com\/channel\/(UC[\w-]{22})/,
    /youtube\.com\/c\/([\w-]+)/,
    /youtube\.com\/@([\w-]+)/,
    /youtube\.com\/user\/([\w-]+)/
  ]
  
  for (const pattern of patterns) {
    console.log('🔍 Testing pattern:', pattern.source)
    const match = url.match(pattern)
    if (match) {
      console.log('✅ Pattern matched:', match)
      if (pattern.source.includes('channel')) {
        console.log('✅ Direct channel ID found:', match[1])
        return match[1] // Direct channel ID
      } else {
        console.log('🔍 Username/handle found:', match[1])
        return match[1] // Username/handle - will need to resolve
      }
    }
  }
  
  console.log('❌ No pattern matched')
  return null
}

// Resolve username/handle to channel ID
async function resolveChannelId(usernameOrHandle: string, urlType: string, accessToken?: string): Promise<string | null> {
  console.log('🔍 Resolving channel ID for:', usernameOrHandle, 'type:', urlType)
  
  try {
    let url: string
    
    if (urlType === 'handle') {
      // For @handles, we need to search
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(usernameOrHandle)}&type=channel&maxResults=1`
      console.log('🔍 Using search endpoint for handle')
    } else {
      // For usernames and custom URLs, try channels endpoint
      url = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(usernameOrHandle)}`
      console.log('🔍 Using channels endpoint for username')
    }
    
    // Use OAuth token if available, otherwise fall back to API key
    if (accessToken) {
      url += `&access_token=${accessToken}`
      console.log('🔑 Using OAuth token for channel resolution')
    } else {
      url += `&key=${API_KEY}`
      console.log('🔑 Using API key for channel resolution')
    }
    
    console.log('📡 Channel resolution URL:', url)
    
    const response = await fetch(url)
    console.log('📡 Channel resolution response status:', response.status)
    const data = await response.json()
    
    console.log('📡 Channel resolution response data:', JSON.stringify(data, null, 2))
    
    if (data.items && data.items.length > 0) {
      const channelId = urlType === 'handle' ? data.items[0].snippet.channelId : data.items[0].id
      console.log('✅ Resolved channel ID:', channelId)
      return channelId
    }
    
    console.log('❌ No channel found in response')
    return null
  } catch (error) {
    console.error('💥 Error resolving channel ID:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 Channel analysis API endpoint hit')
  console.log('🌍 Environment:', process.env.NODE_ENV)
  console.log('🔑 API Key available:', !!API_KEY)
  console.log('🔑 Google Client ID available:', !!process.env.GOOGLE_CLIENT_ID)
  console.log('🔑 Google Client Secret available:', !!process.env.GOOGLE_CLIENT_SECRET)
  
  try {
    console.log('🔐 Attempting to get session from cookies...')
    const session = await getSessionFromCookies()
    console.log('🔐 Session retrieval completed')
    console.log('👤 Session:', session ? 'exists' : 'null')
    
    console.log('📝 Parsing request body...')
    const { channelUrl, query } = await request.json()
    console.log('📝 Request body parsed successfully')
    
    console.log('📋 Request params:', { channelUrl, query })

    if (!channelUrl) {
      console.log('❌ Validation failed: no channel URL')
      return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })
    }

    let validAccessToken: string | null = null

    console.log('🔍 Processing session for access token...')
    // Get valid access token if session exists
    if (session) {
      console.log('🔍 Session exists, getting valid access token...')
      validAccessToken = await getValidAccessToken(session)
      console.log('🔍 Valid access token result:', !!validAccessToken)
      } else {
      console.log('⚠️ No session available, will use API key')
    }

    console.log('🔗 Processing channel URL:', channelUrl)
    let channelId = extractChannelId(channelUrl)
    console.log('🔗 Extracted channel ID:', channelId)
    
    if (!channelId) {
      console.log('❌ Could not extract channel ID')
      return NextResponse.json({ error: 'Invalid channel URL format' }, { status: 400 })
    }
    
    // If it's not a direct channel ID, try to resolve it
    if (!channelId.match(/^UC[\w-]{22}$/)) {
      console.log('🔍 Need to resolve channel ID for:', channelId)
      const urlType = channelUrl.includes('@') ? 'handle' : 'username'
      console.log('🔍 URL type determined:', urlType)
      const resolvedId = await resolveChannelId(channelId, urlType, validAccessToken || undefined)
      
      if (!resolvedId) {
        console.log('❌ Could not resolve channel ID')
        return NextResponse.json({ error: 'Could not find channel. Please verify the URL is correct.' }, { status: 404 })
      }
      
      channelId = resolvedId
      console.log('✅ Channel ID resolved to:', channelId)
    }

    console.log('🔧 Building search parameters...')
    // Step 1: Get channel videos directly from YouTube API (get more for better selection)
    const searchParams = new URLSearchParams({
      part: 'snippet,id',
      maxResults: '50', // Get more videos to find the best performers
      type: 'video',
      channelId: channelId
    })

    // Use OAuth token if available, otherwise fall back to API key
    if (validAccessToken) {
      searchParams.append('access_token', validAccessToken || '')
      console.log('🔑 Using OAuth token for search')
    } else {
      searchParams.append('key', API_KEY || '')
      console.log('🔑 Using API key for search')
    }

    console.log('🔧 Final search URL params:', searchParams.toString())

    console.log('📡 Making YouTube API request...')
    const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`)
    console.log('📡 YouTube API response received')
    console.log('📡 YouTube API response status:', videosResponse.status)
    
    const videosData = await videosResponse.json()
    console.log('📡 YouTube API response parsed')
    console.log('📡 YouTube API response data:', JSON.stringify(videosData, null, 2))

    if (!videosResponse.ok) {
      console.log('❌ YouTube API request failed')
      return NextResponse.json(
        { error: videosData.error?.message || 'YouTube API error', details: videosData },
        { status: videosResponse.status }
      )
    }

    const videos = videosData.items || []

    console.log('✅ YouTube API request successful')
    console.log('📊 Returning response with', videos.length || 0, 'items')
    
    if (videos.length === 0) {
      console.log('❌ No videos found for this channel')
      return NextResponse.json({ error: 'No videos found for this channel' }, { status: 404 })
    }

    console.log(`📊 Found ${videos.length} videos, fetching detailed statistics...`)
    
    // Fetch video statistics and content details for all found videos
    let videosWithStats = videos
    
    if (videos.length > 0) {
      console.log('📊 Fetching video statistics and duration data...')
      try {
        const videoIds = videos.map((video: any) => video.id.videoId).join(',')
      
      const detailsParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        id: videoIds
      })

        // Use OAuth token if available, otherwise fall back to API key
        if (validAccessToken) {
          detailsParams.append('access_token', validAccessToken || '')
          console.log('🔑 Using OAuth token for video details')
      } else {
          detailsParams.append('key', API_KEY || '')
          console.log('🔑 Using API key for video details')
      }

        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams}`)
        console.log('📊 Video details API response status:', detailsResponse.status)
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json()
          console.log('📊 Video details fetched for', detailsData.items?.length || 0, 'videos')
          
          // Merge statistics and duration with video data
          videosWithStats = videos.map((video: any) => {
            const details = detailsData.items?.find((detail: any) => detail.id === video.id.videoId)
            return {
              ...video,
              statistics: details?.statistics || undefined,
              contentDetails: details?.contentDetails || undefined,
              duration: details?.contentDetails?.duration || undefined
            }
          })
          
          console.log('📊 Statistics and duration merged successfully')
        } else {
          console.log('⚠️ Failed to fetch video details, continuing without statistics')
        }
      } catch (detailsError) {
        console.error('⚠️ Error fetching video details:', detailsError)
        console.log('⚠️ Continuing without detailed statistics')
      }
    }

    console.log(`📊 Analyzing performance for ${videosWithStats.length} videos...`)

    // Step 2: Process and rank ALL videos to find top performers
    const processedVideos: ChannelVideo[] = videosWithStats.map((video: any) => {
      const views = parseInt(video.statistics?.viewCount || '0')
      const likes = parseInt(video.statistics?.likeCount || '0')
      const publishedAt = video.snippet?.publishedAt || ''
      
      // Calculate engagement score (likes/views ratio with view count weight)
      const engagementRate = views > 0 ? (likes / views) * 100 : 0
      const viewScore = Math.log10(views + 1) // Log scale for views
      const recencyScore = getRecencyScore(publishedAt)
      
      // Combined score (weighted: views 50%, engagement 30%, recency 20%)
      const score = (viewScore * 0.5) + (engagementRate * 100 * 0.3) + (recencyScore * 0.2)

      return {
        id: video.id?.videoId || video.id,
        title: video.snippet?.title || '',
        views,
        likes,
        publishedAt,
        thumbnail: video.snippet?.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/watch?v=${video.id?.videoId || video.id}`,
        score: Math.min(10, score) // Cap at 10
      }
    })

    // Step 3: Get TOP 10 performing videos and use ONLY these for analysis
    const topVideos = processedVideos
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    console.log('🏆 Top 10 performing videos identified:')
    topVideos.forEach((video, index) => {
      console.log(`${index + 1}. "${video.title}" - ${video.views.toLocaleString()} views (Score: ${video.score.toFixed(2)})`)
    })

    // Step 4: Generate title suggestions using AI (based on top 10 only)
    const titleSuggestions = await generateTitleSuggestions(topVideos, query)

    // Step 5: Extract insights (based on top 10 only)
    const insights = extractInsights(topVideos)

    // Get channel name from the first video's snippet
    const channelName = videos[0]?.snippet?.channelTitle || 'Unknown Channel'
    console.log('📺 Channel name determined:', channelName)

    const result: AnalysisResult = {
      channelName,
      totalVideos: videos.length,
      topVideos,
      suggestedTitles: titleSuggestions,
      insights
    }

    console.log('✅ Channel analysis completed successfully')

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('💥 Channel analysis error:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



function getRecencyScore(publishedAt: string): number {
  if (!publishedAt) return 0
  
  const published = new Date(publishedAt)
  const now = new Date()
  const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)
  
  // Higher score for more recent videos (up to 1 year)
  if (daysDiff <= 30) return 1.0 // Last month
  if (daysDiff <= 90) return 0.8 // Last 3 months
  if (daysDiff <= 180) return 0.6 // Last 6 months
  if (daysDiff <= 365) return 0.4 // Last year
  return 0.2 // Older than a year
}

async function generateTitleSuggestions(topVideos: ChannelVideo[], query: string): Promise<string[]> {
  try {
    console.log('🤖 Generating AI title suggestions based on top 10 performers...')

    const topTitles = topVideos.map(v => v.title) // Use all top 10 titles
    
    const prompt = `Based on these TOP 10 performing YouTube video titles from a channel (ranked by views, engagement, and performance):

${topTitles.map((title, i) => `${i + 1}. ${title} (${topVideos[i].views.toLocaleString()} views)`).join('\n')}

Analysis context: ${query || 'general content analysis'}

Generate 10 similar video titles that would likely perform well for this channel. The titles should:
- Follow the same style and tone as the high-performing examples above
- Use similar keywords and phrases that clearly work for this audience
- Maintain the same length and structure patterns
- Be engaging and clickable like the top performers
- Be relevant to the content theme: ${query || 'the channel\'s general theme'}
- Learn from what made these top 10 videos successful

Return only the 10 titles, one per line, without numbering or additional text.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8 // Higher creativity for title generation
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate title suggestions')
    }

    const data = await response.json()
    const suggestions = data.choices[0]?.message?.content
      ?.split('\n')
      .filter((title: string) => title.trim().length > 0)
      .map((title: string) => title.replace(/^\d+\.\s*/, '').trim()) // Remove any numbering
      .slice(0, 10) || []

    console.log(`✨ Generated ${suggestions.length} title suggestions based on top performers`)
    
    return suggestions.length > 0 ? suggestions : [
      'Amazing Content You Need to See!',
      'The Ultimate Guide to Success',
      'Mind-Blowing Results in 24 Hours',
      'This Changed Everything for Me',
      'Secret Tips That Actually Work'
    ]

  } catch (error) {
    console.error('❌ Error generating title suggestions:', error)
    return [
      'Amazing Content You Need to See!',
      'The Ultimate Guide to Success', 
      'Mind-Blowing Results in 24 Hours',
      'This Changed Everything for Me',
      'Secret Tips That Actually Work'
    ]
  }
}

function extractInsights(topVideos: ChannelVideo[]) {
  console.log('📈 Extracting insights from TOP 10 performing videos...')

  // Extract common keywords from top performer titles only
  const allTitles = topVideos.map(v => v.title.toLowerCase()).join(' ')
  const words = allTitles.match(/\b\w{4,}\b/g) || []
  const wordFreq: Record<string, number> = {}
  
  words.forEach(word => {
    if (!isStopWord(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  const commonKeywords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)

  // Calculate average views of TOP performers
  const totalViews = topVideos.reduce((sum, video) => sum + video.views, 0)
  const averageViews = Math.round(totalViews / topVideos.length)

  // Analyze title patterns of top performers
  const titlePatterns = analyzeTitlePatterns(topVideos.map(v => v.title))

  // Categorize content of top performers
  const categories = categorizeContent(topVideos.map(v => v.title))

  console.log(`📊 Top performers average: ${averageViews.toLocaleString()} views`)
  console.log(`🔤 Common keywords: ${commonKeywords.slice(0, 5).join(', ')}`)

  return {
    commonKeywords,
    averageViews,
    topPerformingCategories: categories,
    titlePatterns
  }
}

function isStopWord(word: string): boolean {
  const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'with', 'this', 'that', 'have', 'from', 'they', 'been', 'what', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'many', 'some', 'these', 'then', 'them', 'much', 'most', 'only', 'over', 'such', 'take', 'than', 'up', 'very', 'where', 'when', 'why', 'how', 'into', 'more', 'also', 'back', 'down', 'even', 'here', 'just', 'like', 'made', 'make', 'might', 'come', 'came', 'part', 'too', 'want', 'well', 'work']
  return stopWords.includes(word.toLowerCase())
}

function analyzeTitlePatterns(titles: string[]): string[] {
  const patterns: string[] = []

  // Check for common patterns
  const questionTitles = titles.filter(title => title.includes('?')).length
  const numberTitles = titles.filter(title => /\b\d+\b/.test(title)).length
  const howToTitles = titles.filter(title => title.toLowerCase().includes('how to')).length
  const ultimateTitles = titles.filter(title => title.toLowerCase().includes('ultimate')).length

  if (questionTitles > titles.length * 0.2) {
    patterns.push('Frequently uses question-based titles')
  }
  
  if (numberTitles > titles.length * 0.3) {
    patterns.push('Often includes numbers in titles')
  }
  
  if (howToTitles > titles.length * 0.15) {
    patterns.push('Educational "How To" content focus')
  }
  
  if (ultimateTitles > titles.length * 0.1) {
    patterns.push('Uses superlative language ("Ultimate", "Best", etc.)')
  }

  // Analyze length
  const avgLength = titles.reduce((sum, title) => sum + title.length, 0) / titles.length
  if (avgLength > 60) {
    patterns.push('Prefers longer, descriptive titles')
  } else if (avgLength < 40) {
    patterns.push('Uses short, punchy titles')
  }

  return patterns.length > 0 ? patterns : ['No clear patterns detected']
}

function categorizeContent(titles: string[]): string[] {
  const categories: Record<string, number> = {}

  const categoryKeywords = {
    'Tutorial/Education': ['how to', 'tutorial', 'guide', 'learn', 'tips', 'teach', 'explain'],
    'Entertainment': ['funny', 'comedy', 'react', 'reaction', 'entertainment', 'fun'],
    'Technology': ['tech', 'technology', 'software', 'app', 'digital', 'coding', 'ai'],
    'Lifestyle': ['lifestyle', 'daily', 'routine', 'life', 'personal', 'vlog'],
    'Review': ['review', 'unboxing', 'test', 'comparison', 'vs', 'best', 'worst'],
    'Gaming': ['game', 'gaming', 'play', 'gameplay', 'stream', 'walkthrough']
  }

  titles.forEach(title => {
    const lowerTitle = title.toLowerCase()
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        categories[category] = (categories[category] || 0) + 1
      }
    })
  })

  return Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category]) => category)
}