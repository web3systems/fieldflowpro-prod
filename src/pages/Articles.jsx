import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Newspaper, Search, Calendar, ArrowRight } from "lucide-react";
import PublicArticlesHeader from "@/components/articles/PublicArticlesHeader";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";

const TYPE_COLORS = {
  guide: "bg-slate-100 text-slate-700",
  faq: "bg-amber-100 text-amber-700",
  reference: "bg-cyan-100 text-cyan-700",
  changelog: "bg-pink-100 text-pink-700",
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "guide", label: "Guides" },
  { value: "faq", label: "FAQ" },
  { value: "reference", label: "Reference" },
  { value: "changelog", label: "Changelog" },
];

function dateLabel(article) {
  const d = article.published_date || article.created_date;
  try {
    return d ? format(parseISO(d), "MMM d, yyyy") : "";
  } catch {
    return "";
  }
}

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.DocArticle.list("-published_date", 80)
      .then(data => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = articles.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.title?.toLowerCase().includes(q) && !a.summary?.toLowerCase().includes(q) && !a.section_label?.toLowerCase().includes(q)) return false;
    }
    if (typeFilter !== "all" && a.article_type !== typeFilter) return false;
    return true;
  });

  return (
    <>
    <PublicArticlesHeader />
    <div className="p-4 md:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto">
      {/* Header */}
        <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
          <Newspaper className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Articles & Insights</h1>
          <p className="text-sm text-slate-500">Guides, tips, and product updates for field service teams</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                typeFilter === f.value
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading articles...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No articles found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(article => {
            const img = article.featured_image_url;
            return (
              <button
                key={article.id}
                onClick={() => navigate(`/ArticleDetail/${article.id}`)}
                className="group text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
              >
                <div className="h-40 w-full overflow-hidden bg-slate-100 flex-shrink-0">
                  {img ? (
                    <img src={img} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                      <Newspaper className="w-8 h-8 text-blue-400" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[article.article_type] || TYPE_COLORS.guide}`}>
                      {article.article_type}
                    </span>
                    {article.section_label && (
                      <span className="text-xs text-slate-400">{article.section_label}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{article.summary}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" /> {dateLabel(article)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}