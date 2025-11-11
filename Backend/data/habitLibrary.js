export const habitLibraryBlueprint = [
  {
    id: "energize-morning-flow",
    name: "Morning Mobility Flow",
    description:
      "A 10-minute stretch routine that wakes up your muscles and primes your focus for the day ahead.",
    category: "Wellness",
    pillar: "Mind & Body",
    difficulty: "Beginner",
    timeframe: "Morning",
    duration: 10,
    frequency: "Daily",
    benefits: [
      "Improves flexibility",
      "Boosts energy",
      "Reduces morning stiffness",
    ],
    tags: ["stretch", "energy", "mobility"],
    metrics: {
      adoptionRate: 86,
      averageStreak: 9,
      completion: 78,
    },
    sampleSchedule: {
      days: "Weekdays",
      start: "07:05",
      end: "07:15",
    },
    insight:
      "Popular with early risers who want a gentle start before breakfast or coffee.",
  },
  {
    id: "focus-deep-work",
    name: "Deep Work Sprint",
    description:
      "Block 45 distraction-free minutes to tackle your highest priority task using Pomodoro intervals.",
    category: "Productivity",
    pillar: "Career",
    difficulty: "Intermediate",
    timeframe: "Morning",
    duration: 45,
    frequency: "4x week",
    benefits: [
      "Creates momentum on important projects",
      "Reduces context switching",
      "Supports measurable progress",
    ],
    tags: ["focus", "pomodoro", "work"],
    metrics: {
      adoptionRate: 74,
      averageStreak: 6,
      completion: 69,
    },
    sampleSchedule: {
      days: "Mon, Tue, Thu, Fri",
      start: "09:00",
      end: "09:45",
    },
    insight: "Pairs well with weekly planning sessions and lunchtime resets.",
  },
  {
    id: "hydrate-habit",
    name: "Hydrate & Reset",
    description:
      "Sip a glass of water every afternoon and take 2 mindful breaths before returning to work.",
    category: "Wellness",
    pillar: "Mind & Body",
    difficulty: "Beginner",
    timeframe: "Afternoon",
    duration: 3,
    frequency: "Daily",
    benefits: [
      "Combats afternoon slumps",
      "Supports hydration goals",
      "Encourages mindful breaks",
    ],
    tags: ["hydration", "mindfulness", "break"],
    metrics: {
      adoptionRate: 91,
      averageStreak: 11,
      completion: 83,
    },
    sampleSchedule: {
      days: "Daily",
      start: "14:30",
      end: "14:33",
    },
    insight: "Great bridge between deep work sessions and quick stand-up walks.",
  },
  {
    id: "reflection-evening-journal",
    name: "Evening Reflection",
    description:
      "Spend 5 minutes journaling wins, lessons, and tomorrow's first task before winding down.",
    category: "Mindfulness",
    pillar: "Mind & Body",
    difficulty: "Beginner",
    timeframe: "Evening",
    duration: 5,
    frequency: "Daily",
    benefits: [
      "Improves sleep quality",
      "Builds awareness of wins",
      "Reduces mental clutter",
    ],
    tags: ["journal", "gratitude", "evening"],
    metrics: {
      adoptionRate: 63,
      averageStreak: 8,
      completion: 71,
    },
    sampleSchedule: {
      days: "Daily",
      start: "21:45",
      end: "21:50",
    },
    insight:
      "Helps transition from screens to rest; consider pairing with the Nightly Wind-down habit.",
  },
  {
    id: "strength-mini-session",
    name: "Micro Strength Circuit",
    description:
      "Alternate push-ups, air squats, and planks for a compact strength boost at home.",
    category: "Fitness",
    pillar: "Health",
    difficulty: "Intermediate",
    timeframe: "Any",
    duration: 15,
    frequency: "3x week",
    benefits: [
      "Improves muscular endurance",
      "Fits between meetings",
      "Requires zero equipment",
    ],
    tags: ["fitness", "bodyweight", "strength"],
    metrics: {
      adoptionRate: 58,
      averageStreak: 5,
      completion: 64,
    },
    sampleSchedule: {
      days: "Mon, Wed, Sat",
      start: "12:15",
      end: "12:30",
    },
    insight: "Top choice for users balancing remote work with at-home movement goals.",
  },
  {
    id: "reading-focus",
    name: "Focused Reading Block",
    description:
      "Read 15 pages of a book that supports your growth. Capture one takeaway afterward.",
    category: "Learning",
    pillar: "Career",
    difficulty: "Beginner",
    timeframe: "Evening",
    duration: 20,
    frequency: "5x week",
    benefits: [
      "Builds consistent knowledge",
      "Strengthens focus",
      "Feeds creativity",
    ],
    tags: ["reading", "learning"],
    metrics: {
      adoptionRate: 67,
      averageStreak: 7,
      completion: 72,
    },
    sampleSchedule: {
      days: "Weeknights",
      start: "20:15",
      end: "20:35",
    },
    insight: "Add a quick highlight capture to power your knowledge base.",
  },
  {
    id: "nightly-winddown",
    name: "Nightly Wind-down",
    description:
      "Power down devices, dim the lights, and stretch gently to signal bedtime.",
    category: "Wellness",
    pillar: "Health",
    difficulty: "Beginner",
    timeframe: "Evening",
    duration: 15,
    frequency: "Daily",
    benefits: [
      "Improves sleep onset",
      "Reduces late-night screen time",
      "Supports recovery",
    ],
    tags: ["sleep", "routine", "recovery"],
    metrics: {
      adoptionRate: 79,
      averageStreak: 10,
      completion: 76,
    },
    sampleSchedule: {
      days: "Daily",
      start: "22:00",
      end: "22:15",
    },
    insight: "Commonly paired with the Evening Reflection habit for a calm close to the day.",
  },
  {
    id: "gratitude-buddy",
    name: "Gratitude Check-in",
    description:
      "Share one gratitude moment with a friend or journal to reinforce positive focus.",
    category: "Mindfulness",
    pillar: "Community",
    difficulty: "Beginner",
    timeframe: "Any",
    duration: 5,
    frequency: "3x week",
    benefits: [
      "Boosts optimism",
      "Strengthens relationships",
      "Anchors daily wins",
    ],
    tags: ["gratitude", "community"],
    metrics: {
      adoptionRate: 71,
      averageStreak: 6,
      completion: 69,
    },
    sampleSchedule: {
      days: "Mon, Wed, Fri",
      start: "19:30",
      end: "19:35",
    },
    insight: "Invite a friend for mutual accountability via the community feed.",
  },
  {
    id: "creative-refresh",
    name: "Creative Refresh",
    description:
      "Spend 20 minutes sketching, writing, or playing music to reset your brain after work.",
    category: "Creativity",
    pillar: "Mind & Body",
    difficulty: "Beginner",
    timeframe: "Evening",
    duration: 20,
    frequency: "3x week",
    benefits: [
      "Relieves stress",
      "Boosts creativity",
      "Supports playfulness",
    ],
    tags: ["creative", "play"],
    metrics: {
      adoptionRate: 54,
      averageStreak: 4,
      completion: 61,
    },
    sampleSchedule: {
      days: "Tue, Thu, Sun",
      start: "18:30",
      end: "18:50",
    },
    insight: "Pairs well with Digital Sunset for a balanced evening routine.",
  },
  {
    id: "digital-sunset",
    name: "Digital Sunset",
    description:
      "Disconnect from work apps and social media 60 minutes before bed to protect sleep.",
    category: "Wellness",
    pillar: "Health",
    difficulty: "Intermediate",
    timeframe: "Evening",
    duration: 60,
    frequency: "Daily",
    benefits: [
      "Improves sleep hygiene",
      "Reduces blue light exposure",
      "Creates intentional downtime",
    ],
    tags: ["sleep", "digital detox"],
    metrics: {
      adoptionRate: 48,
      averageStreak: 5,
      completion: 58,
    },
    sampleSchedule: {
      days: "Daily",
      start: "21:00",
      end: "22:00",
    },
    insight: "Users who adopt this habit report higher next-day focus scores.",
  },
  {
    id: "weekly-planning",
    name: "Weekly Planning Reset",
    description:
      "Review last week's wins, set top 3 goals, and slot critical tasks for the coming week.",
    category: "Productivity",
    pillar: "Career",
    difficulty: "Intermediate",
    timeframe: "Weekend",
    duration: 30,
    frequency: "Weekly",
    benefits: [
      "Clarifies priorities",
      "Reduces overwhelm",
      "Aligns schedules",
    ],
    tags: ["planning", "focus"],
    metrics: {
      adoptionRate: 82,
      averageStreak: 6,
      completion: 87,
    },
    sampleSchedule: {
      days: "Sunday",
      start: "17:00",
      end: "17:30",
    },
    insight: "Complements the Deep Work Sprint to stay proactive throughout the week.",
  },
  {
    id: "mindful-commute",
    name: "Mindful Commute",
    description:
      "Use commute time for guided breathing or a curated podcast instead of mindless scrolling.",
    category: "Mindfulness",
    pillar: "Community",
    difficulty: "Beginner",
    timeframe: "Morning",
    duration: 20,
    frequency: "Weekdays",
    benefits: [
      "Reduces stress before work",
      "Turns travel into learning",
      "Creates intentional transitions",
    ],
    tags: ["mindfulness", "commute"],
    metrics: {
      adoptionRate: 52,
      averageStreak: 4,
      completion: 57,
    },
    sampleSchedule: {
      days: "Weekdays",
      start: "08:10",
      end: "08:30",
    },
    insight: "Ideal for podcast lovers aiming to turn commute time into growth time.",
  },
];

export const libraryCategories = Array.from(
  new Set(habitLibraryBlueprint.map((habit) => habit.category))
).sort();
export const libraryDifficulties = Array.from(
  new Set(habitLibraryBlueprint.map((habit) => habit.difficulty))
).sort();
export const libraryTimeframes = Array.from(
  new Set(habitLibraryBlueprint.map((habit) => habit.timeframe))
).sort();
export const libraryPillars = Array.from(
  new Set(habitLibraryBlueprint.map((habit) => habit.pillar))
).sort();

export const libraryFacets = {
  categories: libraryCategories,
  difficulties: libraryDifficulties,
  timeframes: libraryTimeframes,
  pillars: libraryPillars,
};
