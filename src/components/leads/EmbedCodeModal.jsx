import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function EmbedCodeModal({ open, onClose, company }) {
  const [copied, setCopied] = useState(null);

  if (!company) return null;

  const baseUrl = window.location.origin;
  const leadUrl = `${baseUrl}/LeadCapture?company_id=${company.id}`;
  const color = company.primary_color || "#1e40af";

  const buttonCode = `<!-- ${company.name} Lead Capture Button -->
<a href="${leadUrl}" target="_blank" style="
  display: inline-block;
  background-color: ${color};
  color: white;
  padding: 14px 28px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  font-family: sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
">
  Get a Free Quote
</a>`;

  const iframeCode = `<!-- ${company.name} Lead Capture Form Embed -->
<iframe
  src="${leadUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"
></iframe>`;

  const linkCode = leadUrl;

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lead Capture Embed Code — {company.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Choose how you'd like to add a lead capture form to your website. All submissions will appear automatically in your Leads pipeline.
          </p>

          <Tabs defaultValue="button">
            <TabsList className="w-full">
              <TabsTrigger value="button" className="flex-1">Button Link</TabsTrigger>
              <TabsTrigger value="iframe" className="flex-1">Embed Form</TabsTrigger>
              <TabsTrigger value="url" className="flex-1">Direct URL</TabsTrigger>
            </TabsList>

            <TabsContent value="button" className="space-y-3 mt-4">
              <p className="text-sm text-slate-600">Paste this HTML where you want the button to appear on your website.</p>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{buttonCode}</pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(buttonCode, "button")}
                >
                  {copied === "button" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "button" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview:</p>
                <a
                  href={leadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 rounded-lg text-white font-semibold text-sm"
                  style={{ backgroundColor: color }}
                >
                  Get a Free Quote
                </a>
              </div>
            </TabsContent>

            <TabsContent value="iframe" className="space-y-3 mt-4">
              <p className="text-sm text-slate-600">Embed the full form directly on your page using this iframe code.</p>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{iframeCode}</pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(iframeCode, "iframe")}
                >
                  {copied === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "iframe" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-4">
              <p className="text-sm text-slate-600">Share this direct link via email, social media, or anywhere online.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-mono overflow-x-auto">
                  {linkCode}
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(linkCode, "url")}
                  className="flex-shrink-0"
                >
                  {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === "url" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={leadUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Preview Form
                </a>
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}