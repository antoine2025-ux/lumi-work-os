"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CelebrationProps {
  isVisible: boolean
  onComplete?: () => void
}

export function Celebration({ isVisible, onComplete }: CelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showBalloons, setShowBalloons] = useState(false)

  useEffect(() => {
    if (isVisible) {
      // Start confetti immediately
      setShowConfetti(true)
      
      // Start balloons after a short delay
      setTimeout(() => setShowBalloons(true), 300)
      
      // Complete animation after duration
      setTimeout(() => {
        setShowConfetti(false)
        setShowBalloons(false)
        onComplete?.()
      }, 3000)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Confetti */}
          <AnimatePresence>
            {showConfetti && (
              <div className="absolute inset-0">
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][i % 6],
                      left: `${Math.random() * 100}%`,
                      top: '-10px',
                    }}
                    initial={{ 
                      y: -10, 
                      x: 0, 
                      rotate: 0,
                      scale: 0 
                    }}
                    animate={{ 
                      y: window.innerHeight + 100, 
                      x: (Math.random() - 0.5) * 200,
                      rotate: 360,
                      scale: [0, 1, 1, 0]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      delay: Math.random() * 0.5,
                      ease: "easeOut"
                    }}
                    exit={{ opacity: 0 }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Balloons */}
          <AnimatePresence>
            {showBalloons && (
              <div className="absolute inset-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${20 + i * 10}%`,
                      bottom: '-100px',
                    }}
                    initial={{ 
                      y: 0, 
                      x: 0, 
                      rotate: 0,
                      scale: 0 
                    }}
                    animate={{ 
                      y: -window.innerHeight - 200, 
                      x: (Math.random() - 0.5) * 100,
                      rotate: (Math.random() - 0.5) * 20,
                      scale: [0, 1, 1, 0]
                    }}
                    transition={{
                      duration: 4 + Math.random() * 2,
                      delay: Math.random() * 0.3,
                      ease: "easeOut"
                    }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Balloon */}
                    <div 
                      className="w-8 h-10 rounded-full relative"
                      style={{
                        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#a8e6cf', '#ffd3a5'][i % 8]
                      }}
                    >
                      {/* Balloon string */}
                      <div 
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-px h-16 bg-muted-foreground/30"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="bg-card rounded-lg shadow-2xl p-8 border-4 border-green-400 text-center max-w-sm mx-4">
              <motion.div
                className="text-6xl mb-4"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.6, 
                  repeat: Infinity, 
                  repeatDelay: 1 
                }}
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-bold text-green-400 mb-2">
                Project Complete!
              </h2>
              <p className="text-lg text-muted-foreground">
                Congratulations! All tasks are done!
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
