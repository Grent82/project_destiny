/**
 * District Image Generation Script
 *
 * Generates background images for all districts using Pollinations.ai API.
 * Uses district definition data (name, tags, dangerLevel, narrativeSummary) to build prompts.
 * Modeled directly on generate-portraits.ts's flow (destiny-k9xa/destiny-a2dm) -- same API, same
 * rate limiting, same retry behavior. Naming convention: docs/decisions/0003-district-image-naming.md
 * (filename = district id with the "district-" prefix stripped, e.g. district-harbor -> harbor.jpg,
 * mirroring how generate-portraits.ts strips "npc-").
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-district-images.ts
 *
 * Options:
 *   --batch=5           Generate only 5 districts then pause for review
 *   --district=district-id  Generate only a specific district
 *   --list              List all districts that need images (dry run)
 */

import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const API_BASE = 'https://image.pollinations.ai/prompt'
const WIDTH = 1024
const HEIGHT = 576
const MODEL = 'flux'
const RATE_LIMIT_MS = 9000 // 9 seconds between requests
const RETRY_DELAY_MS = 30000 // 30 seconds on 429 error

// Load district definitions
const districtsPath = join(__dirname, '..', 'data', 'definitions', 'districts.json')
const districts: DistrictDefinition[] = JSON.parse(fs.readFileSync(districtsPath, 'utf8'))

// Already generated images (from public/districts/)
const districtsDir = join(__dirname, '..', 'public', 'districts')
const existingImages = new Set(
  fs.existsSync(districtsDir)
    ? fs.readdirSync(districtsDir).filter(f => f.endsWith('.jpg')).map(f => f.replace('.jpg', ''))
    : []
)

interface DistrictDefinition {
  id: string
  name: string
  summary: string
  tags: string[]
  dangerLevel: number
  narrativeSummary: string
}

// Parse CLI arguments
const args = process.argv.slice(2)
const batchLimit = args.find(a => a.startsWith('--batch='))?.split('=')[1] ? parseInt(args.find(a => a.startsWith('--batch='))!.split('=')[1]) : null
const specificDistrictId = args.find(a => a.startsWith('--district='))?.split('=')[1]
const listOnly = args.includes('--list')

function filenameForDistrict(districtId: string): string {
  return districtId.replace(/^district-/, '')
}

function dangerDescriptor(dangerLevel: number): string {
  if (dangerLevel >= 5) return 'severe danger, ruined, threatening atmosphere'
  if (dangerLevel >= 4) return 'high danger, decayed, unsettling atmosphere'
  if (dangerLevel >= 3) return 'elevated tension, worn, uneasy atmosphere'
  if (dangerLevel >= 2) return 'moderate bustle, lived-in, watchful atmosphere'
  return 'calm, orderly atmosphere'
}

function getPromptForDistrict(district: DistrictDefinition): string {
  const tagText = district.tags.length > 0 ? district.tags.join(', ') : 'urban fantasy district'
  const danger = dangerDescriptor(district.dangerLevel)

  return `dark fantasy medieval city district establishing shot, ${district.name}, ${tagText}, ${danger}, oil painting style, atmospheric, painted illustration, no text, no people close-up, wide establishing view, muted color palette`
}

function urlEncode(text: string): string {
  return encodeURIComponent(text)
}

function buildApiUrl(prompt: string, seed: number): string {
  return `${API_BASE}/${urlEncode(prompt)}?width=${WIDTH}&height=${HEIGHT}&nologo=true&model=${MODEL}&seed=${seed}`
}

function generateSeed(districtId: string): number {
  // Simple hash function to generate consistent seed from district ID
  let hash = 0
  const cleanId = districtId.replace(/^district-/, '')
  for (let i = 0; i < cleanId.length; i++) {
    const char = cleanId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

async function fetchImage(url: string, outputPath: string): Promise<boolean> {
  let lastError: Error | null = null

  for (let retry = 0; retry < 3; retry++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000) // 90 second timeout
      })

      if (response.status === 429) {
        console.log(`  Rate limited (429). Waiting ${RETRY_DELAY_MS / 1000}s before retry...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      fs.writeFileSync(outputPath, Buffer.from(arrayBuffer))
      return true
    } catch (error) {
      lastError = error as Error
      console.log(`  Attempt ${retry + 1} failed: ${lastError.message}`)
      if (retry < 2) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  console.error(`  FAILED after 3 attempts: ${lastError?.message}`)
  return false
}

async function generateDistrictImage(district: DistrictDefinition): Promise<boolean> {
  const filename = filenameForDistrict(district.id)
  const outputPath = join(districtsDir, `${filename}.jpg`)

  if (existingImages.has(filename)) {
    console.log(`  ⏭️  Skip ${district.name} - already exists`)
    return true
  }

  const prompt = getPromptForDistrict(district)
  const seed = generateSeed(district.id)
  const url = buildApiUrl(prompt, seed)

  console.log(`\n🏞️  ${district.name} (${filename})`)
  console.log(`  Prompt: ${prompt.substring(0, 90)}...`)
  console.log(`  Seed: ${seed}`)

  const success = await fetchImage(url, outputPath)

  if (success) {
    console.log(`  ✅ Saved to ${outputPath}`)
  }

  return success
}

async function main() {
  console.log('🇺️  District Image Generation Script')
  console.log('================================')

  if (!fs.existsSync(districtsDir)) {
    fs.mkdirSync(districtsDir, { recursive: true })
    console.log('Created districts directory:', districtsDir)
  }

  let targetDistricts = districts
  if (specificDistrictId) {
    targetDistricts = districts.filter(d => d.id === specificDistrictId)
    if (targetDistricts.length === 0) {
      console.error(`Error: district not found: ${specificDistrictId}`)
      process.exit(1)
    }
  }

  targetDistricts = targetDistricts.filter(d => !existingImages.has(filenameForDistrict(d.id)))

  console.log(`\n📊 Total districts: ${districts.length}`)
  console.log(`📊 Already have images: ${existingImages.size}`)
  console.log(`📊 To generate: ${targetDistricts.length}`)

  if (listOnly) {
    console.log('\n📋 Districts that need images:')
    targetDistricts.forEach(district => {
      const filename = filenameForDistrict(district.id)
      const prompt = getPromptForDistrict(district)
      console.log(`\n  ${district.id}`)
      console.log(`    Filename: ${filename}.jpg, Danger: ${district.dangerLevel}`)
      console.log(`    Prompt: ${prompt}`)
    })
    return
  }

  if (targetDistricts.length === 0) {
    console.log('\n✅ All district images already generated!')
    return
  }

  console.log('\n================================')
  console.log('🚀 Starting generation...\n')

  let generated = 0
  let failed = 0

  for (let i = 0; i < targetDistricts.length; i++) {
    const district = targetDistricts[i]

    if (batchLimit && generated >= batchLimit) {
      console.log(`\n🛑 Batch limit reached (${batchLimit} images).`)
      console.log(`   Resume with: pnpm exec tsx scripts/generate-district-images.ts --district=${targetDistricts[i + 1]?.id}`)
      break
    }

    const success = await generateDistrictImage(district)
    if (success) {
      generated++
    } else {
      failed++
    }

    if (i < targetDistricts.length - 1 && !batchLimit) {
      console.log(`\n⏳ Waiting ${RATE_LIMIT_MS / 1000}s before next request...`)
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
    }
  }

  console.log('\n================================')
  console.log('📊 Summary:')
  console.log(`   Generated: ${generated}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Skipped: ${existingImages.size}`)
  console.log('================================')
}

main().catch(console.error)
