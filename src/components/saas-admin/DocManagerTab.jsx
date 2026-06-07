import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DocArticleEditor from "./DocArticleEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Pencil, Trash2, Eye, EyeOff,
  BookOpen, GripVertical, FileText, ChevronRight
} from "lucide-react";

const TAG_COLORS = {
  "All Users": "bg-blue-100 text-blue-700",
  "Managers & Admins": "bg-purple-100 text-purple-700",
  "Admins Only": "bg-red-100 text-red-700",
  "Customers": "bg-green-100 text-green-700",
};

const TYPE_COLORS = {
  guide: "bg-slate-100 text-slate-600",
  faq: "bg-amber-100 text-amber-700",
  reference: "bg-cyan-100 text-cyan-700",
  changelog: "bg-pink-100 text-pink-700",
};

export default function DocManagerTab() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null = list, "new" = new, article = edit
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadArticles(); }, []);

  async function loadArticles() {
    setLoading(true);
    try {
      const data = await base44.entities.DocArticle.list("sort_order", 200);
      setArticles(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(article) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    await base44.entities.DocArticle.delete(article.id);
    setArticles(prev => prev.filter(a => a.id !== article.id));
  }

  async function togglePublished(article) {
    await base44.entities.DocArticle.update(article.id, { is_published: !article.is_published });
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_published: !a.is_published } : a));
  }

  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    return !q || a.title?.toLowerCase().includes(q) || a.section_label?.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q);
  });

  // Group by section
  const grouped = filtered.reduce((acc, a) => {
    const key = a.section_label || a.section_id || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  if (editing !== null) {
    return (
      <div className="h-[calc(100vh-220px)] flex flex-col">
        <DocArticleEditor
          article={editing === "new" ? null : editing}
          onSave={() => { setEditing(null); loadArticles(); }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Documentation Articles</h3>
          <p className="text-sm text-slate-500">{articles.length} articles across {Object.keys(grouped).length} sections</p>
        </div>
        <Button onClick={() => setEditing("new")} className="gap-2">
          <Plus className="w-4 h-4" /> New Article
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="pl-9"
        />
      </div>

      {/* Article list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading articles...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">No articles yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "New Article" to create your first doc</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([section, sectionArticles]) => (
            <div key={section}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section}</h4>
                <span className="text-xs text-slate-300">({sectionArticles.length})</span>
              </div>
              <div className="space-y-2">
                {sectionArticles.map(article => (
                  <div
                    key={article.id}
                    className={`flex items-center gap-3 p-4 bg-white rounded-lg border transition-colors ${
                      article.is_published ? "border-slate-200" : "border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex-shrink-0 text-slate-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm truncate">{article.title}</span>
                        {!article.is_published && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Draft</span>
                        )}
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[article.article_type] || TYPE_COLORS.guide}`}>
                          {article.article_type}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[article.tag] || ""}`}>
                          {article.tag}
                        </span>
                      </div>
                      {article.summary && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{article.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePublished(article)}
                        title={article.is_published ? "Unpublish" : "Publish"}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {article.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditing(article)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}