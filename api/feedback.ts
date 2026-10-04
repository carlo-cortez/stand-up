/*
 * The one piece of this app that runs on a server, and it exists for a single
 * reason: the Groq API key cannot be in the browser. Audio goes out, a
 * transcript and three short pieces of writing come back, and nothing is
 * stored here — the round itself lives on the user's device and, if they are
 * signed in, in their own Supabase project.
 *
 * Local development needs `vercel dev`, not `npm run dev`: Vite alone does not
 * run functions.
 */

// Vercel's Node runtime hands this function a Node request and response, not
// a Web Request — so the body is read as a stream and handed to undici's
// Response to be parsed as multipart. Transcription plus writing is usually
// under fifteen seconds; sixty is headroom, not an expectation.
export const config = { maxDuration: 60 };

const GROQ = 'https://api.groq.com/openai/v1';

// Model ids move; both are overridable without a code change. The text model
// was llama-3.3-70b-versatile until September 2026, when it turned out this
// project's key had no Llama text model at all: every written half came back
// 404 model_not_found, and the card hid it. gpt-oss-120b is on the key's list.
const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';

/**
 * A two-minute round is well under 1MB as webm/opus, and about 1.4MB as the
 * mp4 Safari produces. Vercel caps a request body at 4.5MB, so this refuses
 * anything larger with a sentence rather than letting the platform cut it off.
 */
const MAX_BYTES = 4 * 1024 * 1024;

/*
 * Whisper is trained to tidy disfluencies away, which is exactly the thing
 * this app wants counted. Seeding the decoder with a disfluent sentence biases
 * it towards transcribing them (build plan, M2.5's known soft spot).
 */
const STT_PROMPT =
  'Um, so, like, I mean — this is, uh, a practice talk, you know, with all the ums and uhs left in.';

const SYSTEM_PROMPT = `You give feedback on a short impromptu speech, in the voice of a calm, encouraging coach.

Rules, which matter more than completeness:
- Lead with what genuinely went well. Be specific about what the speaker actually said — never generic praise.
- Give exactly ONE thing to try next time. Never a list of faults.
- Quote one real sentence of theirs, verbatim, and rewrite that same sentence more sharply. Keep their meaning and their voice; make it shorter and more concrete.
- No grades, no scores, no "you failed to". Never mention filler words or speaking pace — those are counted separately and shown beside you.
- Two sentences at most per field. Plain English, no jargon, no exclamation marks.

Also mark five criteria, judging only from the words (you cannot hear tone, pace or confidence, so never comment on them):
- point: did they state a clear main point early?
- reason: did they back it with a reason?
- example: did they give a concrete example, story or number?
- landed: did they close by returning to the point?
- answered: did they actually answer the topic they were given?
Each gets a mark — "there", "partly" or "not-yet" — and a note of at most 12 words. For "there", say what worked, quoting a few of their words if you can. For "partly" or "not-yet", describe what happened, not what to do: the single thing to do differently belongs only in tryNextTime. Be fair rather than generous; a mark is only useful if it's honest.

Reply with JSON only: {"wentWell": string, "quoted": string, "sharper": string, "tryNextTime": string, "criteria": {"point": {"mark": string, "note": string}, "reason": {...}, "example": {...}, "landed": {...}, "answered": {...}}}`;

type Mark = 'there' | 'partly' | 'not-yet';
type Criteria = Record<'point' | 'reason' | 'example' | 'landed' | 'answered', { mark: Mark; note: string }>;
type Written = { wentWell: string; quoted: string; sharper: string; tryNextTime: string; criteria?: Criteria };

const CRITERIA = ['point', 'reason', 'example', 'landed', 'answered'] as const;
const MARKS: readonly string[] = ['there', 'partly', 'not-yet'];

/**
 * All five, each with a known mark and a note, or nothing: a checklist with
 * gaps would read as though the missing rows were passed over.
 */
function criteriaFrom(raw: unknown): Criteria | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<Criteria> = {};
  for (const key of CRITERIA) {
    const item = (raw as Record<string, { mark?: unknown; note?: unknown }>)[key];
    const mark = typeof item?.mark === 'string' ? item.mark.toLowerCase().replace(/[\s_]+/g, '-') : '';
    if (!MARKS.includes(mark) || typeof item?.note !== 'string' || !item.note.trim()) return undefined;
    out[key] = { mark: mark as Mark, note: item.note.trim().slice(0, 160) };
  }
  return out as Criteria;
}

/** A word and when it was said, in seconds from the start of the recording. */
type Word = { word: string; start: number; end: number };
/**
 * A stretch of speech, roughly a sentence. avg_logprob is how sure Whisper
 * was of it, which the app reads as Clarity; no_speech_prob flags silence.
 */
type Segment = { start: number; end: number; avg_logprob: number; no_speech_prob: number };
type Transcription = { text: string; words: Word[]; segments: Segment[] };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Formats the transcriber takes, read from the file name, so Safari's mp4 isn't sent as webm. */
const FORMATS = ['webm', 'mp4', 'm4a', 'ogg', 'wav', 'mp3'];

function fileName(audio: Blob): string {
  const sent = audio instanceof File ? audio.name.split('.').pop()?.toLowerCase() : undefined;
  return `round.${sent && FORMATS.includes(sent) ? sent : 'webm'}`;
}

async function transcribe(audio: Blob, key: string): Promise<Transcription> {
  const form = new FormData();
  form.append('file', audio, fileName(audio));
  form.append('model', STT_MODEL);
  form.append('prompt', STT_PROMPT);
  // Timings per word and per segment: pace over time, pauses, and Clarity.
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  form.append('temperature', '0');

  const response = await fetch(`${GROQ}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Transcription failed: ${await response.text()}`);
  const data = (await response.json()) as { text?: string; words?: Word[]; segments?: Segment[] };
  // Only what the app uses goes back to the browser, rounded to 10 ms.
  return {
    text: (data.text ?? '').trim(),
    words: (data.words ?? []).map((w) => ({ word: w.word, start: round2(w.start), end: round2(w.end) })),
    segments: (data.segments ?? []).map((s) => ({
      start: round2(s.start),
      end: round2(s.end),
      avg_logprob: round2(s.avg_logprob),
      no_speech_prob: round2(s.no_speech_prob),
    })),
  };
}

/*
 * Why the written half didn't come back, for the function logs. Never the
 * transcript or the model's reply: those are the speaker's words, and Groq's
 * error bodies can quote the generation back.
 */
function unwritten(reason: string): null {
  console.error(`feedback: written half missing (${reason})`);
  return null;
}

/** Mirrors MIN_WORDS in src/lib/feedback.ts: below it the app shows no feedback. */
const MIN_WORDS = 20;

async function write(transcript: string, targetSeconds: number, topic: string, key: string): Promise<Written | null> {
  if ((transcript.match(/[\p{L}'’-]+/gu) ?? []).length < MIN_WORDS) return null;

  const response = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TEXT_MODEL,
      temperature: 0.4,
      // A reasoning model: its thinking counts against max_tokens, so keep the
      // thinking short and leave room for the four fields after it.
      reasoning_effort: 'low',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `The topic was: "${topic || 'not given'}"\nThe speaker had a target of ${Math.round(targetSeconds / 60)} minute(s). Here is what they said:\n\n${transcript}`,
        },
      ],
    }),
  });
  // The counted half is the part that must not fail; if the writing does not
  // come back, the card still has something true to show.
  if (!response.ok) {
    const code = await response
      .json()
      .then((body: { error?: { code?: string; type?: string } }) => body.error?.code ?? body.error?.type ?? '')
      .catch(() => '');
    return unwritten(`model replied ${response.status}${code ? ` ${code}` : ''}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return unwritten('empty reply');
  try {
    const parsed = JSON.parse(content) as Partial<Written> & { criteria?: unknown };
    if (!parsed.wentWell || !parsed.tryNextTime) return unwritten('reply missing fields');
    const criteria = criteriaFrom(parsed.criteria);
    // The prose stands without the checklist; log it, keep the rest.
    if (!criteria) console.error('feedback: checklist missing or malformed');
    return {
      wentWell: parsed.wentWell,
      quoted: parsed.quoted ?? '',
      sharper: parsed.sharper ?? '',
      tryNextTime: parsed.tryNextTime,
      criteria,
    };
  } catch {
    return unwritten('reply was not JSON');
  }
}

type NodeRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on: (event: string, listener: (chunk?: unknown) => void) => void;
};

type NodeResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
};

function readBody(request: NodeRequest, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk) => {
      const buffer = chunk as Buffer;
      size += buffer.length;
      if (size > limit) reject(new Error('too large'));
      else chunks.push(buffer);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function send(response: NodeResponse, status: number, body: string): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end(body);
}

export default async function handler(request: NodeRequest, response: NodeResponse): Promise<void> {
  if (request.method !== 'POST') return send(response, 405, 'Use POST.');

  const key = process.env.GROQ_API_KEY;
  if (!key) return send(response, 503, 'Feedback is not switched on for this deployment.');

  let form: FormData | null = null;
  try {
    const raw = await readBody(request, MAX_BYTES);
    const contentType = request.headers['content-type'];
    // undici's Response parses multipart for us, so there is no hand-rolled
    // boundary parsing to get wrong.
    form = await new Response(raw, {
      headers: { 'content-type': Array.isArray(contentType) ? contentType[0] : (contentType ?? '') },
    }).formData();
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'too large';
    return send(response, tooLarge ? 413 : 400, tooLarge ? 'That recording is too long to send.' : 'No audio.');
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return send(response, 400, 'No audio.');

  const targetSeconds = Number(form.get('targetSeconds') ?? 120);
  // The topic as the app showed it, so "answered the question" can be judged.
  const topic = String(form.get('topic') ?? '').slice(0, 300);

  try {
    const { text: transcript, words, segments } = await transcribe(audio, key);
    if (!transcript) return send(response, 422, 'Nothing was said, or nothing could be heard.');
    const written = await write(transcript, targetSeconds, topic, key);
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    // The transcript belongs to the speaker; no caching anywhere in between.
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ transcript, written, words, segments }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback failed.';
    return send(response, 502, message);
  }
}
