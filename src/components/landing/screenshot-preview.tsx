"use client"

import Image from "next/image"
import { useState } from "react"
import { ZoomIn, ZoomOut, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScreenshotPreviewProps {
  src: string
  alt: string
  title: string
  description?: string
  width?: number
  height?: number
  priority?: boolean
}

export function ScreenshotPreview({
  src,
  alt,
  title,
  description,
  width = 1200,
  height = 800,
  priority = false
}: ScreenshotPreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  return (
    <>
      <div className="group relative">
        <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl transition-all hover:shadow-blue-500/20 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10 pointer-events-none" />
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto"
            priority={priority}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            {description && (
              <p className="text-slate-300 text-sm">{description}</p>
            )}
          </div>
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 p-2 bg-slate-800/90 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-7xl max-h-[90vh] w-full">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}





