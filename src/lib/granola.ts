import "server-only";

// Granola share links are public; fetch and strip to text server-side.
const GRANOLA_HOSTS = new Set(["notes.granola.ai", "granola.ai", "www.granola.ai", "granola.so"]);

export class NoteReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoteReadError";
  }
}

function looksLikeUrl(s: string): URL | null {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Return the note text for a given source. If `source` is a Granola URL, fetch it
 * (allowlisted hosts only, SSRF-safe) and extract text. Otherwise treat it as the
 * note text directly. Throws NoteReadError if a link can't be read into usable text.
 */
export async function resolveNoteText(source: string): Promise<string> {
  const trimmed = (source || "").trim();
  if (!trimmed) throw new NoteReadError("Paste a Granola link or the note text.");

  const url = looksLikeUrl(trimmed);
  if (!url) return trimmed; // treat as pasted note text

  if (!GRANOLA_HOSTS.has(url.hostname)) {
    throw new NoteReadError("That doesn't look like a Granola link. Paste the note text instead.");
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CtrlTowerBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new NoteReadError(`Couldn't open that link (HTTP ${res.status}). Paste the note text instead.`);
    html = await res.text();
  } catch (e) {
    if (e instanceof NoteReadError) throw e;
    throw new NoteReadError("Couldn't reach that link. Paste the note text instead.");
  }

  const text = htmlToText(html);
  // JS-rendered pages return a near-empty shell — fall back to pasting text.
  if (text.length < 40) {
    throw new NoteReadError("Couldn't read the note from that link — paste the note text instead.");
  }
  return text;
}
