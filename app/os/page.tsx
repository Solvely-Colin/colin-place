import type { Metadata } from "next";
import { OS } from "../components/OS";

export const metadata: Metadata = {
  title: "Colin OS — the desktop",
  description:
    "The original Colin OS desktop — windows, dock, terminal, weather, and all. Now living at /os.",
};

export default function OSPage() {
  return (
    <div className="os-shell">
      <OS />
    </div>
  );
}
