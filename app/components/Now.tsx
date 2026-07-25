"use client";

const ITEMS = [
  {
    title: "Volunteer-maintaining OpenClaw",
    detail: "PR review, contributor onboarding, and QA evidence infrastructure for the open-source personal AI assistant.",
  },
  {
    title: "Building agent tooling at Solvely",
    detail: "This site included — yes, the OS you’re clicking around in is agent-built and agent-maintained.",
  },
  {
    title: "Senior Manager, CRM at Youth Enrichment Brands",
    detail: "HubSpot architecture, custom apps, and lifecycle automation across four franchise brands.",
  },
  {
    title: "Exploring developer-relations & ecosystem roles",
    detail: "If that’s you, the Contact window is right there.",
  },
];

export function Now() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-stone-800">What Colin is doing now</h2>
        <span className="text-xs text-stone-600">July 2026</span>
      </div>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <div key={item.title} className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-100/80">
            <h3 className="font-semibold text-stone-800 text-sm">{item.title}</h3>
            <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-600 italic">
        A /now page — the answer to “so what are you up to these days?”
      </p>
    </div>
  );
}
