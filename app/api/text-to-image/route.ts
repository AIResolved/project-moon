import { NextRequest, NextResponse } from 'next/server'

const PROVIDERS = {
  google: {
    name: 'Google GenAI',
    models: ['imagen-3.0-generate'],
    endpoint: '/api/text-to-image/providers/google'
  }
}

export async function GET() {
  return NextResponse.json({ providers: PROVIDERS, message: 'Available text-to-image providers and models' })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider = 'google', ...otherParams } = body

    if (!PROVIDERS[provider as keyof typeof PROVIDERS]) {
      return NextResponse.json({
        error: `Invalid provider. Available providers: ${Object.keys(PROVIDERS).join(', ')}`,
        providers: PROVIDERS
      }, { status: 400 })
    }

    const selectedProvider = PROVIDERS[provider as keyof typeof PROVIDERS]
    const providerUrl = `${request.nextUrl.origin}${selectedProvider.endpoint}`

    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(otherParams)
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Provider request failed')
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Text-to-image dispatcher error:', error)
    return NextResponse.json({ error: 'Failed to process text-to-image request' }, { status: 500 })
  }
}


