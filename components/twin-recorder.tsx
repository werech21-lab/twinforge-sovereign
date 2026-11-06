"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SECONDS = 30;
const MAX_SECONDS = 60;

type TwinRecorderProps = {
  onComplete: (payload: { blob: Blob; durationSec: number }) => void;
  onReset?: () => void;
};

export function TwinRecorder({ onComplete, onReset }: TwinRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const [permission, setPermission] = useState<"idle" | "granted" | "denied">("idle");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
    stopTracks();
  }, [clearTimer, stopTracks]);

  async function requestMedia() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermission("granted");
    } catch {
      setPermission("denied");
      setError("لم يتم منح صلاحية الكاميرا أو الميكروفون.");
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  function startRecording() {
    if (!streamRef.current) return;
    setError(null);
    setDone(false);
    chunksRef.current = [];

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      clearTimer();
      setRecording(false);
      const durationSec = elapsedRef.current;
      if (durationSec < MIN_SECONDS) {
        setError(`التسجيل قصير جداً. الحد الأدنى ${MIN_SECONDS} ثانية.`);
        onReset?.();
        return;
      }
      const blob = new Blob(chunksRef.current, { type: mime });
      setDone(true);
      onComplete({ blob, durationSec });
    };

    elapsedRef.current = 0;
    setElapsed(0);
    recorder.start(250);
    setRecording(true);

    timerRef.current = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_SECONDS) {
        finishRecording();
      }
    }, 1000);
  }

  function reset() {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    setRecording(false);
    setElapsed(0);
    elapsedRef.current = 0;
    setDone(false);
    setError(null);
    onReset?.();
  }

  const canStop = recording && elapsed >= MIN_SECONDS;
  const progress = Math.min(100, (elapsed / MAX_SECONDS) * 100);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-bg-elevated">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full bg-black object-cover"
        />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {recording
            ? `جارٍ التسجيل · ${elapsed}ث / ${MAX_SECONDS}ث`
            : done
              ? "اكتمل التسجيل"
              : `سجّل بين ${MIN_SECONDS} و ${MAX_SECONDS} ثانية`}
        </span>
        {recording && !canStop ? (
          <span className="text-warn">أكمل حتى {MIN_SECONDS}ث قبل الإيقاف</span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {permission !== "granted" ? (
          <button
            type="button"
            onClick={requestMedia}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            طلب صلاحية الكاميرا والميكروفون
          </button>
        ) : null}

        {permission === "granted" && !recording && !done ? (
          <button
            type="button"
            onClick={startRecording}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            بدء التسجيل
          </button>
        ) : null}

        {recording ? (
          <button
            type="button"
            disabled={!canStop}
            onClick={finishRecording}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-40"
          >
            إيقاف التسجيل
          </button>
        ) : null}

        {(recording || done) && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted"
          >
            إعادة
          </button>
        )}
      </div>
    </div>
  );
}
