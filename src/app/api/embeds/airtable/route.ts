import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract base ID and table ID from Airtable URL
    const airtableMatch = url.match(/airtable\.com\/([^\/]+)\/([^\/]+)/)
    if (!airtableMatch) {
      return NextResponse.json({ error: 'Invalid Airtable URL' }, { status: 400 })
    }

    const [, baseId, tableId] = airtableMatch

    // For now, we'll return basic metadata
    // In a real implementation, you'd call Airtable's API to get base/table details
    const embedData = {
      title: 'Airtable Base',
      description: 'Interactive Airtable database',
      metadata: {
        baseId,
        tableId,
        type: 'airtable_base'
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Airtable embed error:', error)
    return NextResponse.json({ error: 'Failed to process Airtable embed' }, { status: 500 })
  }
}
