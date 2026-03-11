#!/usr/bin/env node
/**
 * Preload script to load env files before any other module.
 * Matches Next.js load order: .env, .env.local, .env.{NODE_ENV}, .env.{NODE_ENV}.local
 * Used by: tsx -r ./scripts/load-env.cjs scripts/start-collab-server.ts
 */
const path = require('path')
const { config } = require('dotenv')

const root = path.resolve(__dirname, '..')
const envs = [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
]
const nodeEnv = process.env.NODE_ENV || 'development'
envs.push(path.join(root, `.env.${nodeEnv}`))
envs.push(path.join(root, `.env.${nodeEnv}.local`))

for (const p of envs) {
  config({ path: p })
}
