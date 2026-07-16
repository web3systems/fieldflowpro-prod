import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";
import { format, parseISO } from "date-fns";

const TYPE_COLORS = {
  guide: "bg-slate-100 text-slate-700",
  faq: "bg-amber-100 text-amber-700",
  reference: "bg-cyan-100 text-cyan-700",
  changelog: "bg-pink-100 text-pink-700",
};

function dateLabel(article) {
  const d = article.published_date || article.created_date;
  try {
    return d ? format(parseISO(d), "MMM d, yyyy") : "";
  } catch {
    return "";
  }
}

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    base44.entities.DocArticle.filter({ id })
      .then(res => setArticle(Array.isArray(res) ? res[0] || null : null))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-4 pt-20">
        <Newspaper className="w-10 h-10 text-slate-300" />
        <p>Article not found or not published.</p>
        <button onClick={() => navigate("/Articles")} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Back to Articles
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-24 lg:pb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/Articles")} className="gap-1 text-slate-500 mb-5">
        <ArrowLeft className="w-4 h-4" /> Articles
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[article.article_type] || TYPE_COLORS.guide}`}>
            {article.article_type}
          </span>
          {article.section_label && (
            <span className="text-xs text-slate-400">{article.section_label}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">{article.title}</h1>
        {article.summary && <p className="text-lg text-slate-500 mt-2">{article.summary}</p>}
        <div className="flex items-center gap-1 text-sm text-slate-400 mt-4">
          <Calendar className="w-3.5 h-3.5" /> {dateLabel(article)}
        </div>
      </div>

      {/* Hero image */}
      {article.featured_image_url && (
        <div className="rounded-xl overflow-hidden mb-6 bg-slate-100">
          <img src={article.featured_image_url} alt={article.title} className="w-full max-h-96 object-cover" onError={e => { e.target.parentElement.style.display = "none"; }} />
        </div>
      )}

      {/* Body */}
      <div
        className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-a:text-blue-600 prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: article.body_html || "" }}
      />

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("/Articles")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Button>
      </div>
    </div>
  );
}