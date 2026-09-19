export type Category =
  | 'general'
  | 'tech'
  | 'society'
  | 'games'
  | 'movies'
  | 'interview'
  | 'wildcard';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Topic = {
  id: string;
  text: string;
  category: Category;
  difficulty: Difficulty;
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'tech', label: 'Tech' },
  { value: 'society', label: 'Society & Politics' },
  { value: 'games', label: 'Games' },
  { value: 'movies', label: 'Movies' },
  { value: 'interview', label: 'Interview Questions' },
  { value: 'wildcard', label: 'Wildcard' },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function categoryLabel(c: Category | 'surprise'): string {
  if (c === 'surprise') return 'Surprise me';
  return CATEGORIES.find((x) => x.value === c)!.label;
}

export function difficultyLabel(d: Difficulty): string {
  return DIFFICULTIES.find((x) => x.value === d)!.label;
}

// Seeded verbatim from the topic table in stand-up-design-brief.md.
// Ids are stable: History and the recent-topics list refer to them.
const T = (id: string, category: Category, difficulty: Difficulty, text: string): Topic => ({
  id,
  category,
  difficulty,
  text,
});

export const TOPICS: Topic[] = [
  T('gen-1', 'general', 'easy', "What's a small thing that instantly makes your day better?"),
  T('gen-2', 'general', 'easy', 'Pineapple on pizza: defend your position.'),
  T('gen-3', 'general', 'medium', 'Is it better to be early or exactly on time?'),
  T('gen-4', 'general', 'medium', "What's a skill everyone should learn before 25?"),
  T('gen-5', 'general', 'hard', 'What does "success" mean to you, and has that changed?'),
  T('tech-1', 'tech', 'easy', 'Tabs or spaces? Argue it like a courtroom lawyer.'),
  T('tech-2', 'tech', 'easy', `Explain "the cloud" to someone who's never used a computer.`),
  T('tech-3', 'tech', 'medium', 'Describe a bug that taught you something.'),
  T('tech-4', 'tech', 'medium', 'What piece of tech would you un-invent if you could?'),
  T('tech-5', 'tech', 'hard', 'Should AI be allowed to make hiring decisions?'),
  T('soc-1', 'society', 'easy', 'If you ran your city for one day, what would you change first?'),
  T('soc-2', 'society', 'medium', 'Should voting be mandatory?'),
  T('soc-3', 'society', 'medium', 'Should the voting age be lowered to 16?'),
  T('soc-4', 'society', 'medium', "What's one law you think is outdated?"),
  T('soc-5', 'society', 'hard', 'How should a country balance privacy and security?'),
  T('game-1', 'games', 'easy', 'Pitch a board game based on your daily commute.'),
  T('game-2', 'games', 'easy', 'Which game world would you want to live in, and why?'),
  T('game-3', 'games', 'medium', 'Are video games art?'),
  T('game-4', 'games', 'medium', 'Teach the rules of your favorite game in one minute.'),
  T('game-5', 'games', 'hard', 'Should competitive gaming be an Olympic sport?'),
  T('mov-1', 'movies', 'easy', 'Pitch a sequel nobody asked for.'),
  T('mov-2', 'movies', 'medium', 'Which movie villain actually had a point?'),
  T('mov-3', 'movies', 'medium', 'Is the book always better than the movie?'),
  T('mov-4', 'movies', 'medium', 'What movie would you show an alien to explain humans?'),
  T('mov-5', 'movies', 'hard', 'Recommend a movie without mentioning its plot.'),
  T('int-1', 'interview', 'easy', 'Tell me about yourself.'),
  T('int-2', 'interview', 'medium', 'Describe a time you disagreed with a teammate.'),
  T('int-3', 'interview', 'medium', "What's a weakness you're actively working on?"),
  T('int-4', 'interview', 'hard', 'Explain a technical concept to a non-technical manager.'),
  T('int-5', 'interview', 'hard', 'Why should we hire you over someone with more experience?'),
  T('wild-1', 'wildcard', 'easy', 'Give a toast at the wedding of two houseplants.'),
  T('wild-2', 'wildcard', 'easy', 'Convince me that Mondays are secretly the best day.'),
  T('wild-3', 'wildcard', 'medium', "You're a pigeon giving a TED talk. Go."),
  T('wild-4', 'wildcard', 'medium', "Sell me this pen, but it's the last pen on Earth."),
  T('wild-5', 'wildcard', 'medium', 'Explain where socks disappear to in the laundry, with evidence.'),
];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Handoff §5: filter by category and difficulty, exclude recently served
 * topics, pick at random. "Surprise me" picks a category first with equal
 * weight, then a topic within it, so the small categories still appear.
 *
 * The table is small and uneven (Wildcard has no Hard topic, Movies has one
 * Easy), so constraints relax in order rather than ever returning nothing:
 * first the recent-topics exclusion goes, then the difficulty.
 */
export function pickTopic(
  opts: {
    category: Category | 'surprise';
    difficulty: Difficulty;
    exclude?: readonly string[];
  },
  random: () => number = Math.random,
): Topic {
  const exclude = new Set(opts.exclude ?? []);
  const inCategory = (c: Category) => TOPICS.filter((t) => t.category === c);

  const attempts: ((t: Topic) => boolean)[] = [
    (t) => t.difficulty === opts.difficulty && !exclude.has(t.id),
    (t) => t.difficulty === opts.difficulty,
    (t) => !exclude.has(t.id),
    () => true,
  ];

  for (const keep of attempts) {
    if (opts.category === 'surprise') {
      const categories = CATEGORIES.map((c) => c.value).filter((c) => inCategory(c).some(keep));
      if (categories.length === 0) continue;
      const category = randomItem(categories, random);
      return randomItem(inCategory(category).filter(keep), random);
    }
    const pool = inCategory(opts.category).filter(keep);
    if (pool.length > 0) return randomItem(pool, random);
  }
  // Unreachable while the category has any topics at all.
  return TOPICS[0];
}

/** The same topic for everyone all day, changing at local midnight. */
export function topicOfTheDay(date = new Date()): Topic {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  // A fixed stride so consecutive days don't walk through one category.
  return TOPICS[(dayNumber * 17) % TOPICS.length];
}
