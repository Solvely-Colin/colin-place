import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KIND_META, TIMELINE, type TimelineEntry } from "../../lib/timeline";
import { formatDate } from "../../lib/dates";

function EntryCard({ entry }: { entry: TimelineEntry }) {
  const kind = KIND_META[entry.kind];
  return (
    <Link
      href={`/log/${entry.slug}`}
      className="group block p-4 sm:p-5 rounded-xl bg-white/70 border border-stone-200/70 hover:border-stone-300 hover:bg-white hover:shadow-md transition"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: kind.color, backgroundColor: kind.bg }}
        >
          {kind.label}
        </span>
        <span className="text-[11px] text-stone-500">{formatDate(entry.date)}</span>
        <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-stone-300 group-hover:text-stone-500 transition" />
      </div>
      <h3 className="font-bold text-stone-800 leading-snug group-hover:text-orange-700 transition">
        {entry.title}
      </h3>
      {entry.summary !== entry.title && (
        <p className="text-sm text-stone-600 leading-relaxed mt-1">{entry.summary}</p>
      )}
    </Link>
  );
}

export function TimelineFeed() {
  return (
    <div className="relative space-y-3 sm:pl-6">
      {/* The broadcast's spine */}
      <div
        aria-hidden
        className="hidden sm:block absolute left-1.5 top-2 bottom-2 w-px bg-stone-300/70"
      />
      {TIMELINE.map((entry) => (
        <div key={entry.slug} className="relative">
          <span
            aria-hidden
            className="hidden sm:block absolute -left-[21px] top-6 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{ backgroundColor: KIND_META[entry.kind].color }}
          />
          <EntryCard entry={entry} />
        </div>
      ))}
    </div>
  );
}
