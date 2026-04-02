import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, GitCommit, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORY_COLORS = {
  "New Features": "bg-green-100 text-green-800",
  "Improvements": "bg-blue-100 text-blue-800",
  "Bug Fixes": "bg-red-100 text-red-800",
  "Other": "bg-gray-100 text-gray-700",
};

export default function ReleaseNotes() {
  const [loading, setLoading] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState(null);
  const [commits, setCommits] = useState([]);
  const [showCommits, setShowCommits] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setReleaseNotes(null);
    const res = await base44.functions.invoke("getGithubReleaseNotes", { limit: 50 });
    if (res.data?.releaseNotes) {
      setReleaseNotes(res.data.releaseNotes);
      setCommits(res.data.commits || []);
    } else {
      setError(res.data?.error || "Failed to generate release notes.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            AI Release Notes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Generated from <code className="bg-slate-100 px-1 rounded">web3systems/fieldflowpro-prod</code></p>
        </div>
        <Button onClick={generate} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : "Generate Release Notes"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      {!releaseNotes && !loading && !error && (
        <div className="text-center py-20 text-slate-400">
          <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Click "Generate Release Notes" to fetch the latest commits and create AI-written release notes.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p>Fetching commits and generating release notes...</p>
        </div>
      )}

      {releaseNotes && (
        <div className="space-y-4">
          {/* Header */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900 text-lg">{releaseNotes.version}</p>
                  <p className="text-blue-600 text-sm">
                    Generated {new Date(releaseNotes.generated_at || Date.now()).toLocaleDateString()} · {releaseNotes.total_commits} commits analyzed
                  </p>
                </div>
                <Badge className="bg-blue-600 text-white">Latest</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          {releaseNotes.categories?.map((cat) => (
            <Card key={cat.name}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat.name] || "bg-gray-100 text-gray-700"}`}>
                    {cat.name}
                  </span>
                  <span className="text-slate-400 text-xs font-normal">{cat.items?.length} items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {cat.items?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-slate-400 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* Raw commits toggle */}
          <button
            onClick={() => setShowCommits(!showCommits)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mt-2"
          >
            {showCommits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showCommits ? "Hide" : "Show"} raw commits ({commits.length})
          </button>

          {showCommits && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {commits.map((c) => (
                    <div key={c.sha} className="flex items-start gap-3 text-sm py-1 border-b border-slate-100 last:border-0">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 flex-shrink-0 mt-0.5">{c.sha}</code>
                      <span className="text-slate-700 flex-1">{c.message}</span>
                      <span className="text-slate-400 text-xs flex-shrink-0">{c.date?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}