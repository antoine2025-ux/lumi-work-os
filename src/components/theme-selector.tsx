"use client"

import { useTheme } from "@/components/theme-provider"
import { ThemeColor, themeConfigs } from "@/types/theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose your preferred theme for the interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.values(themeConfigs).map((config) => (
            <div key={config.value} className="space-y-2">
              <Button
                variant="outline"
                className={cn(
                  "h-24 w-full p-0 relative overflow-hidden",
                  theme === config.value && "ring-2 ring-primary"
                )}
                onClick={() => setTheme(config.value)}
                style={{ backgroundColor: config.background }}
              >
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: config.primary }}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: config.primaryForeground }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: config.primary }}
                    />
                  </div>
                </div>
                {theme === config.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </Button>
              <div className="text-center">
                <h4 className="font-medium">{config.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {config.value === 'light' ? 'Clean and bright' : 'Easy on the eyes'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
