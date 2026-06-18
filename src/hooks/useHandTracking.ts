import { useEffect, useRef, useState, useCallback } from "react";

export interface HandPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

export type TrackingStatus = "idle" | "loading" | "active" | "no_hand" | "error";

/**
 * Detects index fingertip (landmark 8) position using MediaPipe Hands.
 * Returns normalized x/y (0-1) relative to video frame.
 *
 * PINCH GESTURE (thumb tip #4 + index tip #8 < 0.06 distance)
 * is exposed as `isPinching` — use it as "lift pen" signal.
 */
export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [fingerPos, setFingerPos] = useState<HandPoint | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const dist = (a: HandPoint, b: HandPoint) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch {
      setStatus("error");
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setFingerPos(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    async function init() {
      // Dynamically import MediaPipe to avoid SSR issues
      const { Hands } = await import("@mediapipe/hands");

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,       // 0 = lite, faster for drawing UX
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results: any) => {
        if (cancelled) return;
        const lm = results.multiHandLandmarks?.[0];
        if (!lm) {
          setFingerPos(null);
          setIsPinching(false);
          setStatus("no_hand");
          return;
        }
        setStatus("active");

        // Landmark 8 = index fingertip
        const index: HandPoint = { x: lm[8].x, y: lm[8].y };
        // Mirror X because video is flipped
        setFingerPos({ x: 1 - index.x, y: index.y });

        // Pinch: thumb tip (4) + index tip (8)
        const thumb: HandPoint = { x: lm[4].x, y: lm[4].y };
        setIsPinching(dist(thumb, index) < 0.06);
      });

      handsRef.current = hands;
      await startCamera();

      async function detect() {
        if (cancelled) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await hands.send({ image: videoRef.current });
        }
        animFrameRef.current = requestAnimationFrame(detect);
      }
      detect();
    }

    init().catch(() => setStatus("error"));

    return () => {
      cancelled = true;
      stopCamera();
      handsRef.current?.close?.();
    };
  }, [startCamera, stopCamera, videoRef]);

  return { fingerPos, isPinching, status, stopCamera };
}
