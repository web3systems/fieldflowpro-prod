import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink } from "lucide-react";

function EmbedSection({ label, url, color, buttonLabel, iframeHeight = 700, copied, onCopy }) {
  const buttonCode = `<a href="${url}" target="_blank" style="display:inline-block;background-color:${color};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.15);">${buttonLabel}</a>`;
  const iframeCode = `<iframe src="${url}" width="100%" height="${iframeHeight}" frameborder="0" style="border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);"></iframe>`;

  return (
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
          <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => onCopy(buttonCode, `${label}-button`)}>
            {copied === `${label}-button` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === `${label}-button` ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-2 font-medium">Preview:</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-lg text-white font-semibold text-sm" style={{ backgroundColor: color }}>
            {buttonLabel}
          </a>
        </div>
      </TabsContent>

      <TabsContent value="iframe" className="space-y-3 mt-4">
        <p className="text-sm text-slate-600">Embed the full form directly on your page using this iframe code.</p>
        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{iframeCode}</pre>
          <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => onCopy(iframeCode, `${label}-iframe`)}>
            {copied === `${label}-iframe` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === `${label}-iframe` ? "Copied!" : "Copy"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="url" className="space-y-3 mt-4">
        <p className="text-sm text-slate-600">Share this direct link via email, social media, or anywhere online.</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-100 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-mono overflow-x-auto">{url}</div>
          <Button variant="outline" onClick={() => onCopy(url, `${label}-url`)} className="flex-shrink-0">
            {copied === `${label}-url` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied === `${label}-url` ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
        </Button>
      </TabsContent>
    </Tabs>
  );
}

export default function EmbedCodeModal({ open, onClose, company }) {
  const [copied, setCopied] = useState(null);
  const [activeSection, setActiveSection] = useState("quote");

  if (!company) return null;

  const baseUrl = window.location.origin;
  const color = company.primary_color || "#1e40af";
  const leadUrl = `${baseUrl}/LeadCapture?company_id=${company.id}`;
  const bookingUrl = `${baseUrl}/Booking?company_id=${company.id}`;

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed Code — {company.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Add forms or buttons to your website. Choose a form type below to get the embed code.
          </p>

          {/* Section selector */}
          <div className="flex gap-2 border-b border-slate-200 pb-0">
            <button
              onClick={() => setActiveSection("quote")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeSection === "quote" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Get a Quote
            </button>
            <button
              onClick={() => setActiveSection("booking")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeSection === "booking" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Book Online
            </button>
          </div>

          {activeSection === "quote" && (
            <EmbedSection
              label="quote"
              url={leadUrl}
              color={color}
              buttonLabel="Get a Free Quote"
              iframeHeight={700}
              copied={copied}
              onCopy={copyToClipboard}
            />
          )}

          {activeSection === "booking" && (
            <EmbedSection
              label="booking"
              url={bookingUrl}
              color={color}
              buttonLabel="Book Online"
              iframeHeight={800}
              copied={copied}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}