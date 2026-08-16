import type { Faq } from "@rahyad/core/faq";

/**
 * Frequently asked questions, shared by case studies and magazine articles.
 *
 * Built on <details>/<summary> rather than React state: it opens with no
 * JavaScript, it is keyboard operable and screen-reader announced for free, and
 * the browser's own find-in-page can reach a closed answer.
 *
 * The same questions are also emitted as FAQPage JSON-LD, which is what lets a
 * search result show them directly. Both come from one array, so the markup and
 * the structured data can never drift apart.
 */
export default function FaqSection({
  faqs,
  className = "",
  title = "سوالات متداول",
}: {
  faqs: Faq[];
  className?: string;
  title?: string;
}) {
  if (faqs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className={`faq ${className}`.trim()} aria-labelledby="faq-heading">
      <h2 className="faq-title" id="faq-heading">
        {title}
      </h2>

      <div className="faq-list">
        {faqs.map((f, i) => (
          <details className="faq-item" key={`${i}-${f.q}`}>
            <summary className="faq-q">
              <span className="faq-q-text">{f.q}</span>
              <span className="faq-q-mark" aria-hidden="true" />
            </summary>
            {/* Answers are plain text from the panel, rendered as text */}
            <p className="faq-a">{f.a}</p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        // Serialised, not interpolated: the questions are editor input, and a
        // stray </script> in one of them would otherwise close this tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </section>
  );
}
