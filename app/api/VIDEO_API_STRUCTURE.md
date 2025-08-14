# Video Generation API Structure

## Overview
The video generation APIs have been restructured to support multiple providers and models in an organized, scalable way.

## Directory Structure

```
app/api/
├── image-to-video/
│   ├── route.ts                    # Main dispatcher
│   └── providers/
│       ├── replicate/
│       │   └── route.ts           # Replicate provider
│       └── fal/
│           └── route.ts           # FAL AI provider
└── text-to-video/
    ├── route.ts                    # Main dispatcher
    └── providers/
        ├── replicate/
        │   └── route.ts           # Replicate provider
        └── fal/
            └── route.ts           # FAL AI provider
```

## API Endpoints

### Image-to-Video

#### Main Dispatcher: `/api/image-to-video`
- **GET**: List available providers and models
- **POST**: Route requests to specific providers

**Request Body:**
```json
{
  "provider": "replicate" | "fal",
  "prompt": "string",
  "image": "base64_string" | "image_url",
  "duration": 5 | 10,
  "model": "string",
  // Provider-specific parameters...
}
```

#### Replicate Provider: `/api/image-to-video/providers/replicate`
**Models:** `bytedance/seedance-1-lite`

**Parameters:**
- `prompt` (required): Text description
- `image` (required): Base64 encoded image
- `duration`: 5 or 10 seconds
- `model`: Model identifier

#### FAL AI Provider: `/api/image-to-video/providers/fal`
**Models:** 
- `wan-v2.2-5b`: WAN v2.2-5B model
- `svd-xt`: Stable Video Diffusion XT
- `svd-1.1`: Stable Video Diffusion 1.1
- `haiper`: Haiper Video v2
- `luma-dream-machine`: Luma Dream Machine

**Parameters:**
- `prompt` (required): Text description
- `image_url` (required): Image URL
- `model`: Model identifier
- `duration`: Video duration
- `fps`: Frames per second
- `motion_strength`: Motion intensity (1-10)
- `seed`: Random seed

### Text-to-Video

#### Main Dispatcher: `/api/text-to-video`
- **GET**: List available providers and models
- **POST**: Route requests to specific providers

**Request Body:**
```json
{
  "provider": "replicate" | "fal",
  "prompt": "string",
  "duration": 5 | 10,
  "model": "string",
  // Provider-specific parameters...
}
```

#### Replicate Provider: `/api/text-to-video/providers/replicate`
**Models:** `bytedance/seedance-1-lite`

**Parameters:**
- `prompt` (required): Text description
- `duration`: 5 or 10 seconds
- `model`: Model identifier

#### FAL AI Provider: `/api/text-to-video/providers/fal`
**Models:**
- `luma-dream-machine`: Luma Dream Machine
- `minimax-video-01`: Minimax Video v1
- `runway-gen3`: Runway Gen-3 Turbo
- `kling-video`: Kling Video v1
- `haiper-v2`: Haiper Video v2

**Parameters:**
- `prompt` (required): Text description
- `model`: Model identifier
- `duration`: Video duration
- `aspect_ratio`: Video aspect ratio ("16:9", "9:16", "1:1")
- `fps`: Frames per second
- `seed`: Random seed
- `guidance_scale`: Generation guidance
- `num_inference_steps`: Inference steps

## Usage Examples

### Image-to-Video with Replicate
```javascript
const response = await fetch('/api/image-to-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'replicate',
    prompt: 'A dragon flying through clouds',
    image: 'data:image/jpeg;base64,/9j/4AAQ...',
    duration: 5
  })
})
```

### Image-to-Video with FAL AI
```javascript
const response = await fetch('/api/image-to-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'fal',
    model: 'wan-v2.2-5b',
    prompt: 'The warrior stands with determination',
    image_url: 'https://example.com/image.jpg',
    duration: 5,
    fps: 24
  })
})
```

### Text-to-Video with FAL AI
```javascript
const response = await fetch('/api/text-to-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'fal',
    model: 'luma-dream-machine',
    prompt: 'A serene forest with sunlight filtering through trees',
    aspect_ratio: '16:9'
  })
})
```

## Response Format

All endpoints return a consistent response format:

```json
{
  "success": true,
  "videoUrl": "https://...",
  "provider": "replicate|fal",
  "model": "model-name",
  "requestId": "optional-request-id",
  "message": "Generation completed successfully"
}
```

## Error Handling

Error responses include:
```json
{
  "error": "Error description",
  "provider": "provider-name",
  "details": "Detailed error message"
}
```

## Environment Variables Required

- `REPLICATE_API_TOKEN`: For Replicate provider
- `FAL_KEY`: For FAL AI provider

## Benefits of This Structure

1. **Scalability**: Easy to add new providers and models
2. **Maintainability**: Provider-specific logic is isolated
3. **Flexibility**: Supports different parameter sets per provider
4. **Consistency**: Unified interface across all providers
5. **Discovery**: GET endpoints list available providers/models