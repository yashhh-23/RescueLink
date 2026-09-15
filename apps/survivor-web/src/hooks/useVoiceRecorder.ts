'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  audioUrl: string | null;
  audioBase64: string | null;
  recordingDuration: number;
  error: string | null;
}

export function useVoiceRecorder(maxDurationSeconds: number = 15) {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    audioUrl: null,
    audioBase64: null,
    recordingDuration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    stopRecording();
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      audioUrl: null,
      audioBase64: null,
      recordingDuration: 0,
      error: null,
    });
  }, [stopRecording, state.audioUrl]);

  const startRecording = useCallback(async () => {
    clearRecording();

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone recording is not supported in this browser.',
      }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer opus in webm, fallback to whatever browser supports
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);

        // Convert to base64 Data URL for easy IndexedDB and JSON payload transport
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setState((prev) => ({
            ...prev,
            isRecording: false,
            audioUrl: url,
            audioBase64: base64data,
          }));
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(250); // Slice chunks every 250ms

      setState({
        isRecording: true,
        audioUrl: null,
        audioBase64: null,
        recordingDuration: 0,
        error: null,
      });

      // Duration counter and auto-stop at maxDurationSeconds
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setState((prev) => ({ ...prev, recordingDuration: seconds }));

        if (seconds >= maxDurationSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: 'Microphone permission denied or audio device unavailable.',
      }));
    }
  }, [clearRecording, maxDurationSeconds, stopRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
