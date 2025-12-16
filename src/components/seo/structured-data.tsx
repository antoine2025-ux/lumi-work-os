export function StructuredData() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://loopwell.io'
  
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Loopwell',
    url: siteUrl,
    logo: `${siteUrl}/loopwell-logo.png`,
    description: 'Loopwell connects projects, documentation, org structure, and contextual AI into one system that behaves like a proactive team member.',
    sameAs: [
      // Add your social media profiles here when available
      // 'https://twitter.com/loopwell',
      // 'https://linkedin.com/company/loopwell',
    ],
  }

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Loopwell',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Organizational Intelligence for Growing Teams',
    url: siteUrl,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
    </>
  )
}

