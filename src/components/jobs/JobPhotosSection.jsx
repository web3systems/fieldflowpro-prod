import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, Trash2, ChevronDown, ChevronUp, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function PhotoGrid({ photos, onDelete, readOnly }) {
  const [lightbox, setLightbox] = useState(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
        <ImageIcon className="w-8 h-8 mb-1" />
        <p className="text-xs">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
            <img
              src={url}
              alt={`photo-${i}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightbox(url)}
            />
            {!readOnly && (
              <button
                onClick={() => onDelete(i)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="preview" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </>
  );
}

function UploadButton({ onUpload, uploading }) {
  const ref = useRef();

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      await onUpload(file);
    }
    e.target.value = "";
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs"
        disabled={uploading}
        onClick={() => ref.current?.click()}
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? "Uploading..." : "Add Photos"}
      </Button>
    </>
  );
}

export default function JobPhotosSection({ job, onPhotosUpdated }) {
  const [expanded, setExpanded] = useState(true);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const beforePhotos = job?.before_photos || [];
  const afterPhotos = job?.after_photos || [];

  async function uploadPhoto(file, type) {
    const setter = type === "before" ? setUploadingBefore : setUploadingAfter;
    setter(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const current = type === "before" ? beforePhotos : afterPhotos;
    const updated = [...current, file_url];
    const field = type === "before" ? "before_photos" : "after_photos";
    await base44.entities.Job.update(job.id, { [field]: updated });
    if (onPhotosUpdated) onPhotosUpdated(field, updated);
    setter(false);
  }

  async function deletePhoto(type, idx) {
    const current = type === "before" ? [...beforePhotos] : [...afterPhotos];
    current.splice(idx, 1);
    const field = type === "before" ? "before_photos" : "after_photos";
    await base44.entities.Job.update(job.id, { [field]: current });
    if (onPhotosUpdated) onPhotosUpdated(field, current);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-slate-800">Before & After Photos</h3>
          <span className="text-xs text-slate-400">
            ({beforePhotos.length} before · {afterPhotos.length} after)
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Before
              </h4>
              <UploadButton onUpload={f => uploadPhoto(f, "before")} uploading={uploadingBefore} />
            </div>
            <PhotoGrid
              photos={beforePhotos}
              onDelete={i => deletePhoto("before", i)}
            />
          </div>

          {/* After */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                After
              </h4>
              <UploadButton onUpload={f => uploadPhoto(f, "after")} uploading={uploadingAfter} />
            </div>
            <PhotoGrid
              photos={afterPhotos}
              onDelete={i => deletePhoto("after", i)}
            />
          </div>
        </div>
      )}
    </div>
  );
}