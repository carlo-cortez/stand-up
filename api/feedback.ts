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

// Model ids move; both are overridable without a code change.
const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';

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

  try {
    const transcript = await transcribe(audio, key);
    if (!transcript) return send(response, 422, 'Nothing was said, or nothing could be heard.');
    const written = await write(transcript, targetSeconds, key);
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    // The transcript belongs to the speaker; no caching anywhere in between.
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ transcript, written }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Feedback failed.';
    return send(response, 502, message);
  }
}
