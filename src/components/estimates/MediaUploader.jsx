import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Video, Upload, X, Image, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MediaUploader({ onMediaUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [showCameraMode, setShowCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const recordedChunksRef = useRef([]);

  async function uploadFile(file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const entry = {
      url: file_url,
      name: file.name || "capture",
      type: file.type?.startsWith("video") ? "video" : "image",
    };
    setUploadedFiles(prev => [...prev, entry]);
    onMediaUploaded(entry);
    setUploading(false);
    return file_url;
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(f => uploadFile(f));
    e.target.value = "";
  }

  async function startCamera(mode) {
    setShowCameraMode(mode);
    const constraints = {
      video: { facingMode: "environment" },
      audio: mode === "video",
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setCameraStream(stream);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    }, 100);
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (recording) stopRecording();
    setShowCameraMode(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadFile(file);
    }, "image/jpeg", 0.9);
  }

  function startRecording() {
    recordedChunksRef.current = [];
    const rec = new MediaRecorder(cameraStream, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" });
      await uploadFile(file);
    };
    rec.start();
    setMediaRecorder(rec);
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    setRecording(false);
  }

  function removeFile(idx) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
      {/* Camera/Video Modal */}
      {showCameraMode && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} className="w-full max-w-lg rounded-lg" playsInline muted={showCameraMode !== "video"} />
          <div className="flex gap-4 mt-6">
            {showCameraMode === "photo" ? (
              <Button onClick={capturePhoto} className="bg-white text-black hover:bg-slate-100 gap-2 px-6">
                <Camera className="w-5 h-5" /> Take Photo
              </Button>
            ) : recording ? (
              <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 gap-2 px-6 animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full" /> Stop Recording
              </Button>
            ) : (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 gap-2 px-6">
                <Video className="w-5 h-5" /> Start Recording
              </Button>
            )}
            <Button onClick={stopCamera} variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-white mt-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      )}

      {/* Uploaded files preview */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {uploadedFiles.map((f, i) => (
            <div key={i} className="relative group">
              {f.type === "image" ? (
                <img src={f.url} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="w-14 h-14 bg-slate-700 rounded-lg border border-slate-300 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="w-14 h-14 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-400 mr-1">Add media:</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 text-xs h-8"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startCamera("photo")}
          disabled={uploading}
          className="gap-1.5 text-xs h-8"
        >
          <Camera className="w-3.5 h-3.5" /> Camera
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startCamera("video")}
          disabled={uploading}
          className="gap-1.5 text-xs h-8"
        >
          <Video className="w-3.5 h-3.5" /> Video
        </Button>
        {uploadedFiles.length > 0 && (
          <span className="ml-auto text-xs text-purple-600 font-medium flex items-center gap-1">
            <Image className="w-3 h-3" /> {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} attached
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}