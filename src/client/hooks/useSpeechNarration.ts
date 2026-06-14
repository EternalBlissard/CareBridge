import { useCallback, useEffect, useRef, useState } from "react";
import type { PatientCard, ScheduleEntry } from "@shared/types";
import {
  allCardsSpeechText,
  cardToSpeechText,
  isSpeechSupported,
  pickLocalVoice,
  splitIntoUtterances,
} from "../utils/speech";

export type NarrationState = "idle" | "speaking" | "paused";

export function useSpeechNarration() {
  const [state, setState] = useState<NarrationState>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const supported = isSpeechSupported();

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    indexRef.current = 0;
  }, []);

  const finish = useCallback(() => {
    clearQueue();
    setState("idle");
    setActiveId(null);
  }, [clearQueue]);

  const speakNext = useCallback(() => {
    if (!supported) return;

    if (indexRef.current >= queueRef.current.length) {
      finish();
      return;
    }

    const text = queueRef.current[indexRef.current];
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickLocalVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;

    utterance.onend = () => {
      indexRef.current += 1;
      speakNext();
    };

    utterance.onerror = () => {
      indexRef.current += 1;
      speakNext();
    };

    speechSynthesis.speak(utterance);
  }, [supported, finish]);

  const startQueue = useCallback(
    (chunks: string[], id: string | null) => {
      if (!supported || chunks.length === 0) return;

      speechSynthesis.cancel();
      queueRef.current = chunks;
      indexRef.current = 0;
      setActiveId(id);
      setState("speaking");
      speakNext();
    },
    [supported, speakNext],
  );

  const speakText = useCallback(
    (text: string, id: string | null = null) => {
      startQueue(splitIntoUtterances(text), id);
    },
    [startQueue],
  );

  const speakCard = useCallback(
    (card: PatientCard) => {
      speakText(cardToSpeechText(card), card.id);
    },
    [speakText],
  );

  const speakAll = useCallback(
    (cards: PatientCard[], schedule: ScheduleEntry[]) => {
      speakText(allCardsSpeechText(cards, schedule), "__all__");
    },
    [speakText],
  );

  const pause = useCallback(() => {
    if (!supported || state !== "speaking") return;
    speechSynthesis.pause();
    setState("paused");
  }, [supported, state]);

  const resume = useCallback(() => {
    if (!supported || state !== "paused") return;
    speechSynthesis.resume();
    setState("speaking");
  }, [supported, state]);

  const stop = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    finish();
  }, [supported, finish]);

  useEffect(() => {
    if (!supported) return;

    const primeVoices = () => pickLocalVoice();
    primeVoices();
    speechSynthesis.addEventListener("voiceschanged", primeVoices);

    return () => {
      speechSynthesis.cancel();
      speechSynthesis.removeEventListener("voiceschanged", primeVoices);
    };
  }, [supported]);

  return {
    supported,
    state,
    activeId,
    speakCard,
    speakAll,
    pause,
    resume,
    stop,
    isSpeaking: state === "speaking",
    isPaused: state === "paused",
    isActive: state !== "idle",
  };
}
