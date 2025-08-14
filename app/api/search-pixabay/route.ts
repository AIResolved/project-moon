import { NextRequest, NextResponse } from 'next/server';

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

async function makeApiRequest(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Pixabay API error:', response.status, errorData);
      throw new Error(`Pixabay API request failed with status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error making Pixabay API request:', error);
    throw error;
  }
}

function formatPixabayImages(data: any) {
  if (!data.hits || data.hits.length === 0) return [];
  return data.hits.map((image: any) => ({
    id: image.id,
    url: image.largeImageURL,
    thumbnail: image.previewURL,
    source: 'pixabay',
    photographer: image.user,
    type: 'image',
  }));
}

function formatPixabayVideos(data: any) {
  if (!data.hits || data.hits.length === 0) return [];
  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

  return data.hits
    .map((video: any) => {
      const videoOptions = ['large', 'medium', 'small', 'tiny'];
      let bestVideoFile = null;

      for (const quality of videoOptions) {
        const file = video.videos[quality];
        if (file && file.size < MAX_SIZE_BYTES) {
          bestVideoFile = file;
          break; // Found a suitable file, starting from largest
        }
      }

      if (!bestVideoFile) return null;

      return {
        id: video.id,
        url: bestVideoFile.url,
        thumbnail: `https://i.vimeocdn.com/video/${video.picture_id}_295x166.jpg`,
        source: 'pixabay',
        photographer: video.user,
        type: 'video',
      };
    })
    .filter(Boolean); // Remove null entries
}

export async function POST(request: NextRequest) {
  if (!PIXABAY_API_KEY) {
    return NextResponse.json({ error: 'PIXABAY_API_KEY environment variable is not set' }, { status: 500 });
  }

  try {
    const { query, type = 'image' } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    let url: string;
    if (type === 'video') {
      url = `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=9&orientation=horizontal`;
    } else {
      url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=9&orientation=horizontal`;
    }
    
    const data = await makeApiRequest(url);

    const results = type === 'video' ? formatPixabayVideos(data) : formatPixabayImages(data);

    if (results.length === 0) {
      return NextResponse.json({ results: [], message: `No ${type}s found on Pixabay.` });
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 