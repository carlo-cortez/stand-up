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

export const config = { runtime: 'nodejs', maxDuration: 60 };

const GROQ = 'https://api.groq.com/openai/v1';

// Model ids move; both are overridable without a code change.
const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';

/** A two-minute round is about 1MB; this is generous and still a ceiling. */
const MAX_BYTES = 12 * 1024 * 1024;

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

Reply with JSON only: {"wentWell": string, "quoted": string, "sharper": string, "tryNextTime": string}`;

type Written = { wentWell: string; quoted: string; sharper: string; tryNextTime: string };

async function transcribe(audio: Blob, key: string): Promise<string> {
  const form = new FormData();
  form.append('file', audio, 'round.webm');
  form.append('model', STT_MODEL);
  form.append('prompt', STT_PROMPT);
  form.append('response_format', 'json');
  form.append('temperature', '0');

  const response = await fetch(`${GROQ}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Transcription failed: ${await response.text()}`);
  const data = (await response.json()) as { text?: string };
  return (data.text ?? '').trim();
}

async function write(transcript: string, targetSeconds: number, key: string): Promise<Written | null> {
  const response = await fetch(`${GROQ}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: TEXT_MODEL,
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `The speaker had a target of ${Math.round(targetSeconds / 60)} minute(s). Here is what they said:\n\n${transcript}`,
        },
      ],
    }),
  });
  // The counted half is the part that must not fail; if the writing does not
  // come back, the card still has something true to show.
  if (!response.ok) return null;

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as Partial<Written>;
    if (!parsed.wentWell || !parsed.tryNextTime) return null;
    return {
      wentWell: parsed.wentWell,
      quoted: parsed.quoted ?? '',
      sharper: parsed.sharper ?? '',
      tryNextTime: parsed.tryNextTime,
    };
  } catch {
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Use POST.', { status: 405 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return new Response('Feedback is not switched on for this deployment.', { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return new Response('No audio.', { status: 400 });
  if (audio.size > MAX_BYTES) return new Response('That recording is too long.', { status: 413 });

  const targetSeconds = Number(form?.get('targetSeconds') ?? 120);

  try {
    const transcript = await transcribe(audio, key);
    if (!transcript) return new Response('Nothing was said, or nothing could be heard.', { status: 422 });
    const written = await write(transcript, targetSeconds, key);
    return Response.json(
      { transcript, written },
      // The transcript belongs to the speaker; no caching anywhere in between.
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback failed.';
    return new Response(message, { status: 502 });
  }
}
