import { Badge } from "@/components/ui/badge";
import { ENTERPRISE_QUESTION, ENTERPRISE_ANSWER } from "@/components/landing/enterpriseContent";
import EnterpriseFactsGrid from "@/components/landing/EnterpriseFactsGrid";
import EnterpriseComparisonTable from "@/components/landing/EnterpriseComparisonTable";

export default function EnterpriseAnswerSection() {
  return (
    <section id="enterprise" className="py-16 sm:py-24 bg-white scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 mb-4 text-xs font-medium px-4 py-1">
            For enterprises
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto">
            {ENTERPRISE_QUESTION}
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          {ENTERPRISE_ANSWER.map((paragraph, i) => (
            <p
              key={i}
              className={i === 0
                ? "text-base sm:text-lg text-slate-700 leading-relaxed"
                : "text-sm sm:text-base text-slate-500 leading-relaxed"}
            >
              {paragraph}
            </p>
          ))}
        </div>
        <EnterpriseFactsGrid />
        <EnterpriseComparisonTable />
      </div>
    </section>
  );
}