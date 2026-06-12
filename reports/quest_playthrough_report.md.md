Playthrough Report: "Three Days on Assessor Vorn" (quest-compact-watch)

  Quest Definition

  - Title: Three Days on Assessor Vorn
  - Reward: 180 Marks
  - Time Limit: 3 days
  - Execution Duration: 3 days of fieldwork
  - Discovery Source: Bar in The Pale
  - Objective Type: Investigation

  Available Investigation Approaches

  1. Bribe & Network
    - Skills: Negotiation, Intrigue
    - Exposure: Low
    - Difficulty Modifier: 0
    - Bonus Type: Extra marks (1.25x on success)
    - Clue Text: "A paid informant tips a name..."
  2. Covert Surveillance
    - Skills: Security, Intrigue
    - Exposure: Medium
    - Difficulty Modifier: +15 (easier rolls)
    - Bonus Type: None (full marks on success)
    - Clue Text: "Two days of shadowing reveals a pattern..."
  3. Paper Trail
    - Skills: Administration, Academics
    - Exposure: None
    - Difficulty Modifier: -10 (harder rolls)
    - Bonus Type: Reduce penalty on failure
    - Clue Text: "A forged entry in the guild manifests..."

  Playthrough Results

  I attempted to complete the quest using the Covert Surveillance approach across all three required days:

  Day 1 (Morning → Afternoon):
  - Selected Marion Vale (security: 25, intrigue: 41)
  - Investigation ran successfully
  - Time slot advanced
  - Journal showed: "Surveillance day 1 of 3 logged"

  Day 2 (Afternoon → Evening):
  - Selected Marion Vale again
  - Investigation ran successfully
  - Time slot advanced
  - Journal entries duplicated but no "day 2 of 3" confirmation

  Day 3 (Evening → Night):
  - Selected Marion Vale again
  - Investigation ran successfully
  - Time slot advanced
  - Quest did NOT complete

  Bug Identified

  The quest progress tracking is broken. After three investigation runs:
  - The objective still showed "1 of 3 days logged"
  - The quest did not complete
  - The completedSteps counter did not increment
  - Journal entries were duplicated instead of showing progression

  Root Cause: The resolveInvestigation command is not properly updating the quest's progress.completedSteps field for multi-day investigation quests like
  "Three Days on Assessor Vorn". The quest requires completedSteps: 4 out of requiredSteps: 5 to complete, but the step counter never advances beyond the
  initial "investigating" stage.

  Expected Behavior: Each investigation run should increment completedSteps by 1, and on the third day (when completedSteps reaches 4), the quest should
  resolve and award the 180 Marks reward.

  Recommendations

  1. Fix the resolveInvestigation command to increment progress.completedSteps for investigation quests with executionDurationDays > 1
  2. Add journal entry tracking per day (e.g., "Surveillance day 2 of 3 logged", "Surveillance day 3 of 3 logged")
  3. Add mid-quest beats at "investigating" and "on-site" stages as defined in the quest's midQuestBeats array
  4. Test the fix with multiple approach combinations to ensure all paths work correctly
