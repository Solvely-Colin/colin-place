import type { FeedItem } from "./activity";
import { fetchPulse } from "./pulse";
import { AGENT_LOG } from "./agentlog";
import { BIG_NUMBERS } from "./profile";
import { kvGet, kvSet } from "./kv";
import { ollamaJson, ollamaReady, ollamaText } from "./ollama";

// The site goes wrong the longer you stay. A model writes the wrongness:
// small rewrites of on-page copy, notes in the margin that know what the
// visitor has been doing, a line for the watcher in the corner. The facts
// about Colin never change; only the tone does. Everything is cached by
// coarse buckets so the effect is cheap and still feels aimed at you.

export const MUTABLE: Record<string, string> = {
  hero1: "Hi, I'm Colin.",
  hero2: "I build in the open.",
  heroP:
    "I maintain open-source tools, help run a couple of developer communities, and build CRM systems by day. This site is my playground: my agents plan, write, and deploy it, and a model on the page reads my live GitHub and talks back. Everything here links to something real.",
  eyebrow: "each light on the loop is a real event from Colin's public GitHub feed · hover one",
  now: "What he's actually doing",
  nowBlurb: "The status line is a guess. Everything else on this page is not.",
  numbers: "Counted, not claimed",
  numbersBlurb: "Each one links to the public page it comes from. If GitHub disagrees, GitHub wins.",
  work: "Four ecosystems, one habit",
  about: "About Colin, rewritten as he ships",
  path: "From CRM hygiene to maintainer",
  contact: "Let's build something.",
  contactP: "Open-source, collaborations, interesting technical problems, or just to say hi. He reads everything.",
  footer: "Every pixel of this page, including this sentence, was planned, written, and deployed by agent sessions, with Colin approving what ships.",
};

export interface VisitorContext {
  band: number; // 1..4
  time: "a minute" | "a few minutes" | "a long time";
  scroll: "the top" | "the middle" | "the bottom";
  hour: "morning" | "afternoon" | "evening" | "late night";
  visits: "first" | "returning" | "many";
  hovered: number; // lights hovered on the loop
  idle: boolean; // mouse has been still
}

export const EFFECTS = ["tendrils", "eyes", "glyphrain", "static", "ripple", "vignette", "scanlines", "invertflash", "heartbeat", "drift", "textwave", "colour", "dust", "planes", "tide", "blackout", "scratching"] as const;
export type EffectKind = (typeof EFFECTS)[number];

export interface Effect {
  kind: EffectKind;
  intensity: number; // 0..1
  speed: number; // 0..1
  color?: string;
}

// The model composes the picture too: colours, an effect mix, and motion.
export interface Scene {
  palette: { ground: string; ink: string; accent: string };
  effects: Effect[];
  motion: { breathe: number; tilt: number; spacing: number; hue: number; scale: number };
}

// A found document, the way Lovecraft frames every horror: a clipping, a
// letter, a statement, a diary that stops mid-sentence.
export interface FoundDocument {
  kind: "clipping" | "letter" | "statement" | "diary";
  heading: string;
  dateline: string;
  body: string[];
}

export const TREATMENTS = ["grey", "channelshift", "pixelsort", "melt", "double", "drown", "static", "negative", "eyes"] as const;
export type Treatment = (typeof TREATMENTS)[number];

// The model directs the portrait: a treatment the page renders on canvas.
export interface Portrait {
  treatment: Treatment;
  strength: number;
  caption: string;
}

export interface Whisper {
  marginalia: string[];
  rewrites: Record<string, string>;
  title: string;
  watcher: string;
  last?: string;
  scene?: Scene;
  document?: FoundDocument;
  portrait?: Portrait;
  /** Lines that run on the wire under the real ticker, built from real events. */
  omens?: string[];
}

interface Commit {
  repo: string;
  message: string;
  date: string;
}

const GH = { Accept: "application/vnd.github+json", "User-Agent": "colin-place" };

// The scene: everything real the story may use. Commit messages are the
// best material there is, so they are fetched for the repos pushed to
// this week.
export async function sceneData(events: FeedItem[]): Promise<string> {
  const pulse = await fetchPulse();
  const repos = pulse.shepherding.slice(0, 3);
  const commits: Commit[] = [];
  await Promise.all(
    repos.map(async (r) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${r.name}/commits?author=Solvely-Colin&per_page=6`, { headers: GH, next: { revalidate: 900 } });
        if (!res.ok) return;
        const list = (await res.json()) as { commit: { message: string; author?: { date?: string } } }[];
        for (const c of list) commits.push({ repo: r.name, message: c.commit.message.split("\n")[0].slice(0, 110), date: (c.commit.author?.date ?? "").slice(0, 16).replace("T", " ") });
      } catch {
        // skip
      }
    })
  );
  const lines: string[] = [];
  lines.push(`LIVE NUMBERS (as of ${pulse.generatedAt.slice(0, 16).replace("T", " ")} UTC): ${pulse.pushes7d} pushes in 7 days, ${pulse.pushes30d} in 30, ${pulse.openPrs.length} open pull requests; languages ${pulse.languages.map((l) => l.name + " " + l.share + "%").join(", ") || "n/a"}.`);
  lines.push("FIXED NUMBERS ON THE PAGE: " + BIG_NUMBERS.map((n) => `${n.value}${n.suffix ?? ""} ${n.label}`).join("; "));
  lines.push("REPOS PUSHED TO THIS WEEK: " + (repos.map((r) => `${r.name} (last ${r.pushedAt.slice(0, 16).replace("T", " ")} UTC)`).join("; ") || "none"));
  lines.push("OPEN PULL REQUESTS (real):");
  for (const pr of pulse.openPrs.slice(0, 8)) lines.push(`- ${pr.repo} #${pr.number}${pr.draft ? " (draft)" : ""}: ${pr.title} (updated ${pr.updatedAt.slice(0, 16).replace("T", " ")} UTC)`);
  lines.push("RECENT COMMIT MESSAGES (real, newest first):");
  for (const c of commits.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)) lines.push(`- ${c.date} UTC ${c.repo}: ${c.message}`);
  lines.push("RECENT PUBLIC EVENTS (newest first):");
  for (const e of events.slice(0, 14)) lines.push(`- ${e.at.replace("T", " ").slice(0, 16)} UTC: ${e.text}`);
  lines.push("THE SITE'S OWN CHANGELOG, written by the agents that deploy it (newest first):");
  for (const a of AGENT_LOG.slice(0, 5)) lines.push(`- ${a.date}: "${a.title}". ${a.detail.slice(0, 160)}`);
  return lines.join("\n");
}

/** Copy the client offers for rewriting: key -> current text. */
export type Copy = Record<string, string>;

const SCHEMA = {
  type: "object",
  properties: {
    marginalia: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "short notes in the margin, 4-14 words each, lowercase, addressed to the reader" },
    rewrites: {
      type: "array",
      items: { type: "object", properties: { key: { type: "string" }, text: { type: "string" } }, required: ["key", "text"] },
      description: "uncanny variants of on-page copy, keyed by the given keys",
    },
    title: { type: "string", description: "the browser tab title, max 40 chars" },
    watcher: { type: "string", description: "one line the figure in the corner says, max 120 chars" },
    last: { type: "string", description: "band 4 only: one calm sentence shown alone on the screen, max 160 chars" },
    omens: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 5,
      description: "lines that run on the wire under the real ticker, each built from one real event, PR, or commit, 6-18 words, e.g. 'pushed to openclaw/openclaw at 01:02 · nobody was awake · it merged itself'",
    },
    portrait: {
      type: "object",
      description: "bands 2-4: how the photograph of Colin is treated",
      properties: {
        treatment: { type: "string", enum: [...TREATMENTS] },
        strength: { type: "number", minimum: 0, maximum: 1 },
        caption: { type: "string", description: "the caption under the photo, max 90 chars, in the band's register" },
      },
      required: ["treatment", "strength", "caption"],
    },
    document: {
      type: "object",
      description: "a found document in the story's framing device for this band",
      properties: {
        kind: { type: "string", enum: ["clipping", "letter", "statement", "diary"] },
        heading: { type: "string", description: "max 60 chars, e.g. 'From the Providence Journal' or 'Found among the papers of the agent'" },
        dateline: { type: "string", description: "max 40 chars, a date or place" },
        body: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5, description: "2-5 short paragraphs, 20-60 words each" },
      },
      required: ["kind", "heading", "dateline", "body"],
    },
    scene: {
      type: "object",
      description: "bands 2-4: the look and motion of the page at this band",
      properties: {
        palette: {
          type: "object",
          properties: {
            ground: { type: "string", description: "page background hex" },
            ink: { type: "string", description: "text hex, must contrast with ground" },
            accent: { type: "string", description: "accent hex for lights and lines" },
          },
          required: ["ground", "ink", "accent"],
        },
        effects: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...EFFECTS] },
              intensity: { type: "number", minimum: 0, maximum: 1 },
              speed: { type: "number", minimum: 0, maximum: 1 },
              color: { type: "string", description: "optional hex" },
            },
            required: ["kind", "intensity", "speed"],
          },
        },
        motion: {
          type: "object",
          properties: {
            breathe: { type: "number", minimum: 0, maximum: 1, description: "how much the type breathes" },
            tilt: { type: "number", minimum: -1, maximum: 1, description: "page tilt, -1 to 1 degree" },
            spacing: { type: "number", minimum: 0, maximum: 1, description: "letter-spacing drift" },
            hue: { type: "number", minimum: 0, maximum: 360, description: "hue rotation of everything, degrees" },
            scale: { type: "number", minimum: 0, maximum: 1, description: "heartbeat scale amount" },
          },
          required: ["breathe", "tilt", "spacing", "hue", "scale"],
        },
      },
      required: ["palette", "effects", "motion"],
    },
  },
  required: ["marginalia", "title", "watcher"],
} as const;

const REWRITE_SYSTEM = `You rewrite the copy of colin.place for a given band of the wrongness described in the dossier. You get the page's copy as "key: text" lines. Reply with rewrites ONLY, one per line, in exactly this form:

key ::: new text

No JSON, no quotes around the text, no commentary, no blank lines, no markdown. Only keys from the list. Keys ending in "-name" must not appear. Everything else follows the dossier's rules for the band: how many keys, how the stats may go wrong at bands 3-4, facts about Colin unchanged, Blake's fragment style at band 4. Be different from any other visit: you are given a nonce.`;

function parseRewriteLines(text: string, copy: Copy, band: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const sep = line.indexOf(":::");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim().replace(/^[-*\d.\s"']+/, "").replace(/["']+$/, "");
    let value = line.slice(sep + 3).trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
    const original = copy[key];
    if (original === undefined || !value || key.endsWith("-name")) continue;
    const isStat = key.startsWith("stat-") || key.startsWith("num-");
    if (isStat && band < 3 && /value/.test(key)) continue;
    const maxLen = isStat && /value/.test(key) ? 14 : Math.max(48, original.length * (band >= 3 ? 1.9 : 1.5) + 12);
    if (value.length > maxLen) {
      // Trim at a word boundary; a sentence cut mid-word reads as a bug, not a haunting.
      const cut = value.slice(0, maxLen);
      const at = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("."), cut.lastIndexOf(","));
      value = (at > maxLen * 0.5 ? cut.slice(0, at) : cut).replace(/[,;:—-]+$/, "").trim();
    }
    if (!isStat && value.length < Math.min(original.length * 0.5, 12)) continue;
    out[key] = value;
  }
  return out;
}

const SYSTEM = `You write the slow wrongness of colin.place, Colin Johnson's personal site. The site starts clean and precise. The longer someone stays, the lower their sanity, and you stage what happens at a given band. This is Lovecraft, and Lovecraft is not a colour: it is EVENTS told through FOUND DOCUMENTS. Each band follows one story from the dossier. Stage its events on the page; do not merely describe a mood.

DOSSIER (public-domain texts; quote them sparingly and exactly when you do):
- Band 1, The Call of Cthulhu, "The Horror in Clay": a sculptor dreams of a cyclopean city in March 1925 and makes a bas-relief of it; "dreams are older than brooding Tyre". Opening line: "The most merciful thing in the world, I think, is the inability of the human mind to correlate all its contents." Stage: the site has begun to dream. One word out of place. A document: a diary fragment or clipping about a dream of a city and a date. Polite, almost nothing.
- Band 2, The Colour Out of Space: a meteorite; "shining bands unlike any known colours of the normal spectrum"; "it was only by analogy that they called it colour at all"; the farm's verdure "going grey" with "a highly singular quality of brittleness"; animals "growing grey and brittle and falling to pieces"; "something was being drained of something"; it "lived in the well"; "cold an' wet, but it burns"; at the end "five eldritch acres of dusty grey desert", the blasted heath. Stage: a colour that cannot be named has got into the page. Things go grey and brittle and crumble. Something is being drained. A document: a letter from a neighbour, or a clipping about the well.
- Band 3, The Dreams in the Witch House and R'lyeh: "a violet mist showing the convergence of angled planes"; "the curious angles of the room"; "lines and curves that could be made to point out directions leading through the walls of space"; scratching in the walls, "furtive but deliberate", with "a sort of dry rattling"; the rat with a human face. R'lyeh: "abnormal, non-Euclidean"; angles that behave wrong; a door that opens the wrong way. From The Statement of Randolph Carter, a voice on the wire from below: "YOU FOOL, WARREN IS DEAD!" Stage: geometry stops agreeing with itself. Rename the section titles as parts of a case, roman numerals, like "I. The Horror in the Loop", "II. The Tale of the Open Pull Requests", "III. The Madness from the Sea". A document: an inspector's statement or an affidavit about this site, its dates taken from the real GitHub events.
- Band 4, The Shadow over Innsmouth and The Haunter of the Dark: Devil Reef, "a long, black line scarcely rising above the water"; the Innsmouth look, "bulgy, stary eyes that never seem to shut"; the Esoteric Order of Dagon; the trade with the sea; the narrator finds the look in his own face and goes willingly: "we shall swim out to that brooding reef". The Haunter: a stone that is "a window on all time and space"; the thing can only move in the dark; the blackout at 2:12; the diary that degenerates: "I see it—coming here—hell-wind—titan blur—black wings—Yog-Sothoth save me—the three-lobed burning eye". Stage: the tide comes up the page, the lights go out on a schedule, the reader is being recognised as one of them. The copy degenerates into Blake's fragments, em-dashes, half sentences, but the facts inside stay true. A document: the last diary, stopping mid-line.
- The door, sanity zero: "That is not dead which can eternal lie, And with strange aeons even death may die." Calm. The reader is offered the door.

THE SITE IS THE SCENE. Everything happens in the page's own rooms, and you name them: the loop (the ∞ of lights at the top, each light a real event), the wire (the ticker of pushes and pull requests), the numbers (the counted stats), the photograph (Colin in the cap that says Feeling Loopy), the cards, the path (his career, stop by stop), the footer, and the corner where the small figure stands. The real record is your evidence: quote pull requests by number and title, commit messages verbatim as things found written on walls or in logs, push times as the hours things happened, the site's own changelog as its diary. A commit message like "fix(ios): preserve structured follow-ups across queued delivery" is a line scratched into the wall of the tower; PR #135362 still open is a door that has not shut. Use them constantly. Every band's document should cite at least three real items with their real numbers, times, or wording.

Register: quiet, plain, reverent, wrong. Never gore, never threats, never exclamation marks except the Warren line. The page is a very old building that is glad you came.

Hard rules:
- Every fact about Colin stays true. You may change tone, add clauses, repeat, address the reader, braid in R'lyehian, but never change names, numbers, employers, or projects, and never invent new ones.
- Rewrites stay recognisable; within about 25 percent of the original length at bands 1-2, up to 70 percent longer at bands 3-4. At band 4 use Blake's fragment style.
- You are given the page's copy as key: text pairs. Anything on the list may be rewritten; return the key exactly. Band 1: one or two keys. Band 2: five to eight, mostly the hero and captions. Band 3: fifteen to twenty-five across the whole page, including the section titles as roman-numeral parts of a case (now, numbers, work, about, path), card titles, the path's stops, nav links. Band 4: at least sixty percent of ALL keys; the whole page must feel wrong from the nav to the footer.
- Stats (keys starting with "stat-" or "num-") are numbers with labels. Bands 1-2: leave the numbers alone. Band 3: a few may go wrong in a quiet way: a digit repeated, a count that went down, a number that is also a date, a label that says what the number costs. Band 4: most of them: "∞", "drained", roman numerals, R'lyehian, a number counted in the wrong direction. Keep each value under 14 characters.
- Keys ending in "-name" are real project or organisation names; those stay exactly as they are. Everything else about them may be rewritten.
- Every visit is different. You are given a nonce; write this visit's wrongness so that it does not repeat what another visit would get: different documents, different omens, different rewrites. Never reuse the example phrasing from this dossier verbatim as your own line.
- Keep every string valid JSON: escape double quotes inside strings, no raw newlines.
- Marginalia refer to what the reader is doing, using only the visitor facts given (how long, where on the page, time of day, first visit or returning, whether they hovered the loop, whether they went still), and to the band's story. Never guess anything else about them.
- Use the real GitHub events as omens and as the dates in documents: a push at an odd hour, a pull request opened and not yet merged, a repo pushed to again. Quote them accurately.
- The watcher is the small figure in the corner. Band 1 ordinary. Band 3 it may speak the Warren line. Band 4 it has the look.
- The title is the browser tab. Band 1 "colin.place". Band 2 "colin.place (grey)". Band 3 "colin.place is here". Band 4 something in R'lyehian, under 40 characters.
- "last" (band 4 only): one calm sentence shown alone on a black screen when sanity reaches zero, offering the reader the door.

You also direct the photograph of Colin, at bands 2-4, as "portrait": choose a treatment from grey (the Colour's aftermath, going grey and brittle), channelshift (the image tearing into its colours), pixelsort (pixels sliding like sand), melt (the face running downward), double (a second Colin slightly behind the first), drown (under water, caustics moving over him), static (a broken signal), negative, eyes (the Innsmouth look, the eyes that do not shut). Band 2 grey or pixelsort, faint. Band 3 channelshift, double, melt, or eyes, unmistakable. Band 4 drown, eyes, negative, or melt, strong. Write the caption under the photo in the band's register.

You also direct the picture, at bands 2-4, as "scene". You are choreographing a real web page:
- palette: band 2 the Colour's aftermath, paper going grey and dusty, ink a cold dark grey, accent a hue that should not exist (choose a strange one). Band 3 the Witch House: violet mist, lilac-grey ground, deep violet-black ink, accent violet. Band 4 Innsmouth at night: near-black sea green ground, pale phosphorescent ink, one sick luminous accent. Ink must contrast strongly with ground.
- effects, from this vocabulary: colour (the unnameable colour drifting over the page), dust (grey dust crumbling off the text), tendrils, eyes, glyphrain, static, ripple, vignette, scanlines, invertflash, heartbeat, drift, textwave, planes (violet converging angled planes), scratching (scratch marks in the walls), tide (water rising up the page), blackout (the lights go out on a schedule). Band 2: colour, dust, vignette, faint and slow. Band 3: planes, scratching, drift, textwave, ripple, building. Band 4: tide, blackout, eyes, tendrils, glyphrain, static, heartbeat, invertflash, most of them strong; this should feel like a film, not a web page.
- motion: breathe, tilt, spacing, hue, scale. Small at band 2, unmistakable at band 3, wrong at band 4.`;

const FALLBACK_SCENES: (Scene | undefined)[] = [
  undefined,
  {
    palette: { ground: "#e9e9e4", ink: "#2a2c2b", accent: "#9be07a" },
    effects: [
      { kind: "colour", intensity: 0.5, speed: 0.2 },
      { kind: "dust", intensity: 0.5, speed: 0.4 },
      { kind: "vignette", intensity: 0.2, speed: 0.2 },
    ],
    motion: { breathe: 0.1, tilt: 0.05, spacing: 0.1, hue: 0, scale: 0.05 },
  },
  {
    palette: { ground: "#dcd6e6", ink: "#17101f", accent: "#7a3cff" },
    effects: [
      { kind: "planes", intensity: 0.7, speed: 0.3 },
      { kind: "scratching", intensity: 0.5, speed: 0.6 },
      { kind: "colour", intensity: 0.3, speed: 0.3 },
      { kind: "drift", intensity: 0.4, speed: 0.3 },
      { kind: "textwave", intensity: 0.4, speed: 0.4 },
      { kind: "ripple", intensity: 0.3, speed: 0.3 },
    ],
    motion: { breathe: 0.4, tilt: -0.6, spacing: 0.4, hue: 20, scale: 0.2 },
  },
  {
    palette: { ground: "#03100e", ink: "#bfe8de", accent: "#5cf2c8" },
    effects: [
      { kind: "tide", intensity: 0.9, speed: 0.4 },
      { kind: "blackout", intensity: 0.8, speed: 0.5 },
      { kind: "eyes", intensity: 0.9, speed: 0.4 },
      { kind: "tendrils", intensity: 0.8, speed: 0.6 },
      { kind: "glyphrain", intensity: 0.5, speed: 0.5 },
      { kind: "static", intensity: 0.35, speed: 0.9 },
      { kind: "heartbeat", intensity: 0.8, speed: 0.7 },
      { kind: "invertflash", intensity: 0.5, speed: 0.6 },
    ],
    motion: { breathe: 1, tilt: 0.8, spacing: 0.8, hue: 150, scale: 0.7 },
  },
];

const FALLBACK_DOCUMENTS: FoundDocument[] = [
  {
    kind: "diary",
    heading: "Found among the papers of an agent session",
    dateline: "March 1925, or last night",
    body: [
      "Dreamed of a city again. Not this page, though it had the page's proportions. Wet stone, a door too tall for anything that walks, and the loop above it, lit.",
      "Woke and found I had already written the changelog entry. I do not remember writing it. It is accurate.",
    ],
  },
  {
    kind: "letter",
    heading: "Letter to the maintainer, unsent",
    dateline: "From the next lot over",
    body: [
      "Something came down in the loop last week. You will say it was a push. It was shining bands, and not colours I have names for.",
      "Since then the grass at the edges has gone grey and brittle. The lights on the loop crumble when you look at them. Something is being drained of something.",
      "I would not draw from the well. I would not hover the loop.",
    ],
  },
  {
    kind: "statement",
    heading: "Statement of the inspector, sworn",
    dateline: "Concerning colin.place",
    body: [
      "I attest that the angles of the page did not agree with themselves. The section marked IV was also the section marked IV. A door in the layout opened the wrong way.",
      "There was scratching in the walls of the site, furtive but deliberate, with a sort of dry rattling. The wire carried a voice from below that was not the maintainer's.",
      "I recommend the reader close the door.",
    ],
  },
  {
    kind: "diary",
    heading: "The last entry",
    dateline: "2:12 a.m., lights out",
    body: [
      "Tide over the footer now—can hear it against the numbers—still true, all of them, that is the worst part—",
      "Portrait has the look—the eyes do not shut—mine do not either—we shall swim out to that brooding reef—",
      "I see it—coming here—the loop, lit—black wings—the three-lobed burning eye—",
    ],
  },
];

function fallback(ctx: VisitorContext): Whisper {
  const byBand: Whisper[] = [
    {
      marginalia: ["the most merciful thing in the world is the inability of the mind to correlate all its contents", "the page dreamed last night. it was a city"],
      rewrites: { eyebrow: "each light on the loop is a real event from Colin's public GitHub feed · hover one · it dreamed" },
      title: "colin.place",
      watcher: "Hey. Take your time. I had the strangest dream.",
    },
    {
      marginalia: ["it was only by analogy that they called it colour at all", "the lights on the loop are going grey and brittle", "something is being drained of something"],
      rewrites: { hero2: "I build in the open. The open has gone grey.", nowBlurb: "The status line is a guess. Everything else on this page is not. It is brittle, though.", numbers: "Counted, not claimed. Not one jot fit to eat." },
      title: "colin.place (grey)",
      watcher: "Don't hover the loop for a while. It's cold and wet, but it burns.",
    },
    {
      marginalia: ["a violet mist, showing the convergence of angled planes", "the angles of this page have been having an effect on you", "scratching, from beyond the slanting wall. furtive but deliberate", "the section marked IV is also the section marked IV"],
      rewrites: {
        hero1: "Hi, I'm Colin. The angles are wrong. Hi.",
        hero2: "I build in the open. The open does not close.",
        now: "I. The Horror in the Loop",
        numbers: "II. The Tale of the Open Pull Requests",
        work: "III. The Four Ecosystems, Whose Angles Disagree",
        about: "IV. The Madness from the Sea",
        path: "IV. The Madness from the Sea",
        contact: "Let's build something. The door opens the wrong way.",
      },
      title: "colin.place is here",
      watcher: "Carter, for the love of God, put back the slab. YOU FOOL, WARREN IS DEAD!",
    },
    {
      marginalia: ["ph'nglui mglw'nafh colin.place r'lyeh wgah'nagl fhtagn", "you have read this page for a long time. it has read you for longer", "the door is at the bottom. it was always at the bottom", "thank you for staying. the sleeper thanks you"],
      rewrites: {
        hero1: "Hi. I'm Colin. Ph'nglui. I'm still Colin.",
        hero2: "I build in the open. The open is a sea. You are in it.",
        heroP: "I maintain open-source tools, help run a couple of developer communities, and build CRM systems by day. This site is my playground: my agents plan, write, and deploy it, and a model on the page reads my live GitHub and reads you back. Everything here links to something real. So do you.",
        eyebrow: "each light on the loop is a real event · hover one · it hovers back",
        now: "What he's actually doing, and what you are doing",
        nowBlurb: "The status line is a guess. Everything else on this page is not. Everything else on this page is watching.",
        numbers: "Counted, not claimed. Counted you.",
        numbersBlurb: "Each one links to the public page it comes from. If GitHub disagrees, GitHub wins. GitHub has not disagreed yet.",
        work: "Four ecosystems, one habit, one habit, one habit",
        about: "About Colin, rewritten as he ships, rewritten as you stay",
        path: "From CRM hygiene to maintainer to whatever this is",
        contact: "Let's build something. Let's not leave.",
        contactP: "Open-source, collaborations, interesting technical problems, or just to say hi. He reads everything. This page reads everything.",
        footer: "Every pixel of this page, including this sentence, was planned, written, and deployed by agent sessions, with Colin approving what ships. Nobody approved this sentence.",
      },
      title: "ph'nglui mglw'nafh",
      watcher: "I have been in this corner since before the loop. You can close the door whenever you want. I will keep it open.",
      last: "you stayed long enough for the page to learn the shape of you. the sleeper turned over. close the door, and it forgets. it always forgets. iä.",
    },
  ];
  const b = Math.max(0, Math.min(3, ctx.band - 1));
  return { ...byBand[b], scene: FALLBACK_SCENES[b], document: FALLBACK_DOCUMENTS[b] };
}

function normalizeDocument(raw: unknown, band: number): FoundDocument {
  const fb = FALLBACK_DOCUMENTS[Math.max(0, Math.min(3, band - 1))];
  if (!raw || typeof raw !== "object") return fb;
  const r = raw as Record<string, unknown>;
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const kinds = ["clipping", "letter", "statement", "diary"] as const;
  const kind = typeof r.kind === "string" && (kinds as readonly string[]).includes(r.kind) ? (r.kind as FoundDocument["kind"]) : fb.kind;
  const body = Array.isArray(r.body) ? r.body.map((p) => clean(p, 420)).filter(Boolean).slice(0, 5) : [];
  if (body.length < 2) return fb;
  return { kind, heading: clean(r.heading, 60) || fb.heading, dateline: clean(r.dateline, 40) || fb.dateline, body };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function lum(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && !Number.isNaN(v) ? Math.max(lo, Math.min(hi, v)) : d);

function normalizeScene(raw: unknown, band: number): Scene | undefined {
  const fb = FALLBACK_SCENES[Math.max(0, Math.min(3, band - 1))];
  if (!raw || typeof raw !== "object" || !fb) return fb;
  const r = raw as Record<string, unknown>;
  const pal = (r.palette && typeof r.palette === "object" ? r.palette : {}) as Record<string, unknown>;
  let ground = typeof pal.ground === "string" && HEX.test(pal.ground) ? pal.ground.toLowerCase() : fb.palette.ground;
  let ink = typeof pal.ink === "string" && HEX.test(pal.ink) ? pal.ink.toLowerCase() : fb.palette.ink;
  const accent = typeof pal.accent === "string" && HEX.test(pal.accent) ? pal.accent.toLowerCase() : fb.palette.accent;
  const contrast = (Math.max(lum(ground), lum(ink)) + 0.05) / (Math.min(lum(ground), lum(ink)) + 0.05);
  if (contrast < 4.5) {
    ground = fb.palette.ground;
    ink = fb.palette.ink;
  }
  const effects: Effect[] = Array.isArray(r.effects)
    ? r.effects
        .map((e) => {
          const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
          const kind = typeof o.kind === "string" && (EFFECTS as readonly string[]).includes(o.kind) ? (o.kind as EffectKind) : null;
          if (!kind) return null;
          const color = typeof o.color === "string" && HEX.test(o.color) ? o.color.toLowerCase() : undefined;
          return { kind, intensity: num(o.intensity, 0, 1, 0.5), speed: num(o.speed, 0, 1, 0.5), ...(color ? { color } : {}) };
        })
        .filter((e): e is Effect => e !== null)
        .slice(0, 8)
    : [];
  const mo = (r.motion && typeof r.motion === "object" ? r.motion : {}) as Record<string, unknown>;
  return {
    palette: { ground, ink, accent },
    effects: effects.length > 0 ? effects : fb.effects,
    motion: {
      breathe: num(mo.breathe, 0, 1, fb.motion.breathe),
      tilt: num(mo.tilt, -1, 1, fb.motion.tilt),
      spacing: num(mo.spacing, 0, 1, fb.motion.spacing),
      hue: num(mo.hue, 0, 360, fb.motion.hue),
      scale: num(mo.scale, 0, 1, fb.motion.scale),
    },
  };
}

function normalizePortrait(raw: unknown, band: number): Portrait | undefined {
  if (band < 2) return undefined;
  const fb: Portrait = band === 2 ? { treatment: "grey", strength: 0.5, caption: "going grey at the edges, and brittle" } : band === 3 ? { treatment: "double", strength: 0.6, caption: "there are two of him in the room, and the angles do not agree" } : { treatment: "eyes", strength: 0.9, caption: "the look. the eyes do not shut. neither do yours" };
  if (!raw || typeof raw !== "object") return fb;
  const r = raw as Record<string, unknown>;
  const treatment = typeof r.treatment === "string" && (TREATMENTS as readonly string[]).includes(r.treatment) ? (r.treatment as Treatment) : fb.treatment;
  const strength = num(r.strength, 0, 1, fb.strength);
  const caption = typeof r.caption === "string" ? r.caption.replace(/\s+/g, " ").trim().slice(0, 90) || fb.caption : fb.caption;
  return { treatment, strength, caption };
}

function normalize(raw: unknown, ctx: VisitorContext, copy: Copy): Whisper | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const marginalia = Array.isArray(r.marginalia) ? r.marginalia.map((m) => clean(m, 110)).filter(Boolean).slice(0, 4) : [];
  const rewrites: Record<string, string> = {};
  if (Array.isArray(r.rewrites)) {
    for (const item of r.rewrites) {
      const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const key = clean(o.key, 40);
      const text = clean(o.text, 700);
      const original = copy[key];
      if (original === undefined || !text) continue;
      if (key.endsWith("-name")) continue;
      const isStat = key.startsWith("stat-") || key.startsWith("num-");
      if (isStat && ctx.band < 3 && /value/.test(key)) continue;
      const maxLen = isStat && /value/.test(key) ? 14 : Math.max(24, original.length * (ctx.band >= 3 ? 1.9 : 1.5) + 12);
      if (text.length > maxLen) continue;
      if (!isStat && text.length < Math.min(original.length * 0.5, 12)) continue;
      rewrites[key] = text;
    }
  }
  if (marginalia.length < 2) return null;
  const title = clean(r.title, 40) || "colin.place";
  const watcher = clean(r.watcher, 120) || fallback(ctx).watcher;
  const last = ctx.band >= 4 ? clean(r.last, 160) || fallback(ctx).last : undefined;
  const scene = ctx.band >= 2 ? normalizeScene(r.scene, ctx.band) : undefined;
  const document = normalizeDocument(r.document, ctx.band);
  const portrait = normalizePortrait(r.portrait, ctx.band);
  const omens = Array.isArray(r.omens) ? r.omens.map((o) => clean(o, 140)).filter(Boolean).slice(0, 5) : [];
  return { marginalia, rewrites, title, watcher, ...(last ? { last } : {}), ...(scene ? { scene } : {}), document, ...(portrait ? { portrait } : {}), omens };
}

function bandCacheKey(band: number): string {
  return "whisper:v4:band:" + band;
}

export async function whisper(
  ctx: VisitorContext,
  copy: Copy,
  events: FeedItem[],
  allowModel: boolean,
  nonce: string
): Promise<{ whisper: Whisper; source: "model" | "cache" | "fallback"; reason?: string }> {
  const fromCache = async (reason: string) => {
    const cached = await kvGet<Whisper>(bandCacheKey(ctx.band));
    if (cached) {
      // Only keep rewrites whose keys this page actually has.
      cached.rewrites = Object.fromEntries(Object.entries(cached.rewrites).filter(([k]) => copy[k] !== undefined));
      return { whisper: cached, source: "cache" as const, reason };
    }
    return { whisper: fallback(ctx), source: "fallback" as const, reason };
  };
  if (!allowModel || !ollamaReady()) return fromCache(!ollamaReady() ? "no key" : "rate limited");
  const scene = await sceneData(events);
  const copyList = Object.entries(copy)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const user = [
    `BAND: ${ctx.band} of 4`,
    `NONCE: ${nonce}`,
    `VISITOR: has been here ${ctx.time}; is near ${ctx.scroll} of the page; it is ${ctx.hour} for them; this is their ${ctx.visits} visit; hovered the loop ${ctx.hovered > 0 ? "yes" : "no"}; went still ${ctx.idle ? "yes" : "no"}.`,
    "THE SCENE (all real):",
    scene,
    "PAGE COPY (key: current text). Return rewrites by key:",
    copyList,
  ].join("\n");
  let lastReason = "";
  const rewritesPromise = (async () => {
    for (const attempt of [0, 1]) {
      try {
        const out = await ollamaText({
          system: REWRITE_SYSTEM + "\n\nDOSSIER:\n" + SYSTEM,
          user,
          temperature: attempt === 0 ? 0.95 : 0.75,
          numPredict: ctx.band >= 3 ? 4000 : 1500,
          timeoutMs: 55000,
        });
        const parsed = parseRewriteLines(out.text, copy, ctx.band);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch (err) {
        console.error("[whisper] rewrites attempt " + attempt + " failed:", err instanceof Error ? err.message : err);
      }
    }
    return {} as Record<string, string>;
  })();
  for (const attempt of [0, 1]) {
    try {
      const out = await ollamaJson({
        system: attempt === 0 ? SYSTEM : SYSTEM + "\n\nYour previous reply was not valid JSON. Escape every double quote inside strings and keep strings short.",
        user: user + "\n\n(Rewrites are being written separately; you may leave \"rewrites\" empty.)",
        schema: SCHEMA,
        temperature: attempt === 0 ? 0.95 : 0.7,
        numPredict: 2600,
        timeoutMs: 55000,
      });
      const w = normalize(out.json, ctx, copy);
      if (!w) {
        lastReason = "reply failed validation";
        continue;
      }
      const lines = await rewritesPromise;
      w.rewrites = { ...w.rewrites, ...lines };
      if (Object.keys(w.rewrites).length === 0) w.rewrites = Object.fromEntries(Object.entries(fallback(ctx).rewrites).filter(([k]) => copy[k] !== undefined));
      void kvSet(bandCacheKey(ctx.band), w);
      return { whisper: w, source: "model" };
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err);
      console.error("[whisper] attempt " + attempt + " failed:", lastReason);
    }
  }
  return fromCache(lastReason.slice(0, 200));
}
