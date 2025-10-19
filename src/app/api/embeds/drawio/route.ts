import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract diagram ID from Draw.io URL
    const drawioMatch = url.match(/diagrams\.net\/([^\/]+)/)
    if (!drawioMatch) {
      return NextResponse.json({ error: 'Invalid Draw.io URL' }, { status: 400 })
    }

    const [, diagramId] = drawioMatch

    // For now, we'll return basic metadata
    // In a real implementation, you'd call Draw.io's API to get diagram details
    const embedData = {
      title: 'Draw.io Diagram',
      description: 'Interactive diagram or flowchart',
      metadata: {
        diagramId,
        type: 'drawio_diagram'
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Draw.io embed error:', error)
    return NextResponse.json({ error: 'Failed to process Draw.io embed' }, { status: 500 })
  }
}
