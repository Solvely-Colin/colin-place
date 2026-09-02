import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionProps {
  id: string;
  index: string;
  title: ReactNode;
  kicker?: string;
  blurb?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Key the wrongness engine may rewrite this title under. */
  mutKey?: string;
  mutBlurbKey?: string;
}

export function Section({ id, index, title, kicker, blurb, children, className = "", mutKey, mutBlurbKey }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 border-t border-line ${className}`}>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="section-head grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 lg:gap-12 items-end mb-10 sm:mb-14">
            <div>
              <p className="eyebrow mb-4">
                <span className="text-loop" data-section-index={index}>{index}</span>
                {kicker ? <span> / <span data-mut={`kicker-${id}`}>{kicker}</span></span> : null}
              </p>
              <h2 className="display text-[clamp(2rem,4.6vw,3.75rem)] text-ink" data-mut={mutKey}>{title}</h2>
            </div>
            {blurb ? <p className="text-ink-dim text-base leading-relaxed max-w-xl lg:justify-self-end" data-mut={mutBlurbKey}>{blurb}</p> : null}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}
