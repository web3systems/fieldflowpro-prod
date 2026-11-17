import { CheckCircle } from "lucide-react";

// Facts are written as "Label: detail" so the label can be emphasized.
function FactText({ fact }) {
  const splitAt = fact.indexOf(": ");
  if (splitAt === -1) return <span>{fact}</span>;
  return (
    <span>
      <strong className="font-semibold text-slate-800">{fact.slice(0, splitAt)}:</strong> {fact.slice(splitAt + 2)}
    </span>
  );
}

export default function FaqItem({ question, answer, facts }) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7">
      <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-2">{question}</h3>
      <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{answer}</p>
      {facts?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {facts.map((fact) => (
            <li key={fact} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <FactText fact={fact} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}