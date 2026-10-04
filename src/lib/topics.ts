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

// The first five per category were seeded from stand-up-design-brief.md; the rest
// were added for the card collection, to 10 easy, 12 medium and 8 hard each.
// Ids are stable: History, the collection and the recent-topics list refer to them.
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
  // general: added October 2026 for the collection.
  T('gen-6', 'general', 'easy', "What's the best piece of advice you've ever been given?"),
  T('gen-7', 'general', 'easy', "Describe your perfect lazy Sunday."),
  T('gen-8', 'general', 'easy', "What's a food you used to hate but now love?"),
  T('gen-9', 'general', 'easy', "Which season is the best, and why?"),
  T('gen-10', 'general', 'easy', "Tell me about a place that feels like home."),
  T('gen-11', 'general', 'easy', "What's a hobby you'd pick up if you had more time?"),
  T('gen-12', 'general', 'easy', "Describe the best meal you've ever had."),
  T('gen-13', 'general', 'easy', "What's something you're looking forward to this year?"),
  T('gen-14', 'general', 'medium', "Is it better to be a specialist or a generalist?"),
  T('gen-15', 'general', 'medium', "Should everyone take a gap year?"),
  T('gen-16', 'general', 'medium', "Is it ever okay to tell a white lie?"),
  T('gen-17', 'general', 'medium', "What's one habit that changed your life?"),
  T('gen-18', 'general', 'medium', "City life or country life: make the case."),
  T('gen-19', 'general', 'medium', "Should homework be banned?"),
  T('gen-20', 'general', 'medium', "Is it more important to be liked or respected?"),
  T('gen-21', 'general', 'medium', "What's a mistake that taught you more than a success?"),
  T('gen-22', 'general', 'medium', "Are first impressions usually right?"),
  T('gen-23', 'general', 'medium', "What would you change about how schools teach?"),
  T('gen-24', 'general', 'hard', "Is it possible to be truly unbiased?"),
  T('gen-25', 'general', 'hard', "What do we owe the people who come after us?"),
  T('gen-26', 'general', 'hard', "Should you follow your passion or your talent?"),
  T('gen-27', 'general', 'hard', "Is ambition a virtue or a vice?"),
  T('gen-28', 'general', 'hard', "When is it right to quit something you've committed to?"),
  T('gen-29', 'general', 'hard', "What makes a life well lived?"),
  T('gen-30', 'general', 'hard', "Can you change someone's mind with facts alone?"),
  // tech: added October 2026 for the collection.
  T('tech-6', 'tech', 'easy', "What app could you not live without, and why?"),
  T('tech-7', 'tech', 'easy', "Explain how the internet works to a ten-year-old."),
  T('tech-8', 'tech', 'easy', "What's the most useful gadget you own?"),
  T('tech-9', 'tech', 'easy', "Describe your ideal smart home."),
  T('tech-10', 'tech', 'easy', "Should phones be allowed at the dinner table?"),
  T('tech-11', 'tech', 'easy', "What's a piece of technology you were wrong about?"),
  T('tech-12', 'tech', 'easy', "Explain what a password manager is and why it matters."),
  T('tech-13', 'tech', 'easy', "If you could invent one app, what would it do?"),
  T('tech-14', 'tech', 'medium', "Is social media doing more harm than good?"),
  T('tech-15', 'tech', 'medium', "Should kids learn to code in primary school?"),
  T('tech-16', 'tech', 'medium', "Are remote meetings better or worse than meeting in person?"),
  T('tech-17', 'tech', 'medium', "Explain open source to someone in marketing."),
  T('tech-18', 'tech', 'medium', "Would you ride in a self-driving car today? Why or why not?"),
  T('tech-19', 'tech', 'medium', "What's a tech trend you think is overhyped?"),
  T('tech-20', 'tech', 'medium', "Should companies be allowed to sell your data if they tell you first?"),
  T('tech-21', 'tech', 'medium', "Is it worth paying for software you could get for free?"),
  T('tech-22', 'tech', 'medium', "Describe the best experience you've had using an app or website."),
  T('tech-23', 'tech', 'medium', "Should there be a right to be offline after work?"),
  T('tech-24', 'tech', 'hard', "Who should be responsible when an AI makes a harmful mistake?"),
  T('tech-25', 'tech', 'hard', "Should algorithms decide what news you see?"),
  T('tech-26', 'tech', 'hard', "Is privacy online a lost cause?"),
  T('tech-27', 'tech', 'hard', "Describe a trade-off you'd make between speed and quality, and defend it."),
  T('tech-28', 'tech', 'hard', "Should big tech companies be broken up?"),
  T('tech-29', 'tech', 'hard', "Will AI make creative work more or less valuable?"),
  T('tech-30', 'tech', 'hard', "How would you explain technical debt to a CEO?"),
  // society: added October 2026 for the collection.
  T('soc-6', 'society', 'easy', "What's one small thing that would make your neighborhood better?"),
  T('soc-7', 'society', 'easy', "Should public transport be free?"),
  T('soc-8', 'society', 'easy', "What tradition from your culture would you share with the world?"),
  T('soc-9', 'society', 'easy', "If you started a charity, what would it do?"),
  T('soc-10', 'society', 'easy', "Should every city have more parks?"),
  T('soc-11', 'society', 'easy', "What's a public holiday you'd add to the calendar?"),
  T('soc-12', 'society', 'easy', "Describe a local hero people should know about."),
  T('soc-13', 'society', 'easy', "Should everyone learn a second language?"),
  T('soc-14', 'society', 'easy', "What makes a good neighbor?"),
  T('soc-15', 'society', 'medium', "Should there be a four-day work week?"),
  T('soc-16', 'society', 'medium', "Is a university degree still worth it?"),
  T('soc-17', 'society', 'medium', "Should tipping be replaced with higher wages?"),
  T('soc-18', 'society', 'medium', "Should single-use plastic be banned everywhere?"),
  T('soc-19', 'society', 'medium', "Is it fair to judge historical figures by today's standards?"),
  T('soc-20', 'society', 'medium', "Should sugary drinks be taxed?"),
  T('soc-21', 'society', 'medium', "Should young adults have to do a year of national service?"),
  T('soc-22', 'society', 'medium', "Do celebrities have a duty to speak out on issues?"),
  T('soc-23', 'society', 'medium', "Should cities ban cars from their centers?"),
  T('soc-24', 'society', 'hard', "Should there be a limit on how much wealth one person can hold?"),
  T('soc-25', 'society', 'hard', "Is free speech ever worth limiting?"),
  T('soc-26', 'society', 'hard', "How should a society divide its spending between the young and the old?"),
  T('soc-27', 'society', 'hard', "Should rich countries take in more refugees?"),
  T('soc-28', 'society', 'hard', "Is it ever right to break the law?"),
  T('soc-29', 'society', 'hard', "Should a basic income replace unemployment benefits?"),
  T('soc-30', 'society', 'hard', "Who should decide what's taught in schools?"),
  // games: added October 2026 for the collection.
  T('game-6', 'games', 'easy', "What was the first video game you ever loved?"),
  T('game-7', 'games', 'easy', "Pitch a new piece for chess."),
  T('game-8', 'games', 'easy', "Which board game ruins friendships fastest, and why?"),
  T('game-9', 'games', 'easy', "Describe your dream video game in one minute."),
  T('game-10', 'games', 'easy', "What's the best game to play with family?"),
  T('game-11', 'games', 'easy', "Which game character would you want as a best friend?"),
  T('game-12', 'games', 'easy', "Invent a new rule for your favorite sport."),
  T('game-13', 'games', 'easy', "Cards, dice, or controllers: which is best?"),
  T('game-14', 'games', 'medium', "Are loot boxes a form of gambling?"),
  T('game-15', 'games', 'medium', "Do video games make people better problem-solvers?"),
  T('game-16', 'games', 'medium', "Single-player or multiplayer: which makes better games?"),
  T('game-17', 'games', 'medium', "Should games have difficulty settings, or one true challenge?"),
  T('game-18', 'games', 'medium', "Explain why a game you love is worth the hours."),
  T('game-19', 'games', 'medium', "Is a game's story or its gameplay more important?"),
  T('game-20', 'games', 'medium', "Should schools use games to teach?"),
  T('game-21', 'games', 'medium', "What makes a game worth replaying?"),
  T('game-22', 'games', 'medium', "Are mobile games real games?"),
  T('game-23', 'games', 'medium', "Defend a game everyone else thinks is bad."),
  T('game-24', 'games', 'hard', "Should game studios be held to strict rules on crunch time?"),
  T('game-25', 'games', 'hard', "Is it fair to charge full price and then sell extra content too?"),
  T('game-26', 'games', 'hard', "Can a game be a serious work of art about grief or war?"),
  T('game-27', 'games', 'hard', "Should violent video games have the same age rules as films?"),
  T('game-28', 'games', 'hard', "Design a game that teaches empathy. How does it work?"),
  T('game-29', 'games', 'hard', "Is speedrunning a sport?"),
  T('game-30', 'games', 'hard', "What responsibility do game designers have for addictive design?"),
  // movies: added October 2026 for the collection.
  T('mov-6', 'movies', 'easy', "What's a movie you could watch over and over?"),
  T('mov-7', 'movies', 'easy', "Recast a classic movie with your friends."),
  T('mov-8', 'movies', 'easy', "What's the best movie snack, and why?"),
  T('mov-9', 'movies', 'easy', "Which movie world would you want to live in?"),
  T('mov-10', 'movies', 'easy', "Describe a movie that made you cry."),
  T('mov-11', 'movies', 'easy', "Pitch a movie about your own life."),
  T('mov-12', 'movies', 'easy', "What's the most underrated movie you know?"),
  T('mov-13', 'movies', 'easy', "Which movie soundtrack is the best?"),
  T('mov-14', 'movies', 'easy', "Cinema or couch: where should movies be watched?"),
  T('mov-15', 'movies', 'medium', "Should old movies be remade?"),
  T('mov-16', 'movies', 'medium', "Are superhero movies good for cinema?"),
  T('mov-17', 'movies', 'medium', "What makes a great movie villain?"),
  T('mov-18', 'movies', 'medium', "Should streaming-only movies be eligible for the big awards?"),
  T('mov-19', 'movies', 'medium', "Is a twist ending a cheap trick or a great reward?"),
  T('mov-20', 'movies', 'medium', "Pick a movie everyone loves and argue it's overrated."),
  T('mov-21', 'movies', 'medium', "Are trailers giving away too much?"),
  T('mov-22', 'movies', 'medium', "Should movies be shorter?"),
  T('mov-23', 'movies', 'medium', "What's a movie that changed how you think?"),
  T('mov-24', 'movies', 'hard', "Can you separate an artist's work from their behavior?"),
  T('mov-25', 'movies', 'hard', "Do movies shape culture, or just reflect it?"),
  T('mov-26', 'movies', 'hard', "Is it okay for actors to play people very different from themselves?"),
  T('mov-27', 'movies', 'hard', "Explain why a black-and-white film still matters today."),
  T('mov-28', 'movies', 'hard', "Should AI be allowed to recreate actors who have died?"),
  T('mov-29', 'movies', 'hard', "Make the case for a movie you didn't enjoy."),
  T('mov-30', 'movies', 'hard', "What is a critic for when anyone can review anything?"),
  // interview: added October 2026 for the collection.
  T('int-6', 'interview', 'easy', "Why do you want this job?"),
  T('int-7', 'interview', 'easy', "What are you most proud of?"),
  T('int-8', 'interview', 'easy', "Describe your ideal workday."),
  T('int-9', 'interview', 'easy', "What do you do outside of work?"),
  T('int-10', 'interview', 'easy', "How would your friends describe you?"),
  T('int-11', 'interview', 'easy', "What's a skill you've learned recently?"),
  T('int-12', 'interview', 'easy', "Where do you see yourself in five years?"),
  T('int-13', 'interview', 'easy', "What kind of team do you work best in?"),
  T('int-14', 'interview', 'easy', "Why are you looking to leave your current role?"),
  T('int-15', 'interview', 'medium', "Tell me about a time you failed."),
  T('int-16', 'interview', 'medium', "Describe a time you had to learn something fast."),
  T('int-17', 'interview', 'medium', "How do you handle a deadline you can't meet?"),
  T('int-18', 'interview', 'medium', "Tell me about a time you led without being in charge."),
  T('int-19', 'interview', 'medium', "How do you deal with feedback you disagree with?"),
  T('int-20', 'interview', 'medium', "Describe a project you'd do differently now."),
  T('int-21', 'interview', 'medium', "How do you prioritize when everything is urgent?"),
  T('int-22', 'interview', 'medium', "Tell me about a difficult customer or colleague."),
  T('int-23', 'interview', 'medium', "What would you do in your first 90 days here?"),
  T('int-24', 'interview', 'medium', "Describe a time you changed someone's mind."),
  T('int-25', 'interview', 'hard', "Tell me about a decision you made with incomplete information."),
  T('int-26', 'interview', 'hard', "What's the biggest risk you've taken in your career?"),
  T('int-27', 'interview', 'hard', "Describe a time you had to deliver bad news."),
  T('int-28', 'interview', 'hard', "How would you handle a colleague taking credit for your work?"),
  T('int-29', 'interview', 'hard', "Sell me on a change you'd make to our product."),
  T('int-30', 'interview', 'hard', "What's something you believe that most people in your field don't?"),
  // wildcard: added October 2026 for the collection.
  T('wild-6', 'wildcard', 'easy', "Introduce yourself as if you were a cat."),
  T('wild-7', 'wildcard', 'easy', "Argue that breakfast for dinner is the best meal."),
  T('wild-8', 'wildcard', 'easy', "You're narrating a nature documentary about your kitchen."),
  T('wild-9', 'wildcard', 'easy', "Explain why your umbrella deserves a promotion."),
  T('wild-10', 'wildcard', 'easy', "Give a weather forecast for your mood this week."),
  T('wild-11', 'wildcard', 'easy', "Review a sandwich like it's a five-star restaurant."),
  T('wild-12', 'wildcard', 'easy', "Persuade a dragon to become a vegetarian."),
  T('wild-13', 'wildcard', 'easy', "Announce the winner of the world's most boring award."),
  T('wild-14', 'wildcard', 'medium', "You're a tour guide in a museum of everyday objects."),
  T('wild-15', 'wildcard', 'medium', "Pitch a reality show set entirely in a library."),
  T('wild-16', 'wildcard', 'medium', "Defend the honor of the humble paperclip."),
  T('wild-17', 'wildcard', 'medium', "You're a time traveler explaining smartphones to someone in 1800."),
  T('wild-18', 'wildcard', 'medium', "Give a pep talk to a nervous sock before laundry day."),
  T('wild-19', 'wildcard', 'medium', "Explain why your houseplant should run for mayor."),
  T('wild-20', 'wildcard', 'medium', "You've just been elected president of the moon. Give your first speech."),
  T('wild-21', 'wildcard', 'medium', "Convince me that pigeons are secretly in charge."),
  T('wild-22', 'wildcard', 'medium', "Give the closing argument in the trial of the last cookie."),
  T('wild-23', 'wildcard', 'hard', "Give a heartfelt farewell speech to a retiring traffic cone."),
  T('wild-24', 'wildcard', 'hard', "Explain the rules of a sport that doesn't exist yet."),
  T('wild-25', 'wildcard', 'hard', "You're an alien reporting back on human birthday parties."),
  T('wild-26', 'wildcard', 'hard', "Argue both sides: is a hot dog a sandwich?"),
  T('wild-27', 'wildcard', 'hard', "Give a TED talk on the art of doing nothing."),
  T('wild-28', 'wildcard', 'hard', "You're a villain explaining why you're actually the hero."),
  T('wild-29', 'wildcard', 'hard', "Deliver the eulogy for your old phone."),
  T('wild-30', 'wildcard', 'hard', "Pitch a startup that solves a problem nobody has."),
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
    /** Topics already answered: dealt last, so the collection keeps growing. */
    answered?: ReadonlySet<string>;
  },
  random: () => number = Math.random,
): Topic {
  const exclude = new Set(opts.exclude ?? []);
  const answered = opts.answered ?? new Set<string>();
  const inCategory = (c: Category) => TOPICS.filter((t) => t.category === c);

  // Difficulty matters most, then something new, then not seen lately.
  const attempts: ((t: Topic) => boolean)[] = [
    (t) => t.difficulty === opts.difficulty && !exclude.has(t.id) && !answered.has(t.id),
    (t) => t.difficulty === opts.difficulty && !answered.has(t.id),
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
