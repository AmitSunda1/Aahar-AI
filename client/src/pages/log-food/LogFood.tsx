import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { RevealSection } from "../../components/ui/RevealSection";
import { TextInput } from "../../components/ui/TextInput";
import { LogFoodSkeleton } from "../../components/ui/skeletons/LogFoodSkeleton";
import {
  useAnalyzeFoodTextMutation,
  useLogFoodMutation,
} from "../../features/food/foodApi";

type LogMode = "manual" | "voice" | "capture";
type FoodUnit = "g" | "ml" | "pc" | "cup" | "tbsp" | "oz" | "l";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface LogSuccess {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const modeCards: Array<{
  mode: LogMode;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    mode: "manual",
    eyebrow: "Type",
    title: "Manual",
    description: "Write your meal in one quick line.",
  },
  {
    mode: "voice",
    eyebrow: "Speak",
    title: "Voice",
    description: "Speak once, then edit if needed.",
  },
  {
    mode: "capture",
    eyebrow: "Scan",
    title: "Camera",
    description: "Use the photo flow for mixed plates.",
  },
];

export const LogFood = () => {
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  // Tracks whether we should restart recognition after a pause (continuous mode)
  const keepVoiceAliveRef = useRef(false);
  // Tracks the active mode inside the recognition callbacks (avoids stale closure)
  const activeModeRef = useRef<LogMode>("manual");
  // Accumulates final transcript chunks across pauses
  const voiceFinalTranscriptRef = useRef("");

  const [activeMode, setActiveMode] = useState<LogMode>("manual");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<FoodUnit>("g");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LogSuccess | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isMounting, setIsMounting] = useState(true);

  // Brief skeleton on mount for consistent UX
  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const [analyzeFoodText, { isLoading: isAnalyzing }] =
    useAnalyzeFoodTextMutation();
  const [logFood, { isLoading: isLogging }] = useLogFoodMutation();

  const isSubmitting = isAnalyzing || isLogging;

  // Keep activeModeRef in sync so recognition callbacks can read current mode
  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const RecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);

    const recognition = new RecognitionCtor();
    // continuous = true prevents the browser from stopping after a pause
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      // Accumulate final results and show interim ones live
      let finalTranscript = voiceFinalTranscriptRef.current;
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = (result?.[0]?.transcript || "").replace(/\s+/g, " ").trim();
        if (!text) continue;

        if (result.isFinal) {
          finalTranscript = [finalTranscript, text].filter(Boolean).join(" ");
        } else {
          interimTranscript = [interimTranscript, text].filter(Boolean).join(" ");
        }
      }

      voiceFinalTranscriptRef.current = finalTranscript;
      const nextDescription = [finalTranscript, interimTranscript]
        .filter(Boolean)
        .join(" ")
        .trim();

      setDescription(nextDescription);
      setError(null);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" fire on natural pauses — not real errors
      const errorEvent = event as { error?: string };
      const isRecoverable =
        errorEvent.error === "no-speech" || errorEvent.error === "aborted";

      if (isRecoverable && keepVoiceAliveRef.current) {
        // Let onend handle the restart; don't show an error to the user
        return;
      }

      keepVoiceAliveRef.current = false;
      setIsListening(false);
      setError(
        "Voice capture could not complete. Please try again or type the meal manually.",
      );
    };

    recognition.onend = () => {
      // Auto-restart while the user hasn't pressed Stop and is still in voice mode
      if (keepVoiceAliveRef.current && activeModeRef.current === "voice") {
        try {
          recognition.start();
          return;
        } catch {
          // If restart fails immediately, fall through and stop gracefully
        }
      }

      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;

    return () => {
      keepVoiceAliveRef.current = false;
      recognition.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  const activeCard = useMemo(
    () => modeCards.find((card) => card.mode === activeMode) ?? modeCards[0],
    [activeMode],
  );

  const handleAnalyzeAndLog = async () => {
    if (!description.trim()) {
      setError("Please add a food description before logging.");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const analysis = await analyzeFoodText({
        description: description.trim(),
        quantity: quantity ? Number(quantity) : undefined,
        unit: quantity ? unit : undefined,
        notes: notes.trim() || undefined,
      }).unwrap();

      await logFood({
        foodName: analysis.data.foodName,
        macros: analysis.data.macros,
      }).unwrap();

      setSuccess({
        foodName: analysis.data.foodName,
        calories: analysis.data.macros.calories,
        protein: analysis.data.macros.protein,
        carbs: analysis.data.macros.carbs,
        fat: analysis.data.macros.fat,
      });

      setDescription("");
      setQuantity("");
      setUnit("g");
      setNotes("");
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Unable to log this meal right now. Please try again.";
      setError(message);
    }
  };

  const startVoiceCapture = () => {
    if (!speechRecognitionRef.current) return;

    setError(null);
    setSuccess(null);
    voiceFinalTranscriptRef.current = "";
    keepVoiceAliveRef.current = true;
    setIsListening(true);
    try {
      speechRecognitionRef.current.start();
    } catch {
      keepVoiceAliveRef.current = false;
      setIsListening(false);
      setError("Voice capture could not start. Please try again.");
    }
  };

  const stopVoiceCapture = () => {
    keepVoiceAliveRef.current = false;
    speechRecognitionRef.current?.stop();
    setIsListening(false);
  };

  if (isMounting) return <LogFoodSkeleton />;

  return (
    <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
      <section className="animate-soft-rise">
        <p className="inline-flex rounded-full border border-grey-700/60 bg-grey-900/40 px-3 py-1 text-label-sm uppercase tracking-[0.16em] text-grey-300">
          Log Food
        </p>
        <h1 className="mt-4 text-h1">Add a meal in seconds</h1>
        <p className="mt-2 max-w-[32ch] text-body text-grey-500">
          Pick a mode, review macros, save.
        </p>

        <div className="mt-6 grid gap-3">
          {modeCards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => {
                setActiveMode(card.mode);
                setError(null);
                setSuccess(null);
              }}
              className={`rounded-[22px] border p-4 text-left transition-all ${
                activeMode === card.mode
                  ? "border-accent-primary bg-accent-primary/15 shadow-[0_12px_28px_rgba(11,95,255,0.18)]"
                  : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
              }`}
            >
              <p className="text-label-sm uppercase tracking-[0.16em] text-grey-500">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-h3">{card.title}</h2>
              <p className="mt-2 text-body text-grey-300">{card.description}</p>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-[20px] border border-semantic-error/35 bg-semantic-error/10 p-4 text-body text-grey-300 animate-soft-rise">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-[22px] border border-semantic-success/35 bg-semantic-success/10 p-5 animate-soft-rise">
          <p className="text-label-sm uppercase tracking-[0.16em] text-semantic-success">
            Saved
          </p>
          <h3 className="mt-2 text-h2">{success.foodName}</h3>
          <p className="mt-1 text-body text-grey-300">
            {success.calories} kcal • {success.protein}g protein •{" "}
            {success.carbs}g carbs • {success.fat}g fat
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex text-body-lg font-medium text-accent-primary"
          >
            View dashboard
          </Link>
        </div>
      )}

      <RevealSection
        className="mt-6 rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-5 shadow-card"
        delay={80}
      >
        <p className="text-label-sm uppercase tracking-[0.16em] text-grey-500">
          {activeCard.eyebrow}
        </p>
        <h2 className="mt-2 text-h2">{activeCard.title}</h2>
        <p className="mt-2 text-body text-grey-500">{activeCard.description}</p>

        {activeMode === "capture" ? (
          <div className="mt-6 rounded-[24px] border border-accent-primary/30 bg-[linear-gradient(145deg,rgba(11,95,255,0.18),rgba(11,95,255,0.04))] p-5">
            <p className="text-body text-grey-300">
              Use your camera when typing is slow.
            </p>
            <Link
              to="/log-food/scan"
              className="mt-5 inline-flex h-14 items-center justify-center rounded-full bg-accent-primary px-6 text-body-lg font-semibold text-base-white shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
            >
              Open scanner
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {activeMode === "voice" && (
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                {voiceSupported ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-h3">Voice input</p>
                        <p className="mt-1 text-body text-grey-400">
                          Example: one bowl curd and one banana.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={
                          isListening ? stopVoiceCapture : startVoiceCapture
                        }
                        className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all ${
                          isListening
                            ? "border-semantic-error/40 bg-semantic-error/15 text-semantic-error"
                            : "border-accent-primary/40 bg-accent-primary/15 text-accent-primary"
                        }`}
                      >
                        <span className="text-[22px]">
                          {isListening ? "■" : "●"}
                        </span>
                      </button>
                    </div>
                    <p className="mt-3 text-body text-grey-500">
                      {isListening ? "Listening..." : "Tap to record"}
                    </p>
                  </>
                ) : (
                  <p className="text-body text-grey-300">
                    Voice is not available in this browser. Type your meal
                    instead.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-label-lg uppercase text-grey-300">
                Meal details
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={
                  activeMode === "manual"
                    ? "Example: 1 bowl curd, 100g oats, 1 banana"
                    : "Transcript appears here. Edit before saving."
                }
                className="min-h-32 w-full rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-body-lg text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
              />
            </div>

            <div className="grid grid-cols-[1fr_100px] gap-3">
              <TextInput
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Qty (optional)"
              />
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as FoodUnit)}
                className="h-14 rounded-[16px] border border-white/8 bg-white/[0.03] px-4 text-body-lg text-base-white outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pc">pc</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="oz">oz</option>
                <option value="l">l</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-label-lg uppercase text-grey-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional: homemade, less oil, no sugar"
                className="min-h-24 w-full rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-body text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
              />
            </div>

            <Button
              type="button"
              onClick={handleAnalyzeAndLog}
              loading={isSubmitting}
              fullWidth
              className="rounded-full bg-accent-primary text-base-white hover:bg-[#245fff]"
            >
              Analyze & save
            </Button>
          </div>
        )}
      </RevealSection>
    </div>
  );
};
