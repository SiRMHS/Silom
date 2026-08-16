/**
 * Split an element's text into one clipping box per rendered line.
 *
 * This is the piece GSAP's SplitText would normally do, rewritten because its
 * line detection cannot see a line break in Persian. It decides a word starts a
 * new line by comparing horizontal offsets — a word is on a new line when it
 * begins to the left of where the last one ended — which only holds when text
 * runs left to right. In an RTL paragraph every wrapped line begins on the
 * right, so the test never fires and the whole paragraph comes back as a single
 * line.
 *
 * Grouping by vertical offset instead is direction-agnostic: a word is on a new
 * line when it sits lower than the line being built, which is true in both
 * directions and in a paragraph that mixes them.
 *
 * The output is what a masked line reveal needs — each line wrapped in a box
 * that clips, holding a block that can be moved through it:
 *
 *   <div class="{maskClass}"><div class="{lineClass}">…</div></div>
 *
 * Lines are re-measured, not tracked: text that reflows has to be split again,
 * which is what `revert()` then a second `splitLines()` is for.
 */

export type LineSplit = {
  /** The movable block inside each mask, in reading order. */
  lines: HTMLElement[];
  /** Puts the element's original markup back. */
  revert: () => void;
};

/** Same line if the tops agree within a pixel — enough for sub-pixel drift. */
const SAME_LINE_PX = 1.5;

export function splitLines(
  el: HTMLElement,
  { maskClass, lineClass }: { maskClass: string; lineClass: string },
): LineSplit {
  const original = el.innerHTML;
  const revert = () => {
    el.innerHTML = original;
  };

  const text = el.textContent ?? "";
  if (!text.trim()) return { lines: [], revert };

  // 1 — every word in a span of its own, so each has a box to measure. Splitting
  //     on whitespace only: a zero-width non-joiner is not whitespace, so
  //     «می‌گویند» stays one word rather than becoming two.
  const probes: HTMLSpanElement[] = [];
  const frag = document.createDocumentFragment();

  for (const piece of text.split(/(\s+)/)) {
    if (!piece) continue;
    if (/^\s+$/.test(piece)) {
      frag.appendChild(document.createTextNode(piece));
      continue;
    }
    const probe = document.createElement("span");
    probe.textContent = piece;
    probes.push(probe);
    frag.appendChild(probe);
  }

  el.textContent = "";
  el.appendChild(frag);

  // 2 — group the words by the row each one landed on
  const rows: string[][] = [];
  let rowTop: number | null = null;

  for (const probe of probes) {
    const top = probe.getBoundingClientRect().top;
    if (rowTop === null || Math.abs(top - rowTop) > SAME_LINE_PX) {
      rows.push([]);
      rowTop = top;
    }
    rows[rows.length - 1].push(probe.textContent ?? "");
  }

  // 3 — rebuild as masks. Written straight onto the element rather than around
  //     the probes, so nothing is left of the measuring pass.
  el.textContent = "";
  const lines: HTMLElement[] = [];

  for (const words of rows) {
    const mask = document.createElement("div");
    mask.className = maskClass;

    const line = document.createElement("div");
    line.className = lineClass;
    line.textContent = words.join(" ");

    mask.appendChild(line);
    el.appendChild(mask);
    lines.push(line);
  }

  return { lines, revert };
}
