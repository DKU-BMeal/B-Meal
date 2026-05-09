// src/utils/tts.ts

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
};

export function speakText(text: string, options: SpeakOptions = {}) {
  if (typeof window === "undefined") return;

  if (!("speechSynthesis" in window)) {
    console.warn("이 브라우저는 TTS(speechSynthesis)를 지원하지 않습니다.");
    return;
  }

  const {
    lang = "ko-KR",
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
  } = options;

  // 이미 말하던 거 있으면 중단
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
