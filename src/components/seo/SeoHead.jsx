import { useEffect } from "react";

/**
 * Injects SEO meta tags, analytics scripts, and JSON-LD schema
 * dynamically based on the active company's seo_settings.
 */
export default function SeoHead({ company }) {
  const seo = company?.seo_settings || {};

  useEffect(() => {
    if (!company) return;

    // --- Meta Title ---
    if (seo.meta_title) {
      document.title = seo.meta_title;
    }

    // Helper: upsert a <meta> tag
    function setMeta(name, content, attr = "name") {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    // Helper: upsert a <link> tag
    function setLink(rel, href) {
      if (!href) return;
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    }

    // Helper: inject a script once (by id)
    function injectScript(id, src, async = true) {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.src = src;
      if (async) s.async = true;
      document.head.appendChild(s);
    }

    // Helper: inject inline script once (by id)
    function injectInlineScript(id, code) {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.innerHTML = code;
      document.head.appendChild(s);
    }

    // Helper: inject <noscript> once (by id)
    function injectNoscript(id, html) {
      if (document.getElementById(id)) return;
      const ns = document.createElement("noscript");
      ns.id = id;
      ns.innerHTML = html;
      document.body.insertBefore(ns, document.body.firstChild);
    }

    // --- SEO Meta Tags ---
    setMeta("description", seo.meta_description);
    setMeta("keywords", seo.meta_keywords);
    if (seo.google_search_console_verification) {
      setMeta("google-site-verification", seo.google_search_console_verification);
    }

    // --- Canonical URL ---
    setLink("canonical", seo.canonical_url);

    // --- Open Graph ---
    const ogTitle = seo.og_title || seo.meta_title || company.name;
    const ogDesc = seo.og_description || seo.meta_description || "";
    setMeta("og:type", "website", "property");
    setMeta("og:title", ogTitle, "property");
    setMeta("og:description", ogDesc, "property");
    setMeta("og:image", seo.og_image_url, "property");
    setMeta("og:url", seo.canonical_url || window.location.origin, "property");

    // --- Twitter Card ---
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", ogTitle);
    setMeta("twitter:description", ogDesc);
    setMeta("twitter:image", seo.og_image_url);

    // --- Google Analytics 4 ---
    if (seo.google_analytics_id) {
      injectScript(
        "ga4-script",
        `https://www.googletagmanager.com/gtag/js?id=${seo.google_analytics_id}`
      );
      injectInlineScript(
        "ga4-init",
        `window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${seo.google_analytics_id}', { anonymize_ip: true });`
      );
    }

    // --- Google Tag Manager ---
    if (seo.google_tag_manager_id) {
      injectInlineScript(
        "gtm-script",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${seo.google_tag_manager_id}');`
      );
      injectNoscript(
        "gtm-noscript",
        `<iframe src="https://www.googletagmanager.com/ns.html?id=${seo.google_tag_manager_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
      );
    }

    // --- Facebook Pixel ---
    if (seo.facebook_pixel_id) {
      injectInlineScript(
        "fb-pixel",
        `!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${seo.facebook_pixel_id}');
        fbq('track', 'PageView');`
      );
      injectNoscript(
        "fb-pixel-noscript",
        `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${seo.facebook_pixel_id}&ev=PageView&noscript=1"/>`
      );
    }

    // --- Bing UET ---
    if (seo.bing_uet_id) {
      injectInlineScript(
        "bing-uet",
        `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${seo.bing_uet_id}",enableAutoSpaTracking:true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`
      );
    }

    // --- JSON-LD Structured Data ---
    if (seo.schema_enabled !== false) {
      const existingSchema = document.getElementById("jsonld-localbusiness");
      if (existingSchema) existingSchema.remove();

      const schemaType = seo.schema_type || "LocalBusiness";
      const schema = {
        "@context": "https://schema.org",
        "@type": schemaType,
        "name": company.name,
        "telephone": company.phone || undefined,
        "email": company.email || undefined,
        "url": seo.canonical_url || company.website || undefined,
        "logo": company.logo_url || undefined,
        "description": seo.meta_description || undefined,
        "address": (company.address || company.city) ? {
          "@type": "PostalAddress",
          "streetAddress": company.address || undefined,
          "addressLocality": company.city || undefined,
          "addressRegion": company.state || undefined,
          "postalCode": company.zip || undefined,
          "addressCountry": "US"
        } : undefined,
        "sameAs": company.google_review_url ? [company.google_review_url] : undefined,
      };
      // Strip undefined values
      const cleanSchema = JSON.parse(JSON.stringify(schema));
      const s = document.createElement("script");
      s.id = "jsonld-localbusiness";
      s.type = "application/ld+json";
      s.innerHTML = JSON.stringify(cleanSchema, null, 2);
      document.head.appendChild(s);
    }

  }, [company?.id, JSON.stringify(seo)]);

  return null;
}