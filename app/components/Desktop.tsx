"use client";

import { motion } from "framer-motion";
import { User, FolderOpen, MessageCircle, FileText, Clock, Radio, Mail, Terminal, BookOpen, Hammer, Bot } from "lucide-react";
import type { ComponentType } from "react";

export type AppId =
  | "about"
  | "projects"
  | "resume"
  | "ask"
  | "now"
  | "live"
  | "journal"
  | "workshop"
  | "agents"
  | "contact"
  | "terminal";

export interface AppMeta {
  id: AppId;
  label: string;
  title: string;
  color: string;
  Icon: ComponentType<{ className?: string }>;
}

export const APP_LIST: AppMeta[] = [
  { id: "about", label: "About", title: "About Colin", color: "#ff8c42", Icon: User },
  { id: "projects", label: "Projects", title: "Projects", color: "#5ba8c4", Icon: FolderOpen },
  { id: "resume", label: "Resume", title: "Resume", color: "#0f766e", Icon: FileText },
  { id: "ask", label: "Ask", title: "Ask Clippy Colin", color: "#8b5cf6", Icon: MessageCircle },
  { id: "now", label: "Now", title: "Now", color: "#d97706", Icon: Clock },
  { id: "live", label: "Live", title: "Live — Colin’s Orbit", color: "#ef4444", Icon: Radio },
  { id: "journal", label: "Journal", title: "The Journal", color: "#6366f1", Icon: BookOpen },
  { id: "workshop", label: "Workshop", title: "The Workshop", color: "#0284c7", Icon: Hammer },
  { id: "agents", label: "Agents", title: "Built by Agents", color: "#db2777", Icon: Bot },
  { id: "contact", label: "Contact", title: "Contact", color: "#7bc043", Icon: Mail },
  { id: "terminal", label: "Terminal", title: "Terminal", color: "#6b7280", Icon: Terminal },
];

export const APP_META = Object.fromEntries(
  APP_LIST.map((a) => [a.id, a])
) as Record<AppId, AppMeta>;

export interface WindowData {
  id: AppId;
  position: { x: number; y: number };
  zIndex: number;
  minimized: boolean;
  zoomed: boolean;
}

interface DesktopProps {
  onOpenApp: (id: AppId) => void;
  onHoverApp: (id: AppId | null) => void;
}

export function Desktop({ onOpenApp, onHoverApp }: DesktopProps) {
  return (
    <div className="absolute inset-0 pt-12 pb-24 px-4 sm:px-6 flex flex-col flex-wrap content-start gap-6 sm:gap-8">
      {APP_LIST.map((app, index) => (
        <motion.button
          key={app.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, type: "spring", stiffness: 300 }}
          onDoubleClick={() => onOpenApp(app.id)}
          onMouseEnter={() => onHoverApp(app.id)}
          onMouseLeave={() => onHoverApp(null)}
          className="desktop-icon group flex flex-col items-center gap-2 w-20 sm:w-24 p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/20 active:scale-95"
        >
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:-translate-y-1"
            style={{ backgroundColor: app.color }}
          >
            <app.Icon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <span className="icon-label text-xs text-white font-medium px-2 py-0.5 rounded transition">
            {app.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
