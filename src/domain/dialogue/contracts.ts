import { z } from 'zod'

export const dialogueConditionSchema = z
  .object({
    type: z.enum(['dayMin', 'dayMax', 'debtPaid', 'minRenown', 'minNpcTrust', 'minNpcLoyalty']),
    value: z.union([z.number(), z.boolean()]),
    npcId: z.string().optional(),
  })
  .strict()

export const dialogueOutcomeSchema = z
  .object({
    type: z.enum(['loyalty', 'trust', 'respect', 'mainQuestHint', 'standing', 'questUnlock', 'item', 'factionStanding', 'activityLog']),
    value: z.union([z.number(), z.string()]),
    targetId: z.string().optional(),
  })
  .strict()

export const dialogueChoiceSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    nextNodeId: z.string().nullable(),
    outcome: dialogueOutcomeSchema.optional(),
    condition: dialogueConditionSchema.optional(),
  })
  .strict()

export const dialogueNodeSchema = z
  .object({
    id: z.string().min(1),
    npcId: z.string().min(1),
    text: z.string().min(1),
    choices: z.array(dialogueChoiceSchema),
  })
  .strict()

export const dialogueTreeSchema = z
  .object({
    id: z.string().min(1),
    npcId: z.string().min(1),
    openingNodeId: z.string().min(1),
    nodes: z.array(dialogueNodeSchema),
  })
  .strict()

export type DialogueCondition = z.infer<typeof dialogueConditionSchema>
export type DialogueOutcome = z.infer<typeof dialogueOutcomeSchema>
export type DialogueChoice = z.infer<typeof dialogueChoiceSchema>
export type DialogueNode = z.infer<typeof dialogueNodeSchema>
export type DialogueTree = z.infer<typeof dialogueTreeSchema>
