import { Badge } from "@/components/ui/badge";
import { FAQ_GROUPS } from "@/components/landing/landingFaqs";
import { ENTERPRISE_QUESTION, ENTERPRISE_ANSWER } from "@/components/landing/enterpriseContent";
import FaqItem from "@/components/landing/FaqItem";
import FaqJsonLd from "@/components/landing/FaqJsonLd";

// The enterprise question is answered in its own section just above; the schema covers it too.
const SCHEMA_ITEMS = [
  { question: ENTERPRISE_QUESTION, answer: ENTERPRISE_ANSWER.join(" ") },
  ...FAQ_GROUPS.flatMap((group) => group.items).map(({ question, answer, facts = [] }) => ({
    question,
    answer: [answer, ...facts].join(" "),
  })),
];

export default function LandingFaqSection() {
  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 mb-4 text-xs font-medium px-4 py-1">
            FAQ
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Frequently asked questions</h2>
          <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto">
            Straight answers about FieldFlow Pro for trade, multi-company, and enterprise service businesses.
          </p>
        </div>
        <div className="space-y-12">
          {FAQ_GROUPS.map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-20">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-4">{group.title}</p>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <FaqItem key={item.question} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FaqJsonLd items={SCHEMA_ITEMS} />
    </section>
  );
}