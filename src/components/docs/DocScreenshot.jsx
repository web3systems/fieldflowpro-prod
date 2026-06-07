import { Monitor, Camera } from "lucide-react";

/**
 * A placeholder screenshot callout.
 * Replace `placeholderText` with an actual <img src="..." /> once you have real screenshots.
 */
export default function DocScreenshot({ caption, placeholderText, hint }) {
  return (
    <div className="my-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <Camera className="w-3 h-3" /> Screenshot
        </p>
        <p className="text-sm font-medium text-slate-600">{placeholderText}</p>
        {hint && <p className="text-xs text-slate-400 italic max-w-xs">{hint}</p>}
      </div>
      {caption && (
        <div className="border-t border-slate-200 bg-white px-4 py-2 text-center">
          <p className="text-xs text-slate-500 italic">{caption}</p>
        </div>
      )}
    </div>
  );
}