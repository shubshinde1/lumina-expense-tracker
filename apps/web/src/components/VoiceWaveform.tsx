"use client";
import React, { useEffect, useRef } from "react";

export default function VoiceWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let phase = 0;

        function draw() {
          if (!active) return;
          animationRef.current = requestAnimationFrame(draw);

          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume/level
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // Normalize volume (0.05 min to 1 max)
          const volume = Math.min(Math.max(average / 128, 0.05), 1.0);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";

          // Siri-style multi-layered wave lines
          const wavesCount = 3;
          const colors = [
            "rgba(239, 68, 68, 0.8)",  // Bright red
            "rgba(239, 68, 68, 0.4)",  // Medium red
            "rgba(251, 113, 133, 0.2)" // Faded rose
          ];

          phase += 0.15; // Wave oscillation speed

          for (let w = 0; w < wavesCount; w++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[w];

            // Amplitude scaled by real-time voice volume
            const amplitude = (canvas.height / 2.2) * volume * (1 - w * 0.35);
            const frequency = 0.05 + w * 0.02;

            for (let x = 0; x < canvas.width; x++) {
              // Sine wave wrapped in a bell curve window function so it fades to flat at edges
              const normalizedX = x / canvas.width;
              const envelope = Math.sin(normalizedX * Math.PI);
              const y =
                canvas.height / 2 +
                Math.sin(x * frequency + phase) * amplitude * envelope;

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();
          }
        }

        draw();
      } catch (err) {
        console.warn("Failed to initialize audio visualizer stream:", err);
      }
    }

    initAudio();

    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none rounded-full">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/5 to-transparent blur-md pointer-events-none" />
      <canvas
        ref={canvasRef}
        width={192}
        height={48}
        className="w-full h-full block"
      />
    </div>
  );
}
