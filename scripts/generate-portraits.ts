/**
 * Portrait Generation Script
 *
 * Generates portraits for all NPCs using Pollinations.ai API.
 * Uses NPC definition data (sex, status, appearanceTags) to build prompts.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-portraits.ts
 *
 * Options:
 *   --batch=5    Generate only 5 NPCs then pause for review
 *   --npc=npc-id Generate only a specific NPC
 *   --list       List all NPCs that need portraits (dry run)
 */

import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


const API_BASE = 'https://image.pollinations.ai/prompt'
const WIDTH = 512
const HEIGHT = 512
const MODEL = 'flux'
const RATE_LIMIT_MS = 9000 // 9 seconds between requests
const RETRY_DELAY_MS = 30000 // 30 seconds on 429 error

// Load NPC definitions
const npcsPath = join(__dirname, '..', 'data', 'definitions', 'npcs.json')
const npcs: NPCDefinition[] = JSON.parse(fs.readFileSync(npcsPath, 'utf8'))

// Already generated portraits (from public/portraits/)
const portraitsDir = join(__dirname, '..', 'public', 'portraits')
const existingPortraits = new Set(
  fs.existsSync(portraitsDir)
    ? fs.readdirSync(portraitsDir).filter(f => f.endsWith('.jpg')).map(f => f.replace('.jpg', ''))
    : []
)

interface NPCDefinition {
  id: string
  name: string
  sex: 'man' | 'woman' | 'person'
  status: string
  ageBand: string
  appearanceTags?: string[]
  factionAffinityId?: string
}

// Parse CLI arguments
const args = process.argv.slice(2)
const batchLimit = args.find(a => a.startsWith('--batch='))?.split('=')[1] ? parseInt(args.find(a => a.startsWith('--batch='))!.split('=')[1]) : null
const specificNpcId = args.find(a => a.startsWith('--npc='))?.split('=')[1]
const listOnly = args.includes('--list')

function getPromptForNpc(npc: NPCDefinition): string {
  const sex = npc.sex === 'man' ? 'male' : npc.sex === 'woman' ? 'female' : 'person'

  // Map special status values to better portrait descriptions
  let role = npc.status || 'character'
  if (role === 'family') role = 'household member'
  if (role === 'retainer') role = 'trusted retainer'
  if (role === 'citizen') role = 'townsfolk'

  // Filter out hand-related and object-related appearance tags that confuse the AI
  let appearance = 'grounded urban fantasy character'
  if (npc.appearanceTags && npc.appearanceTags.length > 0) {
    const filteredTags = npc.appearanceTags.filter(tag =>
      !tag.toLowerCase().includes('hand') &&
      !tag.toLowerCase().includes('finger') &&
      !tag.toLowerCase().includes('palm') &&
      !tag.toLowerCase().includes('fist') &&
      !tag.toLowerCase().includes('book') &&
      !tag.toLowerCase().includes('folio') &&
      !tag.toLowerCase().includes('ledger') &&
      !tag.toLowerCase().includes('scroll') &&
      !tag.toLowerCase().includes('paper') &&
      !tag.toLowerCase().includes('within reach') &&
      !tag.toLowerCase().includes('never put down')
    )
    appearance = filteredTags.length > 0 ? filteredTags.join(', ') : 'grounded urban fantasy character'
  }

  return `dark fantasy medieval ${sex} ${role} headshot portrait, ${appearance}, candlelight, oil painting style, dark background, detailed face, atmospheric, single person, chest up, cropped at shoulders, hands not visible, no book, no objects in hands`
}

function urlEncode(text: string): string {
  return encodeURIComponent(text)
}

function buildApiUrl(prompt: string, seed: number): string {
  return `${API_BASE}/${urlEncode(prompt)}?width=${WIDTH}&height=${HEIGHT}&nologo=true&model=${MODEL}&seed=${seed}`
}

function generateSeed(npcId: string): number {
  // Simple hash function to generate consistent seed from NPC ID
  let hash = 0
  const cleanId = npcId.replace(/^npc-/, '')
  for (let i = 0; i < cleanId.length; i++) {
    const char = cleanId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Add random offset for regeneration
  const randomOffset = Math.floor(Math.random() * 100000)
  return Math.abs(hash + randomOffset)
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

async function generatePortrait(npc: NPCDefinition): Promise<boolean> {
  const portraitId = npc.id.replace(/^npc-/, '')
  const outputPath = join(portraitsDir, `${portraitId}.jpg`)

  // Skip if already exists
  if (existingPortraits.has(portraitId)) {
    console.log(`  ⏭️  Skip ${npc.name} - already exists`)
    return true
  }

  const prompt = getPromptForNpc(npc)
  const seed = generateSeed(npc.id)
  const url = buildApiUrl(prompt, seed)

  console.log(`\n📸 ${npc.name} (${portraitId})`)
  console.log(`  Prompt: ${prompt.substring(0, 80)}...`)
  console.log(`  Seed: ${seed}`)

  const success = await fetchImage(url, outputPath)

  if (success) {
    console.log(`  ✅ Saved to ${outputPath}`)
  }

  return success
}

async function main() {
  console.log('🎨 Portrait Generation Script')
  console.log('================================')

  // Ensure portraits directory exists
  if (!fs.existsSync(portraitsDir)) {
    fs.mkdirSync(portraitsDir, { recursive: true })
    console.log('Created portraits directory:', portraitsDir)
  }

  // Filter NPCs
  let targetNpcs = npcs
  if (specificNpcId) {
    targetNpcs = npcs.filter(n => n.id === specificNpcId)
    if (targetNpcs.length === 0) {
      console.error(`Error: NPC not found: ${specificNpcId}`)
      process.exit(1)
    }
  }

  // Filter out already generated
  targetNpcs = targetNpcs.filter(npc => !existingPortraits.has(npc.id.replace(/^npc-/, '')))

  console.log(`\n📊 Total NPCs: ${npcs.length}`)
  console.log(`📊 Already generated: ${existingPortraits.size}`)
  console.log(`📊 To generate: ${targetNpcs.length}`)

  if (listOnly) {
    console.log('\n📋 NPCs that need portraits:')
    targetNpcs.forEach(npc => {
      const prompt = getPromptForNpc(npc)
      console.log(`\n  ${npc.id}`)
      console.log(`    Sex: ${npc.sex}, Status: ${npc.status}`)
      console.log(`    Appearance: ${npc.appearanceTags?.join(', ') || 'default'}`)
      console.log(`    Prompt: ${prompt}`)
    })
    return
  }

  if (targetNpcs.length === 0) {
    console.log('\n✅ All portraits already generated!')
    return
  }

  console.log('\n================================')
  console.log('🚀 Starting generation...\n')

  let generated = 0
  let failed = 0

  for (let i = 0; i < targetNpcs.length; i++) {
    const npc = targetNpcs[i]

    // Batch limit
    if (batchLimit && generated >= batchLimit) {
      console.log(`\n🛑 Batch limit reached (${batchLimit} portraits).`)
      console.log('   Resume with: pnpm exec tsx scripts/generate-portraits.ts --npc=${targetNpcs[i + 1]?.id}')
      break
    }

    const success = await generatePortrait(npc)
    if (success) {
      generated++
    } else {
      failed++
    }

    // Rate limiting (skip wait after last NPC)
    if (i < targetNpcs.length - 1 && !batchLimit) {
      console.log(`\n⏳ Waiting ${RATE_LIMIT_MS / 1000}s before next request...`)
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
    }
  }

  console.log('\n================================')
  console.log('📊 Summary:')
  console.log(`   Generated: ${generated}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Skipped: ${existingPortraits.size}`)
  console.log('================================')

  if (failed > 0) {
    console.log('\n⚠️  Some portraits failed. Retry with:')
    const failedNpcs = targetNpcs.filter((_, idx) => idx < generated + failed && idx >= generated)
    failedNpcs.forEach(npc => {
      console.log(`   pnpm exec tsx scripts/generate-portraits.ts --npc=${npc.id}`)
    })
  }
}

main().catch(console.error)
