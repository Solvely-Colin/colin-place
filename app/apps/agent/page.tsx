import type { Metadata } from "next";
import { AgentOpsDashboard } from "./AgentOpsDashboard";

export const metadata: Metadata = {
  title: "Agent Operations — Colin.place",
  description: "A human-readable view of Mobile Clawd's schedules, health, cost posture, and authority boundaries.",
};

export default function AgentOperationsPage() {
  return <AgentOpsDashboard />;
}
