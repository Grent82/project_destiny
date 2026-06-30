# Portrait Generation Script

## Location
`scripts/generate-portraits.ts`

## Usage

```bash
# List all NPCs that need portraits (dry run)
npx tsx scripts/generate-portraits.ts --list

# Generate 5 portraits then pause for review
npx tsx scripts/generate-portraits.ts --batch=5

# Generate only a specific NPC
npx tsx scripts/generate-portraits.ts --npc=npc-verek-holst

# Generate all (NOT RECOMMENDED - use batch mode)
npx tsx scripts/generate-portraits.ts
```

## API Details

**Endpoint:** `https://image.pollinations.ai/prompt/{PROMPT}?width=512&height=512&nologo=true&model=flux&seed={SEED}`

**Rate Limit:** 9 seconds between requests. On 429: wait 30s and retry.

## Prompt Construction

Uses NPC definition data from `data/definitions/npcs.json`:
- `sex` → 'male'/'female'/'person'
- `status` → role (retainer, mercenary, noble, citizen, criminal, family)
- `appearanceTags` → appearance details

**Template:**
```
dark fantasy medieval {sex} {role} portrait, {appearance}, candlelight, oil painting style, dark background, detailed face, atmospheric
```

## Batch Processing

**CRITICAL:** Never generate all 49 NPCs at once!

- Use `--batch=5` to generate only 5 portraits then pause
- Manually review generated images
- Resume with next batch when satisfied

## Already Generated

4 portraits already exist:
- marion-vale.jpg
- ida-rhys.jpg
- player.jpg
- verek-sorn.jpg

## Next Steps

After generating portraits:
1. Update `CUSTOM_PORTRAITS` in `src/ui/components/portraitUtils.ts`
2. Update `CUSTOM_PORTRAITS` in `src/application/selectors/dialogue.ts`
3. Add new NPC IDs to the set
