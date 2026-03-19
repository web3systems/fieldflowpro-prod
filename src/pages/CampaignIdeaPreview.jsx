import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function CampaignIdeaPreview() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) { setError("No idea ID provided."); setLoading(false); return; }
    base44.entities.CampaignIdea.filter({ id })
      .then(results => {
        const idea = results[0];
        if (!idea) { setError("Campaign idea not found."); return; }
        setHtml(idea.html_content || "<p>No HTML content added yet.</p>");
      })
      .catch(() => setError("Failed to load campaign idea."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-red-500 text-lg">{error}</div>
  );

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}