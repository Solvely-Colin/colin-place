// Regenerate the site mascot from the reference photos in assets/mascot-refs/.
// Usage: GOOGLE_API_KEY=... node scripts/generate-mascot.mjs [output.png]
import { readFileSync, writeFileSync } from "fs";

const KEY = process.env.GOOGLE_API_KEY;
if (!KEY) {
  console.error("GOOGLE_API_KEY not set");
  process.exit(1);
}

const out = process.argv[2] ?? "assets/mascot-refs/generated-mascot.png";
const MODEL = process.env.MASCOT_MODEL ?? "gemini-2.5-flash-image";
const refs = ["assets/mascot-refs/ref-1.jpg", "assets/mascot-refs/ref-2.jpg", "assets/mascot-refs/ref-3.jpg"];

const PROMPT = `These three photos show the same man. Draw him as a flat vector-style sticker illustration, waist-up, waving hello with one hand, warm friendly smile.

His likeness (match the photos closely):
- Reddish-blond / strawberry-blond hair, longer on top, swept back and to the side
- Black rectangular glasses with thick frames
- Reddish-blond mustache, plus very light stubble on the chin and jaw
- Fair skin, blue-grey eyes

Wardrobe: a plain casual black t-shirt. NO hat. NO cap.

Style rules:
- Flat vector cartoon sticker style, clean shapes, minimal shading
- Thick white sticker outline around the whole figure
- Solid flat bright green background (#00FF00), nothing else in the background
- NO text, NO letters, NO logos, NO words anywhere in the image
- Chest-up composition, centered, facing the viewer`;

const parts = [
  { text: PROMPT },
  ...refs.map((p) => ({
    inline_data: { mime_type: "image/jpeg", data: readFileSync(p).toString("base64") },
  })),
];

async function generate() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );
  return res;
}

let res = await generate();
for (let attempt = 0; res.status === 429 && attempt < 3; attempt++) {
  const wait = 45 * (attempt + 1);
  console.log(`429 quota hit, retrying in ${wait}s...`);
  await new Promise((r) => setTimeout(r, wait * 1000));
  res = await generate();
}

if (!res.ok) {
  console.error("API error", res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
const data = img?.inlineData?.data ?? img?.inline_data?.data;
if (!data) {
  console.error("No image in response:", JSON.stringify(json).slice(0, 500));
  process.exit(1);
}
writeFileSync(out, Buffer.from(data, "base64"));
console.log("Wrote", out);
