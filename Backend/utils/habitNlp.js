const CONFIRMATION_WORDS = ["yes", "yeah", "yep", "sure", "ok", "okay", "sounds good", "do it", "i can do it", "add it", "go ahead"];
const DELETE_WORDS = ["delete", "remove", "stop tracking", "drop", "discard"];
const EDIT_WORDS = ["edit", "update", "change", "tweak", "adjust"];

const HABIT_KEYWORDS = {
  Fitness: ["run", "walk", "gym", "exercise", "workout", "lift", "boxing", "yoga", "pilates"],
  Wellness: ["meditate", "mindful", "breathe", "breathing", "journaling", "journal", "gratitude", "therapy", "stress"],
  Productivity: ["study", "read", "learn", "practice", "write", "organize", "plan"],
  Nutrition: ["water", "hydrate", "meal", "cook", "vegetable", "protein", "diet"],
  Sleep: ["sleep", "bed", "rest", "wind down", "evening", "night"],
};

export function detectConfirmation(text) {
  return CONFIRMATION_WORDS.some((word) => text.includes(word));
}

export function detectDeleteIntent(text) {
  return DELETE_WORDS.some((word) => text.includes(word));
}

export function detectEditIntent(text) {
  return EDIT_WORDS.some((word) => text.includes(word));
}

export function detectHabitIdea(text) {
  return /\b(habit|start|begin|try|practice|learn|build)\b/.test(text) ||
    Object.values(HABIT_KEYWORDS).some((keywords) => keywords.some((keyword) => text.includes(keyword)));
}

export function buildHabitSuggestion(message) {
  const category = inferCategory(message);
  const title = buildTitle(message, category);
  const description = buildDescription(message, category);

  return {
    title,
    description,
    category,
    isDailyGoal: true,
  };
}

function inferCategory(message) {
  const lower = message.toLowerCase();
  for (const [category, keywords] of Object.entries(HABIT_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  if (lower.includes("sleep")) return "Sleep";
  return "General";
}

function buildTitle(message, category) {
  const lower = message.toLowerCase();
  if (lower.includes("boxing")) return "Beginner Boxing";
  if (lower.includes("run")) return "Easy Running";
  if (lower.includes("meditat")) return "Calm Meditation";
  if (lower.includes("journal")) return "Daily Journaling";
  if (lower.includes("water")) return "Hydration Habit";
  return `${category} Starter`;
}

function buildDescription(message, category) {
  const lower = message.toLowerCase();
  if (lower.includes("boxing")) return "Do 30 punches every morning.";
  if (lower.includes("run")) return "Jog for 10 minutes at a comfortable pace.";
  if (lower.includes("meditat")) return "Spend 5 minutes focusing on your breath.";
  if (lower.includes("journal")) return "Write three bullet points about your day.";
  if (lower.includes("water")) return "Drink a glass of water when you wake up and with each meal.";
  return `Start a small ${category.toLowerCase()} habit you can repeat daily.`;
}
