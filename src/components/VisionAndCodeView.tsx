import React, { useRef, useState } from "react";
import {
  Camera,
  Code2,
  FileCode,
  FilePlus,
  Monitor,
  Play,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { JarvisFile } from "../types/jarvis";

interface VisionAndCodeViewProps {
  files: JarvisFile[];
  onSaveFile: (file: { id?: string; name: string; content: string; type?: string }) => Promise<void>;
  onDeleteFile: (file: JarvisFile) => Promise<void>;
  onAnalyzeVision: (imageBase64: string, mimeType: string, prompt: string) => Promise<string>;
  onRunCommandPrompt: (prompt: string) => Promise<void>;
}

export const VisionAndCodeView: React.FC<VisionAndCodeViewProps> = ({
  files,
  onSaveFile,
  onDeleteFile,
  onAnalyzeVision,
  onRunCommandPrompt,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || "");
  const [editorName, setEditorName] = useState<string>(files[0]?.name || "scripts/jarvis_agent.py");
  const [editorContent, setEditorContent] = useState<string>(files[0]?.content || "");
  const [devTaskPrompt, setDevTaskPrompt] = useState<string>("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // Vision processor state
  const [visionPreviewUrl, setVisionPreviewUrl] = useState<string | null>(null);
  const [visionBase64, setVisionBase64] = useState<string>("");
  const [visionMime, setVisionMime] = useState<string>("image/png");
  const [visionPrompt, setVisionPrompt] = useState<string>(
    "Inspect this frame as Jarvis. Summarize all visible UI, text, or code issues and suggest next steps."
  );
  const [visionResult, setVisionResult] = useState<string>("");
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectFile = (f: JarvisFile) => {
    setSelectedFileId(f.id);
    setEditorName(f.name);
    setEditorContent(f.content);
  };

  const handleNewFile = () => {
    setSelectedFileId("");
    setEditorName(`scripts/module_${Date.now().toString().slice(-3)}.py`);
    setEditorContent(`# Jarvis Custom Script\n\ndef main():\n    print("Jarvis Subsystem Initialized")\n\nif __name__ == "__main__":\n    main()\n`);
  };

  const handleSave = async () => {
    await onSaveFile({
      id: selectedFileId || undefined,
      name: editorName,
      content: editorContent,
      type: editorName.endsWith(".md") ? "markdown" : "code",
    });
    setSaveMessage("Saved to Jarvis workspace");
    setTimeout(() => setSaveMessage(""), 2500);
  };

  const handleSynthesizeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devTaskPrompt.trim()) return;
    setIsGeneratingCode(true);
    try {
      await onRunCommandPrompt(
        `Use code_helper to write clean, production-ready code for: ${devTaskPrompt}. Save it and show me the implementation.`
      );
      setDevTaskPrompt("");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setVisionPreviewUrl(dataUrl);
      const base64 = dataUrl.split(",")[1] || "";
      setVisionBase64(base64);
      setVisionMime(file.type || "image/png");
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setVisionPreviewUrl(dataUrl);
        setVisionBase64(dataUrl.split(",")[1] || "");
        setVisionMime("image/png");
      }
      track.stop();
    } catch (err) {
      console.error("Screen capture cancelled or disallowed:", err);
    }
  };

  const handleToggleCamera = async () => {
    if (cameraActive && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const handleSnapWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setVisionPreviewUrl(dataUrl);
      setVisionBase64(dataUrl.split(",")[1] || "");
      setVisionMime("image/png");
    }
    if (videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    setCameraActive(false);
  };

  const handleRunVision = async () => {
    if (!visionBase64) return;
    setIsAnalyzingVision(true);
    try {
      const res = await onAnalyzeVision(visionBase64, visionMime, visionPrompt);
      setVisionResult(res);
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Cols: Dev Agent, Code Helper & File Controller (actions/code_helper.py, dev_agent.py, file_controller.py) */}
      <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Dev Agent & Workspace File Controller</h2>
            <p className="text-xs text-slate-400">
              actions/dev_agent.py · actions/code_helper.py · actions/file_controller.py
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <FilePlus className="w-3.5 h-3.5 text-sky-400" />
              New File
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Save File
            </button>
          </div>
        </div>

        {/* Autonomous Dev Agent Prompt Bar */}
        <form onSubmit={handleSynthesizeCode} className="flex gap-2">
          <input
            type="text"
            value={devTaskPrompt}
            onChange={(e) => setDevTaskPrompt(e.target.value)}
            placeholder="Ask Jarvis Dev Agent to generate or refactor code (e.g. 'Write a Python port scanner or FastAPI server')..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-950/90 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={isGeneratingCode || !devTaskPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5" />
            {isGeneratingCode ? "Synthesizing..." : "Run Dev Agent"}
          </button>
        </form>

        {/* Workspace Files List + Code Editor */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-[360px]">
          <div className="md:col-span-4 border-r border-slate-800/80 pr-3 flex flex-col gap-1.5 overflow-y-auto max-h-[380px]">
            <div className="text-xs font-medium text-slate-400 mb-1">Workspace Files ({files.length})</div>
            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => selectFile(f)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  selectedFileId === f.id
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span className="truncate font-mono">{f.name}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(f);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-opacity"
                  title="Delete file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="md:col-span-8 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-sky-300 w-64 focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center gap-2">
                {saveMessage && <span className="text-xs text-emerald-400">{saveMessage}</span>}
                <button
                  type="button"
                  onClick={() =>
                    onRunCommandPrompt(
                      `Analyze and summarize the file "${editorName}" with content:\n\`\`\`\n${editorContent.slice(0, 1200)}\n\`\`\``
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/30 rounded hover:bg-sky-900/50 transition-colors whitespace-nowrap"
                >
                  <Play className="w-3 h-3" />
                  Inspect with Jarvis
                </button>
              </div>
            </div>

            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full flex-1 p-3.5 text-xs font-mono leading-relaxed bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Screen & Vision Processor (actions/screen_processor.py) */}
      <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Screen & Multimodal Vision Processor</h2>
          <p className="text-xs text-slate-400">
            actions/screen_processor.py · Capture screen, webcam, or upload screenshot for Gemini Vision
          </p>
        </div>

        {/* Capture Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCaptureScreen}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            Capture Screen
          </button>

          <button
            type="button"
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            {cameraActive ? "Stop Webcam" : "Live Webcam"}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            Upload Frame
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileUpload}
            className="hidden"
          />
        </div>

        {/* Preview Box */}
        <div className="relative flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg min-h-[200px] overflow-hidden">
          {cameraActive ? (
            <div className="relative w-full h-full flex flex-col items-center">
              <video ref={videoRef} className="w-full max-h-[220px] object-contain" muted playsInline />
              <button
                type="button"
                onClick={handleSnapWebcam}
                className="mt-2 mb-2 px-4 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
              >
                Snap Frame for Analysis
              </button>
            </div>
          ) : visionPreviewUrl ? (
            <img
              src={visionPreviewUrl}
              alt="Captured visual frame for JARVIS inspection"
              referrerPolicy="no-referrer"
              className="max-h-[220px] w-auto object-contain"
            />
          ) : (
            <div className="text-center p-6">
              <Monitor className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                No visual frame loaded. Capture your display, snap a webcam frame, or upload a screenshot.
              </p>
            </div>
          )}
        </div>

        {/* Vision Prompt & Execute */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-300">Visual Inspection Directive</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={visionPrompt}
              onChange={(e) => setVisionPrompt(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              disabled={!visionBase64 || isAnalyzingVision}
              onClick={handleRunVision}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAnalyzingVision ? "Scanning..." : "Scan Frame"}
            </button>
          </div>
        </div>

        {/* Vision Output */}
        {visionResult && (
          <div className="p-3.5 bg-slate-950/90 border border-sky-500/30 rounded-lg text-xs text-slate-200 leading-relaxed max-h-[180px] overflow-y-auto whitespace-pre-wrap">
            {visionResult}
          </div>
        )}
      </div>
    </div>
  );
};
