import { z } from 'zod'

export const titleDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredSkill: z.string(),
  requiredSkillThreshold: z.number(),
  dailyEffect: z.string(),
})

export type TitleDefinition = z.infer<typeof titleDefinitionSchema>
