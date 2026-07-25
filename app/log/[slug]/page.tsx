import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getEntry, KIND_META, TIMELINE } from "../../lib/timeline";
import { formatDate } from "../../lib/dates";
import { TerminalReplay } from "../../components/TerminalReplay";
import { Companion } from "../../components/broadcast/Companion";

interface EntryPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TIMELINE.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.summary,
  };
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry) notFound();

  const kind = KIND_META[entry.kind];
  const index = TIMELINE.findIndex((e) => e.slug === entry.slug);
  const newer = index > 0 ? TIMELINE[index - 1] : null;
  const older = index < TIMELINE.length - 1 ? TIMELINE[index + 1] : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#f0e9db]/80 border-b border-stone-200/60">
        <div className="mx-auto max-w-2xl px-5 h-12 flex items-center gap-3">
          <Link
            href="/log"
            className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            The log
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-10 pb-40">
        <article>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: kind.color, backgroundColor: kind.bg }}
            >
              {kind.label}
            </span>
            <time className="text-sm text-stone-500" dateTime={entry.date}>
              {formatDate(entry.date)}
            </time>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight">
            {entry.title}
          </h1>

          <div className="mt-6 space-y-4 text-stone-700 leading-relaxed">
            {entry.summary !== entry.title && <p className="text-lg">{entry.summary}</p>}
            {entry.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          {entry.replay && (
            <div className="mt-8 p-4 rounded-xl bg-white/70 border border-stone-200/70">
              <TerminalReplay />
            </div>
          )}

          {entry.links && entry.links.length > 0 && (
            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2">
                Receipts
              </p>
              <div className="space-y-1.5">
                {entry.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-white/70 border border-stone-200/70 hover:bg-white hover:border-stone-300 transition group"
                  >
                    <span className="text-sm font-medium text-stone-800 group-hover:text-orange-700 transition min-w-0 truncate">
                      {link.label}
                    </span>
                    <ArrowUpRight className="w-4 h-4 shrink-0 text-stone-400 group-hover:text-stone-600 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {entry.kind === "agents" && (
            <p className="mt-8 text-sm text-stone-500 italic">
              This entry was written by the agent session that shipped the change —
              the log is the proof, not a claim.
            </p>
          )}
        </article>

        <nav className="mt-12 pt-6 border-t border-stone-200/70 grid sm:grid-cols-2 gap-2">
          {older ? (
            <Link
              href={`/log/${older.slug}`}
              className="block p-3.5 rounded-xl bg-white/70 border border-stone-200/70 hover:bg-white hover:border-stone-300 transition"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                ← Older
              </span>
              <span className="block text-sm font-medium text-stone-800 mt-0.5 line-clamp-1">
                {older.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link
              href={`/log/${newer.slug}`}
              className="block p-3.5 rounded-xl bg-white/70 border border-stone-200/70 hover:bg-white hover:border-stone-300 transition sm:text-right"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Newer →
              </span>
              <span className="block text-sm font-medium text-stone-800 mt-0.5 line-clamp-1">
                {newer.title}
              </span>
            </Link>
          )}
        </nav>
      </main>

      <Companion />
    </div>
  );
}
