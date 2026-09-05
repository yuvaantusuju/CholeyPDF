'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Archive, Sparkles, CheckCircle2, 
  Settings2, Download, RefreshCw, Smartphone, BookOpen, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { KINDLE_PRESETS, KindlePreset, ConversionOptions, convertFileToKindlePdf, convertZipBundle } from '@/lib/converter';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<KindlePreset>(KINDLE_PRESETS[0]);
  const [rightToLeft, setRightToLeft] = useState(true);
  const [overlapPx, setOverlapPx] = useState(80);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; percent: number }>({ stage: '', percent: 0 });
  const [completedBlob, setCompletedBlob] = useState<{ url: string; filename: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCompletedBlob(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setCompletedBlob(null);
    }
  };

  const startConversion = async () => {
    if (!file) return;

    setIsConverting(true);
    setProgress({ stage: 'Initializing engine...', percent: 5 });

    const options: ConversionOptions = {
      preset: selectedPreset,
      rightToLeft,
      quality: 0.95,
      overlapPx,
    };

    try {
      if (file.name.endsWith('.zip')) {
        const zipBlob = await convertZipBundle(file, options, (status) => {
          setProgress({ stage: status.stage, percent: status.progress });
        });
        const url = URL.createObjectURL(zipBlob);
        setCompletedBlob({ url, filename: `${file.name.replace(/\.zip$/i, '')}_Kindle_Bundle.zip` });
      } else {
        const pdfBytes = await convertFileToKindlePdf(file, options, (current, total) => {
          const pct = Math.round((current / total) * 100);
          setProgress({ stage: `Processing page ${current} of ${total}`, percent: pct });
        });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setCompletedBlob({ url, filename: `${file.name.replace(/\.pdf$/i, '')}_Kindle.pdf` });
      }

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      alert(`Conversion error: ${err.message || err}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-violet-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Kindleify Webtoon
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Cloudflare Pages Optimized
        </div>
      </header>

      {/* Main Studio Body */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Dropzone Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              Optimize Webtoons & Manhwa for Kindle
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Upload PDF vertical strips or ZIP archives. Automatically slices panels cleanly without server uploads.
            </p>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center ${
              file
                ? 'border-indigo-500/50 bg-indigo-500/5'
                : 'border-slate-800 hover:border-indigo-500/40 bg-slate-900/50 hover:bg-slate-900'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.zip"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {file.name.endsWith('.zip') ? <Archive className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base truncate max-w-xs">{file.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to change
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-2xl bg-slate-800/80 text-slate-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Drop PDF or ZIP bundle here</p>
                  <p className="text-xs text-slate-500 mt-1">Select a single file or an archive containing multiple PDFs</p>
                </div>
              </div>
            )}
          </div>

          {/* Start Conversion CTA */}
          {file && !completedBlob && (
            <button
              onClick={startConversion}
              disabled={isConverting}
              className="w-full py-4 px-6 rounded-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 hover:opacity-95 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Slicing & Formatting Panels...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Convert File</span>
                </>
              )}
            </button>
          )}

          {/* Download Box */}
          {completedBlob && (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-6 h-6" />
                <span>Conversion Complete!</span>
              </div>
              <a
                href={completedBlob.url}
                download={completedBlob.filename}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" />
                <span>Download {completedBlob.filename}</span>
              </a>
            </div>
          )}

          {/* Live Progress Tracker */}
          {isConverting && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{progress.stage}</span>
                <span className="font-semibold text-indigo-400">{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Device Settings Panel */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800 text-slate-200 font-semibold text-sm">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <span>Target Screen Configuration</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Kindle Model Preset
            </label>
            <div className="grid grid-cols-1 gap-2">
              {KINDLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all flex justify-between items-center ${
                    selectedPreset.id === preset.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{preset.name}</div>
                    <div className="text-[10px] opacity-70">{preset.description}</div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                    {preset.width}x{preset.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Reading Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRightToLeft(true)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  rightToLeft ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Manga (R-to-L)
              </button>
              <button
                onClick={() => setRightToLeft(false)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  !rightToLeft ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Western (L-to-R)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-400">Vertical Slice Overlap</label>
              <span className="font-mono text-indigo-400">{overlapPx}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={overlapPx}
              onChange={(e) => setOverlapPx(Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Kindleify • Ready for Cloudflare Pages
      </footer>
    </main>
  );
}