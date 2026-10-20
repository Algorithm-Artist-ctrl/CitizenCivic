import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, AlertCircle, X, RefreshCw, Sparkles, Globe } from 'lucide-react';
import { transcribeAudioWithPuter, loadPuterSDK } from '../utils/puterSpeech';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  preferredLanguage?: 'auto' | 'hi' | 'en';
  disabled?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  preferredLanguage = 'auto',
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [language, setLanguage] = useState<'auto' | 'hi' | 'en'>(preferredLanguage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Preload Puter.js SDK in background on mount
  useEffect(() => {
    loadPuterSDK().catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Stop all media tracks and release audio contexts safely
  const cleanupAudio = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Determine browser's best supported mimeType
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Monitor live microphone volume level
  const startVolumeMonitor = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('AudioContext volume monitoring unavailable:', e);
    }
  };

  // Start recording audio
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    // Verify browser support
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMessage(
        'Voice recording is not supported in this browser. Please use Chrome, Safari, Firefox, or Edge, or type manually.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        cleanupAudio();
        setIsRecording(false);

        if (!chunks.length) {
          setErrorMessage('No audio was captured. Please speak closer to the microphone and try again.');
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        if (audioBlob.size < 600) {
          setErrorMessage(
            'Recording was too short or silent. Please speak clearly for at least 1-2 seconds.'
          );
          return;
        }

        // Begin transcription via Puter.js
        setIsTranscribing(true);
        try {
          const text = await transcribeAudioWithPuter(audioBlob, {
            language,
            prompt:
              'Civic complaint description, garbage dump, water logging, damaged road, potholes, streetlight, sewage, municipal ward problem, Hindi, English, Hinglish.',
          });

          onTranscript(text);
          setSuccessNotice(
            language === 'hi'
              ? 'आवाज़ विवरण जोड़ दिया गया है!'
              : 'Voice description transcribed and appended!'
          );
          setTimeout(() => setSuccessNotice(null), 5000);
        } catch (transcribeErr: any) {
          console.error('Transcription failed:', transcribeErr);
          setErrorMessage(
            transcribeErr?.message ||
              'Voice transcription service was unavailable. Please retry or enter description manually.'
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      // Request data chunks every 500ms
      recorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start live volume visualizer
      startVolumeMonitor(stream);

      // Start elapsed timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 89) {
            // Auto stop at 90 seconds limit
            handleStopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      cleanupAudio();
      setIsRecording(false);
      console.error('Microphone access error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Microphone permission was denied. Please allow microphone access in your browser settings to use voice input, or type manually.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device was detected on your computer or mobile device.');
      } else {
        setErrorMessage(
          'Unable to access microphone (' +
            (err.message || 'unknown error') +
            '). Please type your description manually.'
        );
      }
    }
  };

  // Stop recording and trigger transcription
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping MediaRecorder:', e);
        cleanupAudio();
        setIsRecording(false);
      }
    } else {
      cleanupAudio();
      setIsRecording(false);
    }
  };

  // Cancel recording and discard audio
  const handleCancelRecording = () => {
    cleanupAudio();
    audioChunksRef.current = [];
    setIsRecording(false);
    setErrorMessage(null);
  };

  // Format seconds as mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Active Recording State Bar */}
      {isRecording && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 shadow-xs transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Pulsing Red Dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>

              {/* Timer & Language */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-rose-700">
                  {formatTime(recordingSeconds)}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {language === 'hi' ? 'हिन्दी में बोलें' : language === 'en' ? 'Speak in English' : 'Listening (Hindi / English)...'}
                </span>
              </div>

              {/* Dynamic Sound Wave Indicator */}
              <div className="hidden sm:flex items-center gap-0.5 ml-2">
                {[20, 45, 75, 55, 30, 85, 60, 40].map((baseHeight, idx) => {
                  const dynamicHeight = Math.max(
                    4,
                    Math.round(baseHeight * (0.3 + (audioLevel / 100) * 0.7))
                  );
                  return (
                    <span
                      key={idx}
                      className="w-1 rounded-full bg-rose-500 transition-all duration-75"
                      style={{ height: `${dynamicHeight}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStopRecording}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                title="Stop recording and transcribe"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Done & Transcribe</span>
              </button>
              <button
                type="button"
                onClick={handleCancelRecording}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                title="Cancel recording without transcribing"
              >
                <X className="h-3 w-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Speaking naturally in Hindi, English, or Hinglish. Tap <b>Done & Transcribe</b> when finished.
          </p>
        </div>
      )}

      {/* Transcribing State Bar */}
      {isTranscribing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 shadow-xs animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          <div className="flex-1">
            <span className="font-semibold">Transcribing with Puter AI...</span>
            <span className="ml-1 text-[11px] text-emerald-700 opacity-90">
              Converting your voice notes into text.
            </span>
          </div>
        </div>
      )}

      {/* Success Notification Bar */}
      {successNotice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-xs">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{successNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Error State Bar with Retry & Manual Typing Fallback */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-xs space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Voice Recognition Notice</p>
                <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-rose-100 text-[11px]">
            <button
              type="button"
              onClick={handleStartRecording}
              className="font-medium text-rose-800 underline hover:text-rose-900 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Try Again
            </button>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">Manual typing is always available in the field below.</span>
          </div>
        </div>
      )}

      {/* Idle / Control Toolbar (Visible when not actively recording or transcribing) */}
      {!isRecording && !isTranscribing && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {/* Main Voice Button */}
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-gradient-to-b from-white to-emerald-50/40 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Record your complaint in Hindi or English using Puter AI Speech-to-Text"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
              <Mic className="h-3 w-3" />
            </span>
            <span>Voice Input (बोलकर लिखें)</span>
            <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
              Puter AI
            </span>
          </button>

          {/* Language Selection Pill */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <Globe className="h-3 w-3 text-slate-400 ml-1" />
            <button
              type="button"
              onClick={() => setLanguage('auto')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                language === 'auto'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Automatically detect whether speaking Hindi or English"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                language === 'hi'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Transcribe in Hindi (देवनागरी)"
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                language === 'en'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Transcribe in English"
            >
              EN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;
