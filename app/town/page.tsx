import type { Metadata } from "next";
import { Town } from "./Town";
import { SEED_BUILDINGS } from "../lib/town/seed";
import { listBuildings, storeConfigured } from "../lib/town/store";
import { modelName, ollamaReady } from "../lib/ollama";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Town",
  description:
    "A tiny isometric town where every building is an idea. Describe one and the architect builds it on an empty lot, live.",
};

export default async function TownPage() {
  const configured = storeConfigured();
  const approved = configured ? await listBuildings("approved") : [];
  return (
    <Town
      seeds={SEED_BUILDINGS}
      approved={approved}
      storeConfigured={configured}
      modelName={modelName()}
      modelReady={ollamaReady()}
    />
  );
}
