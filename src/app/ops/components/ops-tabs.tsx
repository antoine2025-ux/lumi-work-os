'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type TabType = 'overview' | 'performance' | 'errors' | 'scale' | 'ai-cost'

interface OpsTabsProps {
  children: React.ReactNode
  defaultTab?: TabType
}

export function OpsTabs({ children, defaultTab = 'overview' }: OpsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get current tab from URL or use default
  const currentTab = (searchParams.get('tab') as TabType) || defaultTab

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    // Set default range based on tab
    if (!params.get('range')) {
      if (value === 'overview') {
        params.set('range', '24h')
      } else {
        params.set('range', '1h')
      }
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="errors">Errors</TabsTrigger>
        <TabsTrigger value="scale">Scale</TabsTrigger>
        <TabsTrigger value="ai-cost">AI & Cost</TabsTrigger>
      </TabsList>
      
      {children}
    </Tabs>
  )
}

