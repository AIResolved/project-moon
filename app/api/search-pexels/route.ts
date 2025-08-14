import { NextRequest, NextResponse } from 'next/server';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

async function makeApiRequest(url: string, headers: HeadersInit) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Pexels API error:', response.status, errorData);
      throw new Error(`Pexels API request failed with status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error making Pexels API request:', error);
    throw error;
  }
}

function formatPexelsImages(data: any) {
  if (!data.photos || data.photos.length === 0) return [];
  return data.photos.map((photo: any) => ({
    id: photo.id,
    url: photo.src.original,
    thumbnail: photo.src.medium,
    source: 'pexels',
    photographer: photo.photographer,
    type: 'image',
  }));
}

function formatPexelsVideos(data: any) {
  if (!data.videos || data.videos.length === 0) return [];
  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

  return data.videos
    .map((video: any) => {
      const suitableFiles = video.video_files.filter((f: any) => f.size && f.size < MAX_SIZE_BYTES);
      const bestVideoFile = suitableFiles.sort((a: any, b: any) => b.width - a.width)[0];

      if (!bestVideoFile) return null;

      return {
        id: video.id,
        url: bestVideoFile.link,
        thumbnail: video.image,
        source: 'pexels',
        photographer: video.user.name,
        type: 'video',
      };
    })
    .filter(Boolean); // Remove null entries
}

export async function POST(request: NextRequest) {
  if (!PEXELS_API_KEY) {
    return NextResponse.json({ error: 'PEXELS_API_KEY environment variable is not set' }, { status: 500 });
  }

  try {
    const { query, type = 'image' } = await request.json(); // Default to image search
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    let url: string;
    if (type === 'video') {
      url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`;
    } else {
      url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`;
    }
    
    const headers = { Authorization: PEXELS_API_KEY };
    const data = await makeApiRequest(url, headers);

    const results = type === 'video' ? formatPexelsVideos(data) : formatPexelsImages(data);
    
    if (results.length === 0) {
      return NextResponse.json({ results: [], message: `No ${type}s found on Pexels.` });
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 