"use client";

export default function ScrollCue() {
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <a href="#about" className="scroll-cue" onClick={go} aria-label="رفتن به محتوا">
      <span className="scroll-cue-text">اسکرول</span>
      <span className="scroll-cue-track" aria-hidden="true">
        <span className="scroll-cue-dot" />
      </span>
    </a>
  );
}
