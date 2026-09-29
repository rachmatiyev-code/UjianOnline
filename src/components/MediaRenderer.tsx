import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { Question } from '../types/exam';

interface MediaRendererProps {
  question: Pick<
    Question,
    'mediaType' | 'mediaUrl' | 'mediaCaption' | 'audioFreq' | 'formulaText' | 'topic'
  >;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ question }) => {
  const [imgError, setImgError] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSimRunning, setIsSimRunning] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [question.mediaUrl]);

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Interactive harmonic wave animation for 'video' media type
  useEffect(() => {
    if (question.mediaType !== 'video' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Equilibrium axis
      ctx.strokeStyle = '#94A3B8';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Harmonic wave curve
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(x * 0.035 - phase) * (h * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Particle nodes along the wave
      for (let x = 40; x < w - 20; x += 60) {
        const y = h / 2 + Math.sin(x * 0.035 - phase) * (h * 0.3);
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isSimRunning) {
        phase += 0.05;
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [question.mediaType, isSimRunning]);

  const toggleTone = () => {
    if (isPlayingAudio) {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {
          // ignore
        }
        oscRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(question.audioFreq || 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioCtxRef.current = ctx;
      oscRef.current = osc;
      setIsPlayingAudio(true);

      // Auto-stop after 4 seconds
      setTimeout(() => {
        if (oscRef.current === osc) {
          try {
            osc.stop();
          } catch {
            // ignore
          }
          oscRef.current = null;
          setIsPlayingAudio(false);
        }
      }, 4000);
    } catch (e) {
      console.error('Web Audio error:', e);
    }
  };

  if (!question.mediaType || question.mediaType === 'none') {
    return null;
  }

  return (
    <div className="my-4 border border-slate-200 rounded-lg bg-slate-50/70 overflow-hidden">
      {question.mediaType === 'image' && (
        <div>
          {question.mediaUrl && !imgError ? (
            <div className="relative bg-white flex items-center justify-center p-3">
              <img
                src={question.mediaUrl}
                alt={question.mediaCaption || `Ilustrasi Soal ${question.topic}`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="max-h-72 w-auto object-contain rounded border border-slate-100"
              />
            </div>
          ) : (
            /* Zero-Broken-Image Policy Fallback Container */
            <div className="p-6 bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50/40 flex flex-col items-center justify-center text-center min-h-44">
              <svg
                className="w-16 h-16 text-sky-700 mb-2"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="6" y="10" width="52" height="44" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M14 42L26 28L36 38L44 26L52 42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="22" cy="22" r="4" stroke="currentColor" strokeWidth="2" />
              </svg>
              <p className="text-xs font-medium text-slate-700">
                Diagram Ilustrasi · {question.topic || 'Materi Ujian'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Representasi skematik visual untuk analisis soal
              </p>
            </div>
          )}
        </div>
      )}

      {question.mediaType === 'formula' && (
        <div className="p-4 bg-slate-900 text-slate-100 font-mono text-sm leading-relaxed overflow-x-auto">
          <pre className="whitespace-pre-wrap">{question.formulaText || 'f(x) = ax² + bx + c'}</pre>
        </div>
      )}

      {question.mediaType === 'audio' && (
        <div className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTone}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                isPlayingAudio
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-sky-700 text-white hover:bg-sky-800'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Hentikan Sinyal Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Putar Sampel Audio ({question.audioFreq || 440} Hz)</span>
                </>
              )}
            </button>
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Instrumen Audio Interaktif · <span className="font-mono tabular-nums">{question.audioFreq || 440} Hz</span>
              </div>
              <div className="text-xs text-slate-500">
                {isPlayingAudio
                  ? 'Memancarkan gelombang sinus murni (4 detik)...'
                  : 'Klik tombol untuk mendengarkan frekuensi sampel soal'}
              </div>
            </div>
          </div>
          {question.mediaUrl && (
            <audio controls src={question.mediaUrl} className="h-8 max-w-xs" />
          )}
        </div>
      )}

      {question.mediaType === 'video' && (
        <div className="bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">
              Kanvas Simulasi Osilasi Harmonik Real-Time
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSimRunning((prev) => !prev)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {isSimRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isSimRunning ? 'Jeda Simulasi' : 'Lanjutkan'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSimRunning(true)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded"
                title="Reset Simulasi"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={140}
            className="w-full h-36 rounded border border-slate-200 bg-slate-50"
          />
        </div>
      )}

      {question.mediaCaption && (
        <div className="px-4 py-2 bg-slate-100/80 border-t border-slate-200 text-xs text-slate-600">
          {question.mediaCaption}
        </div>
      )}
    </div>
  );
};
