export interface JournalEntry {
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  approvedAt: string; // ISO timestamp of Colin's explicit approval
}

// The Journal is first-person and personal, so the bar is higher than the
// rest of the site: entries are drafted nightly from public signals plus
// notes Colin sends privately, but a draft only lands in this file — and
// therefore on the site — after Colin explicitly approves it. Drafts live
// outside the repo until then. Never commit an entry without approval.
export const JOURNAL_ENTRIES: JournalEntry[] = [];
