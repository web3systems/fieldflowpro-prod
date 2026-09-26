export default function WebsiteTemplateThumbnail({ template: t }) {
  const split = t.layout === 'split';
  return <div className="h-64 overflow-hidden" style={{ background: t.background, color: t.foreground, fontFamily: { sans: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' }[t.font] }}>
    <div className="flex items-center justify-between mx-4 py-3 text-[9px] border-b border-current/10"><strong className="tracking-wide">{t.business}</strong><span className="opacity-60">Services · About · Contact</span></div>
    <div className={split ? 'grid grid-cols-2 gap-3 items-center px-4 py-5' : 'px-4 pt-4'}>
      <div className={t.layout === 'center' ? 'text-center' : ''}><p className="text-[8px] uppercase tracking-[.18em] mb-2 opacity-60">Made for your everyday</p><h3 className={split ? 'text-lg font-semibold leading-tight' : 'text-lg font-semibold leading-tight max-w-64 mx-auto'}>{t.headline}</h3>{split && <p className="mt-2 text-[8px] leading-relaxed opacity-65">Thoughtful service for the place you call home.</p>}<span className="inline-block mt-3 rounded px-3 py-1.5 text-[8px]" style={{ background: t.primary, color: t.background }}>Explore services →</span></div>
      <img src={t.preview_image} alt={t.image_alt} loading="lazy" className={split ? 'w-full h-40 object-cover rounded-lg' : 'w-full h-28 object-cover rounded-lg mt-3'} />
    </div>
    {split && <div className="mx-4 flex gap-3 border-t border-current/10 pt-2 text-[8px] opacity-60">{t.sections.slice(1, 4).map(s => <span key={s}>{s}</span>)}</div>}
  </div>;
}