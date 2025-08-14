import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBZxCR32V4JAWYUF0dZmh1lNAPqlW1e-Ew'

interface SearchParams {
  searchQuery?: string
  channelUrl?: string
  maxResults?: number
  sortOrder?: string
  minDuration?: number
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

// Function to parse ISO 8601 duration and return seconds
function parseISO8601Duration(duration: string): number {
  console.log('⏱️ Parsing duration:', duration)
  
  if (!duration) return 0
  
  // Remove 'PT' prefix
  const time = duration.replace('PT', '')
  
  let totalSeconds = 0
  
  // Parse hours
  const hours = time.match(/(\d+)H/)
  if (hours) totalSeconds += parseInt(hours[1]) * 3600
  
  // Parse minutes
  const minutes = time.match(/(\d+)M/)
  if (minutes) totalSeconds += parseInt(minutes[1]) * 60
  
  // Parse seconds
  const seconds = time.match(/(\d+)S/)
  if (seconds) totalSeconds += parseInt(seconds[1])
  
  console.log('⏱️ Parsed duration:', totalSeconds, 'seconds')
  return totalSeconds
}

export async function POST(request: NextRequest) {
  console.log('🚀 YouTube search API endpoint hit')
  console.log('🌍 Environment:', process.env.NODE_ENV)
  console.log('🔑 API Key available:', !!API_KEY)
  console.log('🔑 Google Client ID available:', !!process.env.GOOGLE_CLIENT_ID)
  console.log('🔑 Google Client Secret available:', !!process.env.GOOGLE_CLIENT_SECRET)
  
  try {
    console.log('🔐 Attempting to get session from cookies...')
    const session = await getSessionFromCookies()
    console.log('🔐 Session retrieval completed')
    console.log('👤 Session:', session ? 'exists' : 'null')
    if (session) {
      console.log('👤 Session details:', {
        hasUser: !!session.user,
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        expiresAt: session.expiresAt
      })
    }
    
    console.log('📝 Parsing request body...')
    const { searchQuery, channelUrl, maxResults = 50, sortOrder = 'date', minDuration }: SearchParams = await request.json()
    console.log('📝 Request body parsed successfully')
    
    console.log('📋 Request params:', { searchQuery, channelUrl, maxResults, sortOrder, minDuration })
    
    if (!searchQuery && !channelUrl) {
      console.log('❌ Validation failed: no search query or channel URL')
      return NextResponse.json(
        { error: 'Please provide either a search query or a channel URL (or both).' },
        { status: 400 }
      )
    }

    let channelId: string | null = null
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
    
    // If channel URL is provided, resolve it to channel ID
    if (channelUrl) {
      console.log('🔗 Processing channel URL:', channelUrl)
      channelId = extractChannelId(channelUrl)
      console.log('🔗 Extracted channel ID:', channelId)
      
      if (!channelId) {
        console.log('❌ Could not extract channel ID')
        return NextResponse.json(
          { error: 'Could not extract channel ID from the provided URL. Please check the format.' },
          { status: 400 }
        )
      }
      
      // If it's not a direct channel ID, try to resolve it
      if (!channelId.match(/^UC[\w-]{22}$/)) {
        console.log('🔍 Need to resolve channel ID for:', channelId)
        const urlType = channelUrl.includes('@') ? 'handle' : 'username'
        console.log('🔍 URL type determined:', urlType)
        const resolvedId = await resolveChannelId(channelId, urlType, validAccessToken || undefined)
        
        if (!resolvedId) {
          console.log('❌ Could not resolve channel ID')
          return NextResponse.json(
            { error: 'Could not find channel. Please verify the URL is correct.' },
            { status: 404 }
          )
        }
        
        channelId = resolvedId
        console.log('✅ Channel ID resolved to:', channelId)
      }
    }

    console.log('🔧 Building search parameters...')
    // Build search parameters
    const searchParams = new URLSearchParams({
      part: 'snippet,id',
      order: sortOrder,
      maxResults: maxResults.toString(),
      type: 'video'
    })

    // Add search query if provided
    if (searchQuery) {
      searchParams.append('q', searchQuery)
      console.log('🔍 Added search query to params')
    }

    // Add channel ID if provided
    if (channelId) {
      console.log('🔗 Adding channelId to search:', channelId)
      searchParams.append('channelId', channelId)
    }

    // Use OAuth token if available, otherwise fall back to API key
    if (validAccessToken) {
      searchParams.append('access_token', validAccessToken)
      console.log('🔑 Using OAuth token for search')
    } else {
      searchParams.append('key', API_KEY)
      console.log('🔑 Using API key for search')
    }

    console.log('🔧 Final search URL params:', searchParams.toString())

    console.log('📡 Making YouTube API request...')
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`)
    console.log('📡 YouTube API response received')
    console.log('📡 YouTube API response status:', response.status)
    
    const data = await response.json()
    console.log('📡 YouTube API response parsed')
    console.log('📡 YouTube API response data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.log('❌ YouTube API request failed')
      return NextResponse.json(
        { error: data.error?.message || 'YouTube API error', details: data },
        { status: response.status }
      )
    }

    console.log('✅ YouTube API request successful')
    console.log('📊 Returning response with', data.items?.length || 0, 'items')
    
    // Fetch video statistics and content details for all found videos
    let videosWithStatsAndDuration = data.items || []
    let filteredCount = 0
    
    if (videosWithStatsAndDuration.length > 0) {
      console.log('📊 Fetching video statistics and duration data...')
      try {
        const videoIds = videosWithStatsAndDuration.map((video: any) => video.id.videoId).join(',')
        
        const detailsParams = new URLSearchParams({
          part: 'statistics,contentDetails',
          id: videoIds
        })

        // Use OAuth token if available, otherwise fall back to API key
        if (validAccessToken) {
          detailsParams.append('access_token', validAccessToken)
          console.log('🔑 Using OAuth token for video details')
        } else {
          detailsParams.append('key', API_KEY)
          console.log('🔑 Using API key for video details')
        }

        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams}`)
        console.log('📊 Video details API response status:', detailsResponse.status)
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json()
          console.log('📊 Video details fetched for', detailsData.items?.length || 0, 'videos')
          
          // Merge statistics and duration with video data, and filter out short videos
          const originalCount = videosWithStatsAndDuration.length
          videosWithStatsAndDuration = videosWithStatsAndDuration
            .map((video: any) => {
              const details = detailsData.items?.find((detail: any) => detail.id === video.id.videoId)
              return {
                ...video,
                statistics: details?.statistics || undefined,
                contentDetails: details?.contentDetails || undefined,
                duration: details?.contentDetails?.duration || undefined
              }
            })
            .filter((video: any) => {
              // Filter out videos shorter than the specified duration (default 0 for no filtering)
              const minimumDuration = minDuration ?? 0
              if (video.duration && minimumDuration > 0) {
                const durationInSeconds = parseISO8601Duration(video.duration)
                const isLongEnough = durationInSeconds >= minimumDuration
                if (!isLongEnough) {
                  console.log(`🚫 Filtering out short video: "${video.snippet.title}" (${durationInSeconds}s < ${minimumDuration}s)`)
                  filteredCount++
                }
                return isLongEnough
              }
              // If no duration info or no minimum duration specified, keep the video
              if (!video.duration && minimumDuration > 0) {
                console.log(`⚠️ No duration info for video: "${video.snippet.title}"`)
              }
              return true
            })
          
          console.log('📊 Statistics and duration merged successfully')
          console.log(`🚫 Filtered out ${filteredCount} short videos (< ${minDuration ?? 0}s)`)
          console.log(`✅ Returning ${videosWithStatsAndDuration.length} videos (from original ${originalCount})`)
        } else {
          console.log('⚠️ Failed to fetch video details, continuing without filtering')
        }
      } catch (detailsError) {
        console.error('⚠️ Error fetching video details:', detailsError)
        console.log('⚠️ Continuing without filtering')
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        items: videosWithStatsAndDuration
      },
      searchInfo: {
        query: searchQuery,
        channelId,
        maxResults,
        filteredShortVideos: filteredCount,
        minDuration: minDuration ?? 0
      },
      authenticated: !!validAccessToken
    })
    
  } catch (error) {
    console.error('💥 YouTube search error:', error)
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('📍 GET request to YouTube search API')
  return NextResponse.json({
    message: 'YouTube search API is working',
    method: 'GET',
    usage: 'Use POST method to search for videos'
  })
} 