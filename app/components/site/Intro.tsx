import { lemniscatePath } from "../../lib/loop";

const PATH = lemniscatePath(46, 60, 30, 200);

// A 1.5-second curtain: the ∞ draws itself, "feeling loopy" fades up, the
// curtain lifts. Pure CSS, so it never depends on hydration. The inline
// script runs before paint and hides it on repeat visits in a session;
// the stylesheet hides it for anyone who asked for reduced motion.
const ONCE_PER_SESSION = `try{if(sessionStorage.getItem("cp:intro")){document.documentElement.classList.add("intro-seen")}else{sessionStorage.setItem("cp:intro","1")}}catch(e){}`;

export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE_PER_SESSION }} />
      <div className="intro" aria-hidden>
        <div className="flex flex-col items-center gap-5">
          <svg viewBox="0 0 120 60" className="w-[min(60vw,360px)] h-auto overflow-visible">
            <path
              d={PATH}
              className="intro-path"
              pathLength={1}
              fill="none"
              stroke="#2b45ff"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="intro-word eyebrow !text-ink">feeling loopy</p>
        </div>
      </div>
    </>
  );
}
