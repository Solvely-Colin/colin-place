"use client";

import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { BootScreen } from "./BootScreen";
import { MenuBar } from "./MenuBar";
import { Desktop, AppId, APP_LIST, APP_META, WindowData } from "./Desktop";
import { Window } from "./Window";
import { Dock } from "./Dock";
import { Terminal as TerminalApp } from "./Terminal";
import { ClippyColin } from "./ClippyColin";
import { Projects } from "./Projects";
import { AskColin } from "./AskColin";
import { Resume } from "./Resume";
import { Now } from "./Now";
import { Live } from "./Live";
import { Journal } from "./Journal";
import { Workshop } from "./Workshop";
import { AgentOps } from "./AgentOps";
import { Wallpaper } from "./Wallpaper";
import { Weather } from "./Weather";
import { Presence } from "./Presence";
import { Cursors } from "./Cursors";
import { CommandPalette, PaletteAction } from "./CommandPalette";

function renderContent(id: AppId, openApp: (id: AppId) => void): ReactNode {
  switch (id) {
    case "about":
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <img
              src="/colin.png"
              alt="Colin"
              className="w-24 h-24 rounded-xl object-cover bg-stone-100 shadow-sm"
            />
            <div>
              <h2 className="text-xl font-bold text-stone-800">Colin Johnson</h2>
              <p className="text-stone-700">Builder, connector, community person.</p>
            </div>
          </div>
          <p className="text-stone-700 leading-relaxed">
            I build tools and communities around AI, open source, and playful software.
            Volunteer maintainer in the OpenClaw community, helping shape how agents and
            humans work together.
          </p>
          <p className="text-stone-700 leading-relaxed">
            This site is my digital operating system — a place to share what I’m working on,
            thinking about, and open to collaborating on.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["Product", "Community", "Open Source", "AI", "Agents"].map((tag) => (
              <span key={tag} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => openApp("resume")}
            className="text-sm font-medium text-teal-700 hover:text-teal-900 underline underline-offset-4"
          >
            See the full track record →
          </button>
        </div>
      );
    case "projects":
      return <Projects />;
    case "resume":
      return <Resume />;
    case "ask":
      return <AskColin onOpenApp={openApp} />;
    case "live":
      return <Live />;
    case "now":
      return <Now />;
    case "journal":
      return <Journal />;
    case "workshop":
      return <Workshop />;
    case "agents":
      return <AgentOps />;
    case "contact":
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-stone-800 mb-2">Let’s build something.</h3>
            <p className="text-stone-600">
              Open to collaborations, consulting, and technical roles.
            </p>
          </div>
          <div className="space-y-3">
            <ContactRow label="Email" value="hello@colin.place" href="mailto:hello@colin.place" />
            <ContactRow label="X / Twitter" value="@colinsolvely" href="https://x.com/colinsolvely" />
            <ContactRow label="GitHub" value="Solvely-Colin" href="https://github.com/Solvely-Colin" />
            <ContactRow label="LinkedIn" value="Colin W. Johnson" href="https://www.linkedin.com/in/colin-w-johnson/" />
          </div>
        </div>
      );
    case "terminal":
      return <TerminalApp onOpenApp={openApp} />;
  }
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-3 rounded-xl bg-stone-50/80 hover:bg-green-50/80 transition group"
    >
      <span className="text-stone-700 text-sm">{label}</span>
      <span className="font-medium text-stone-800 group-hover:text-green-600 transition">{value}</span>
    </a>
  );
}

export function OS() {
  const [booted, setBooted] = useState(false);
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [hoveredIcon, setHoveredIcon] = useState<AppId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 99);
      const existing = prev.find((w) => w.id === id);
      if (existing) {
        return prev.map((w) =>
          w.id === id ? { ...w, zIndex: maxZ + 1, minimized: false } : w
        );
      }
      const count = prev.length;
      return [
        ...prev,
        {
          id,
          position: { x: 100 + count * 30, y: 80 + count * 30 },
          zIndex: maxZ + 1,
          minimized: false,
          zoomed: false,
        },
      ];
    });
  }, []);

  const closeWindow = useCallback((id: AppId) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 99);
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 1, minimized: false } : w
      );
    });
  }, []);

  const minimizeWindow = useCallback((id: AppId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, []);

  const toggleZoom = useCallback((id: AppId) => {
    setWindows((prev) => {
      const maxZ = prev.reduce((m, w) => Math.max(m, w.zIndex), 99);
      return prev.map((w) =>
        w.id === id
          ? { ...w, zoomed: !w.zoomed, minimized: false, zIndex: maxZ + 1 }
          : w
      );
    });
  }, []);

  const closeAll = useCallback(() => setWindows([]), []);

  const moveWindow = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position } : w))
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeWindow =
    windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)[0] ?? null;

  const paletteActions: PaletteAction[] = [
    ...APP_LIST.map((a) => ({
      id: "open-" + a.id,
      label: "Open " + a.title,
      hint: "App",
      run: () => openWindow(a.id),
    })),
    { id: "close-all", label: "Close All Windows", hint: "Action", run: closeAll },
    {
      id: "email",
      label: "Email Colin",
      hint: "hello@colin.place",
      run: () => {
        window.location.href = "mailto:hello@colin.place";
      },
    },
    {
      id: "github",
      label: "Colin on GitHub",
      hint: "Link",
      run: () => {
        window.open("https://github.com/Solvely-Colin", "_blank");
      },
    },
    {
      id: "linkedin",
      label: "Colin on LinkedIn",
      hint: "Link",
      run: () => {
        window.open("https://www.linkedin.com/in/colin-w-johnson/", "_blank");
      },
    },
    {
      id: "restart",
      label: "Restart Colin OS",
      hint: "Action",
      run: () => setBooted(false),
    },
  ];

  return (
    <>
      <AnimatePresence>
        {!booted && <BootScreen onComplete={() => setBooted(true)} />}
      </AnimatePresence>

      <div className={"fixed inset-0 transition-opacity duration-500 " + (booted ? "opacity-100" : "opacity-0")}>
        <Wallpaper />
        <Weather />
        <MenuBar
          activeTitle={activeWindow ? APP_META[activeWindow.id].title : null}
          onAbout={() => openWindow("about")}
          onCloseAll={closeAll}
          onRestart={() => setBooted(false)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <Desktop onOpenApp={openWindow} onHoverApp={setHoveredIcon} />

        <AnimatePresence>
          {windows.map((w) => {
            const meta = APP_META[w.id];
            return (
              <Window
                key={w.id}
                id={w.id}
                title={meta.title}
                icon={<meta.Icon className="w-full h-full" />}
                color={meta.color}
                position={w.position}
                zIndex={w.zIndex}
                minimized={w.minimized}
                zoomed={w.zoomed}
                isActive={activeWindow?.id === w.id}
                onClose={() => closeWindow(w.id)}
                onFocus={() => focusWindow(w.id)}
                onMinimize={() => minimizeWindow(w.id)}
                onZoom={() => toggleZoom(w.id)}
                onMove={moveWindow}
              >
                {renderContent(w.id, openWindow)}
              </Window>
            );
          })}
        </AnimatePresence>

        <Dock
          windows={windows}
          activeId={activeWindow?.id ?? null}
          onFocus={focusWindow}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <Presence />

        <Cursors />

        <ClippyColin
          openWindows={windows.map((w) => w.id)}
          hoveredIcon={hoveredIcon}
          onAsk={() => openWindow("ask")}
        />

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
        />
      </div>
    </>
  );
}
