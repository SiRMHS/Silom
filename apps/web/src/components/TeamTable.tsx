"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteTeamMember } from "@rahyad/core";

/**
 * The roster as a table, with one portrait beside it.
 *
 * A studio's people are a list of facts — name, job, city — and a list of facts
 * is a table, not a grid of cards. The cards are already on /contact, where
 * each member gets a paragraph; here the point is the whole team at once, so
 * the rows stay one line each and the eye runs down a column instead of hopping
 * between tiles.
 *
 * The face is not lost in the trade: one portrait sits beside the table, pinned
 * while the rows scroll past it, showing whoever the pointer is on. So the page
 * is scannable as a list and still has people in it — the portrait is the
 * cursor's own commentary on the row under it.
 *
 * That portrait is decoration and is marked as such: it repeats the name the
 * row already prints, it only answers a pointer, and the table is complete
 * without it. Narrow screens, which have neither the width for a second column
 * nor a pointer to aim it with, drop it and put a thumbnail in each row
 * instead.
 */

/** A member's media as a still, a monogram, or a clip — `play` runs the clip. */
function Media({ m, play }: { m: SiteTeamMember; play: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  // A stack of portraits is a stack of decoders if they all run. Only the one
  // on show plays; the rest hold their first frame at no cost.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (play && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [play]);

  if (!m.image) return <span className="tteam-monogram">{m.monogram}</span>;

  return m.isVideo ? (
    <video ref={ref} className="tteam-media" src={m.image} muted loop playsInline preload="metadata" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="tteam-media" src={m.image} alt="" loading="lazy" decoding="async" />
  );
}

export default function TeamTable({
  team,
  label,
  columns,
}: {
  team: SiteTeamMember[];
  /** The small caption over the portrait — «تیم ما». */
  label: string;
  columns: { name: string; role: string; location: string };
}) {
  const [active, setActive] = useState(0);

  if (team.length === 0) return null;

  return (
    <section className="tteam" id="team" aria-labelledby="tteam-label">
      <div className="contact-shell tteam-shell">
        <div className="tteam-aside">
          <p className="tteam-label" id="tteam-label">
            {label}
          </p>
          {/* Stacked rather than swapped, so a change cross-fades instead of
              flashing an empty frame while the next file decodes. */}
          <div className="tteam-portrait" aria-hidden="true">
            {team.map((m, i) => (
              <span
                className="tteam-frame"
                key={m.id}
                data-on={i === active ? "" : undefined}
                style={{ ["--accent" as string]: m.accent }}
              >
                <Media m={m} play={i === active} />
              </span>
            ))}
          </div>
        </div>

        {/* Narrow screens take the table apart into two-line rows, and a
            `display` other than `table-*` is enough to cost a table its role in
            most browsers. Every role is therefore written out, so the markup
            keeps meaning whatever the stylesheet does to the boxes. */}
        <table className="tteam-table" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                {columns.name}
              </th>
              <th scope="col" role="columnheader">
                {columns.role}
              </th>
              <th scope="col" role="columnheader">
                {columns.location}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {team.map((m, i) => (
              <tr
                className="tteam-row"
                key={m.id}
                role="row"
                data-on={i === active ? "" : undefined}
                style={{ ["--accent" as string]: m.accent }}
                onMouseEnter={() => setActive(i)}
              >
                <th scope="row" role="rowheader">
                  <span className="tteam-thumb" aria-hidden="true">
                    <Media m={m} play={false} />
                  </span>
                  <span className="tteam-dot" aria-hidden="true" />
                  <span className="tteam-name">{m.name}</span>
                </th>
                <td className="tteam-role" role="cell">
                  {m.role}
                </td>
                {/* An unfilled city still gets a cell, so the columns hold */}
                <td className="tteam-loc" role="cell">
                  {m.location || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
