import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TimelineFeed } from "../components/broadcast/TimelineFeed";
import { Companion } from "../components/broadcast/Companion";

export const metadata: Metadata = {
  title: "The log",
  description:
    "One stream: Colin's journal, the agents' own changelog, and builds from the workshop — everything that ships on colin.place.",
};

export default function LogPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#f0e9db]/80 border-b border-stone-200/60">
        <div className="mx-auto max-w-2xl px-5 h-12 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            colin<span className="text-orange-500 -mx-1">.</span>place
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pt-10 pb-40">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">The log</h1>
        <p className="text-stone-600 mt-2 mb-8">
          One stream: Colin&apos;s journal, the agents&apos; own changelog, and builds
          from the workshop. Newest first.
        </p>
        <TimelineFeed />
      </main>
      <Companion />
    </div>
  );
}
