interface JobEntry {
  id: string
  name: string
  districtHint: string
  primarySkill: string
}

export const JOB_CATALOG: JobEntry[] = [
  { id: 'job-stevedore',  name: 'Dock Work',          districtHint: 'Harbor Ward',    primarySkill: 'survival' },
  { id: 'job-clerk',      name: 'Clerk Work',          districtHint: 'Civic Quarter',  primarySkill: 'administration' },
  { id: 'job-medic',      name: 'Field Medicine',      districtHint: 'The Pale',       primarySkill: 'medicine' },
  { id: 'job-engineer',   name: 'Workshop Labor',      districtHint: 'Ironworks',      primarySkill: 'engineering' },
  { id: 'job-broker',     name: 'Trade Brokering',     districtHint: 'Harbor Ward',    primarySkill: 'negotiation' },
  { id: 'job-enforcer',   name: 'Ward Enforcement',    districtHint: 'Gilded Heights', primarySkill: 'security' },
  { id: 'job-crafter',    name: 'Craft Work',          districtHint: 'Ironworks',      primarySkill: 'crafting' },
  { id: 'job-performer',  name: 'Street Performance',  districtHint: 'The Warrens',    primarySkill: 'performance' },
  { id: 'job-scholar',    name: 'Research Work',       districtHint: 'Gilded Heights', primarySkill: 'academics' },
  { id: 'job-operative',  name: 'Shadow Work',         districtHint: 'The Hollows',    primarySkill: 'intrigue' },
  { id: 'job-laborer',    name: 'General Labor',       districtHint: 'The Warrens',    primarySkill: 'melee' },
]

export function getJobForNpc(skills: Record<string, number>): JobEntry {
  const nonCombatSkills = ['administration', 'medicine', 'engineering', 'negotiation',
                           'security', 'crafting', 'performance', 'academics', 'intrigue', 'survival']
  let best = { skill: 'survival', value: 0 }
  for (const sk of nonCombatSkills) {
    if ((skills[sk] ?? 0) > best.value) best = { skill: sk, value: skills[sk] ?? 0 }
  }
  return JOB_CATALOG.find((j) => j.primarySkill === best.skill) ?? JOB_CATALOG[0]
}
