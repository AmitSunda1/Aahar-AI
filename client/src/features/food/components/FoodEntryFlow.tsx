import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { TextInput } from "../../../components/ui/TextInput";
import { compressImage } from "../../../utils/imageCompression";
import {
  useAnalyzeFoodImageMutation,
  useAnalyzeFoodTextMutation,
  useLogFoodMutation,
  type FoodAnalysisResult,
} from "../foodApi";

type FoodMode = "manual" | "voice" | "capture";
type FoodUnit = "g" | "ml" | "pc" | "cup" | "tbsp" | "oz" | "l";
type CaptureStep = "upload" | "describe" | "analyzing" | "results";

interface QuantityRow {
  id: string;
  item: string;
  quantity: string;
  unit: FoodUnit;
}

interface LogSuccess {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const modeCards: Array<{
  mode: FoodMode;
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
    description: "Use photo mode for mixed plates.",
  },
];

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

interface SpeechRecognitionErrorEvent extends Event {
  error?: string;
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

let rowCounter = 0;

const createQuantityRow = (): QuantityRow => {
  rowCounter += 1;

  return {
    id: `quantity-row-${Date.now()}-${rowCounter}`,
    item: "",
    quantity: "",
    unit: "g",
  };
};

const formatQuantitySummary = (row: QuantityRow) => {
  const pieces = [row.quantity.trim(), row.unit, row.item.trim()].filter(
    Boolean,
  );
  return pieces.join(" ").trim();
};

const buildRequestDescription = (
  description: string,
  quantityRows: QuantityRow[],
) => {
  const rowSummary = quantityRows
    .map(formatQuantitySummary)
    .filter((entry) => entry.length > 0);

  return [description.trim(), ...rowSummary].filter(Boolean).join(", ");
};

const getPrimaryQuantity = (quantityRows: QuantityRow[]) => {
  if (quantityRows.length !== 1) return undefined;

  const row = quantityRows[0];
  if (!row.quantity.trim()) return undefined;

  return {
    quantity: Number(row.quantity),
    unit: row.unit,
  };
};

export const FoodEntryFlow = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const activeModeRef = useRef<FoodMode | null>(null);
  const keepVoiceAliveRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const scannerGuideRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const hasAutoOpenedCaptureRef = useRef(false);
  const hasHydratedPendingCaptureRef = useRef(false);

  const [activeMode, setActiveMode] = useState<FoodMode | null>(null);
  const [description, setDescription] = useState("");
  const [quantityRows, setQuantityRows] = useState<QuantityRow[]>([
    createQuantityRow(),
  ]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [success, setSuccess] = useState<LogSuccess | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [captureStep, setCaptureStep] = useState<CaptureStep>("upload");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const pendingCaptureFile = (
    location.state as { pendingCaptureFile?: File } | null
  )?.pendingCaptureFile;
  const shouldAutoOpenCapture = Boolean(
    (location.state as { openCapture?: boolean } | null)?.openCapture,
  );
  const shouldAutoOpenCamera = Boolean(
    (location.state as { openCamera?: boolean } | null)?.openCamera,
  );
  const isScannerRoute = location.pathname === "/log-food/scan";

  const [analyzeFoodText, { isLoading: isAnalyzingText }] =
    useAnalyzeFoodTextMutation();
  const [analyzeFoodImage] = useAnalyzeFoodImageMutation();
  const [logFood, { isLoading: isLogging }] = useLogFoodMutation();

  const isAnalyzing = isAnalyzingText || isAnalyzingImage;
  const combinedDescription = useMemo(
    () => buildRequestDescription(description, quantityRows),
    [description, quantityRows],
  );
  const primaryQuantity = useMemo(
    () => getPrimaryQuantity(quantityRows),
    [quantityRows],
  );

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setSuccess(null);
  };

  const markDirty = () => {
    clearMessages();
    clearAnalysis();
  };

  const updateDescription = (value: string) => {
    setDescription(value);
    markDirty();
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    markDirty();
  };

  const updateQuantityRow = (
    id: string,
    field: keyof QuantityRow,
    value: string,
  ) => {
    setQuantityRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id ? ({ ...row, [field]: value } as QuantityRow) : row,
      ),
    );
    markDirty();
  };

  const addQuantityRow = () => {
    setQuantityRows((currentRows) => [...currentRows, createQuantityRow()]);
    markDirty();
  };

  const removeQuantityRow = (id: string) => {
    setQuantityRows((currentRows) =>
      currentRows.length === 1
        ? [createQuantityRow()]
        : currentRows.filter((row) => row.id !== id),
    );
    markDirty();
  };

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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index]?.[0]?.transcript || "")
        .join(" ")
        .trim();

      setDescription(transcript);
      clearMessages();
      setAnalysis(null);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const isRecoverable =
        event.error === "no-speech" || event.error === "aborted";

      if (isRecoverable && keepVoiceAliveRef.current) {
        return;
      }

      keepVoiceAliveRef.current = false;
      setIsListening(false);
      setError(
        "Voice capture could not complete. Please try again or type the meal manually.",
      );
    };

    recognition.onend = () => {
      if (keepVoiceAliveRef.current && activeModeRef.current === "voice") {
        try {
          recognition.start();
          return;
        } catch {
          // If immediate restart fails, we fall through and end listening state.
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

  useEffect(() => {
    if (activeMode !== "voice" && isListening) {
      keepVoiceAliveRef.current = false;
      speechRecognitionRef.current?.stop();
    }

    if (activeMode === "capture" && !image) {
      setCaptureStep("upload");
    }
  }, [activeMode, image, isListening]);

  useEffect(() => {
    if (activeMode === "capture") {
      return;
    }

    if (isScannerRoute) {
      setActiveMode("capture");
      return;
    }

    if (
      pendingCaptureFile ||
      shouldAutoOpenCapture ||
      hasHydratedPendingCaptureRef.current
    ) {
      setActiveMode("capture");
    }
  }, [activeMode, isScannerRoute, pendingCaptureFile, shouldAutoOpenCapture]);

  useEffect(() => {
    if (!pendingCaptureFile || hasHydratedPendingCaptureRef.current) {
      return;
    }

    hasHydratedPendingCaptureRef.current = true;
    handleFileSelect(pendingCaptureFile);
    setActiveMode("capture");
  }, [pendingCaptureFile]);

  useEffect(() => {
    if (
      activeMode !== "capture" ||
      captureStep !== "upload" ||
      isCameraOpen ||
      hasAutoOpenedCaptureRef.current
    ) {
      return;
    }

    if (!isScannerRoute && !shouldAutoOpenCamera) {
      return;
    }

    hasAutoOpenedCaptureRef.current = true;
    startCamera();
  }, [
    activeMode,
    captureStep,
    isCameraOpen,
    isScannerRoute,
    shouldAutoOpenCamera,
  ]);

  const handleModeSelect = (mode: FoodMode) => {
    setActiveMode((currentMode) => (currentMode === mode ? null : mode));
    clearMessages();

    if (mode !== "voice") {
      keepVoiceAliveRef.current = false;
      speechRecognitionRef.current?.stop();
      setIsListening(false);
    }
  };

  const handleCloseScanner = () => {
    stopCamera();
    navigate(-1);
  };

  const handleStartVoiceCapture = () => {
    if (!speechRecognitionRef.current) return;

    clearMessages();
    setAnalysis(null);
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

  const handleStopVoiceCapture = () => {
    keepVoiceAliveRef.current = false;
    speechRecognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Gallery selection should always close any active camera stream.
    stopCamera();
    setCameraError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(
        `Image size must be less than 2MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      );
      return;
    }

    setImage(file);
    clearMessages();
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setCaptureStep("describe");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0] ?? null);
  };

  const resetCapture = () => {
    stopCamera();
    setImage(null);
    setImagePreview("");
    setCaptureStep("upload");
    setAnalysis(null);
    setSuccess(null);
    setError(null);
  };

  const handleAnalyzeText = async () => {
    if (!combinedDescription.trim()) {
      setError("Please add a food description before logging.");
      return;
    }

    clearMessages();

    try {
      const requestBody: {
        description: string;
        quantity?: number;
        unit?: FoodUnit;
        notes?: string;
      } = {
        description: combinedDescription.trim(),
        notes: notes.trim() || undefined,
      };

      if (primaryQuantity) {
        requestBody.quantity = primaryQuantity.quantity;
        requestBody.unit = primaryQuantity.unit;
      }

      const response = await analyzeFoodText(requestBody).unwrap();
      setAnalysis(response.data);
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Unable to log this meal right now. Please try again.";
      setError(message);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!image || !combinedDescription.trim()) {
      setError("Please provide a description for the food");
      return;
    }

    setIsAnalyzingImage(true);
    setCaptureStep("analyzing");
    clearMessages();

    try {
      const compressedBase64 = await compressImage(image, 1200, 1200, 0.75);
      const base64Data = compressedBase64.split(",")[1];
      const mimeType = image.type || "image/jpeg";

      const requestBody: {
        image: string;
        mimeType: string;
        description: string;
        quantity?: number;
        unit?: FoodUnit;
        notes?: string;
      } = {
        image: base64Data,
        mimeType,
        description: combinedDescription.trim(),
        notes: notes.trim() || undefined,
      };

      if (primaryQuantity) {
        requestBody.quantity = primaryQuantity.quantity;
        requestBody.unit = primaryQuantity.unit;
      }

      const response = await analyzeFoodImage(requestBody).unwrap();
      setAnalysis(response.data);
      setCaptureStep("results");
    } catch (err) {
      const responseError = err as {
        status?: number;
        data?: { message?: string };
      };
      const message =
        responseError.data?.message ||
        (err instanceof Error ? err.message : "Failed to analyze image");

      if (responseError.status === 429) {
        setError(
          `AI system is busy: ${message}. Please wait a moment and try again.`,
        );
      } else {
        setError(message);
      }

      setCaptureStep("describe");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleLogFood = async () => {
    if (!analysis) return;

    clearMessages();

    try {
      await logFood({
        foodName: analysis.foodName,
        macros: analysis.macros,
      }).unwrap();

      setSuccess({
        foodName: analysis.foodName,
        calories: analysis.macros.calories,
        protein: analysis.macros.protein,
        carbs: analysis.macros.carbs,
        fat: analysis.macros.fat,
      });
      setAnalysis(null);
      setDescription("");
      setQuantityRows([createQuantityRow()]);
      setNotes("");
      setImage(null);
      setImagePreview("");
      setCaptureStep("upload");
      navigate("/dashboard");
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to log food";
      setError(message);
    }
  };

  const handleAddAnotherMeal = () => {
    setSuccess(null);
    setAnalysis(null);
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setIsCameraOpen(false);
    setIsCameraStarting(false);
    setIsCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraStarting(true);
    setIsCameraReady(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      const cameraMessage =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission is blocked. Allow it in browser/site settings, then tap Take Photo again."
          : error instanceof DOMException && error.name === "NotFoundError"
            ? "No camera device was found on this device."
            : "Unable to start the camera. Please try again.";

      setCameraError(cameraMessage);
      setIsCameraOpen(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  useEffect(() => {
    if (!isCameraOpen || !cameraStreamRef.current || !cameraVideoRef.current) {
      return;
    }

    const video = cameraVideoRef.current;
    video.srcObject = cameraStreamRef.current;
    video.play().catch(() => {
      // Ignore autoplay failures; user can still retry manually.
    });
  }, [isCameraOpen]);

  const captureFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (
      !video ||
      !isCameraReady ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError("Camera is not ready yet. Please try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    const videoRect = video.getBoundingClientRect();
    const guideRect = scannerGuideRef.current?.getBoundingClientRect();

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;

    // In fullscreen scanner mode, capture only what is inside the rounded guide.
    if (
      isScannerRoute &&
      guideRect &&
      videoRect.width > 0 &&
      videoRect.height > 0
    ) {
      const displayedVideoScale = Math.max(
        videoRect.width / video.videoWidth,
        videoRect.height / video.videoHeight,
      );

      const renderedVideoWidth = video.videoWidth * displayedVideoScale;
      const renderedVideoHeight = video.videoHeight * displayedVideoScale;
      const overflowX = (renderedVideoWidth - videoRect.width) / 2;
      const overflowY = (renderedVideoHeight - videoRect.height) / 2;

      const guideXInVideoElement = guideRect.left - videoRect.left;
      const guideYInVideoElement = guideRect.top - videoRect.top;

      const mappedX = (guideXInVideoElement + overflowX) / displayedVideoScale;
      const mappedY = (guideYInVideoElement + overflowY) / displayedVideoScale;
      const mappedWidth = guideRect.width / displayedVideoScale;
      const mappedHeight = guideRect.height / displayedVideoScale;

      sourceX = Math.max(0, mappedX);
      sourceY = Math.max(0, mappedY);
      sourceWidth = Math.min(video.videoWidth - sourceX, mappedWidth);
      sourceHeight = Math.min(video.videoHeight - sourceY, mappedHeight);
    }

    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture image from camera.");
      return;
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Unable to capture image from camera.");
      return;
    }

    const file = new File([blob], `food-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    stopCamera();
    handleFileSelect(file);
  };

  const renderReviewCard = () => {
    if (!analysis) return null;

    return (
      <div className="mt-4 rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-label-lg uppercase text-grey-300">Review</p>
            <h3 className="mt-1 text-h2">{analysis.foodName}</h3>
            <p className="mt-1 text-body text-grey-500">
              {analysis.description}
            </p>
          </div>
          <div
            className={`inline-flex rounded-full px-3 py-1 text-label-lg font-medium ${
              analysis.confidence === "high"
                ? "bg-accent-primary/20 text-accent-primary"
                : analysis.confidence === "medium"
                  ? "bg-semantic-warning/20 text-semantic-warning"
                  : "bg-grey-700/30 text-grey-300"
            }`}
          >
            {analysis.confidence.charAt(0).toUpperCase() +
              analysis.confidence.slice(1)}{" "}
            Confidence
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ReviewStat
            label="Calories"
            value={`${Math.round(analysis.macros.calories)} kcal`}
            tone="accent"
          />
          <ReviewStat
            label="Protein"
            value={`${analysis.macros.protein.toFixed(1)} g`}
            tone="success"
          />
          <ReviewStat
            label="Carbs"
            value={`${analysis.macros.carbs.toFixed(1)} g`}
            tone="warning"
          />
          <ReviewStat
            label="Fat"
            value={`${analysis.macros.fat.toFixed(1)} g`}
            tone="error"
          />
        </div>

        {(analysis.servingSize ||
          analysis.additionalInfo ||
          analysis.dietaryTags?.length) && (
          <div className="mt-4 rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4">
            {analysis.servingSize && (
              <p className="text-body text-grey-400">
                Serving: {analysis.servingSize}
              </p>
            )}
            {analysis.additionalInfo && (
              <p className="mt-2 text-body text-grey-400">
                {analysis.additionalInfo}
              </p>
            )}
            {analysis.dietaryTags && analysis.dietaryTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full border border-accent-primary/30 bg-accent-primary/15 px-3 py-1 text-label-sm text-accent-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => setAnalysis(null)}
            variant="outline"
            className="!rounded-full !border !border-grey-700/50 !bg-grey-900/40 !text-base-white hover:!border-grey-600 hover:!bg-grey-900/60"
            fullWidth
          >
            Edit
          </Button>
          <Button
            type="button"
            onClick={handleLogFood}
            loading={isLogging}
            className="!rounded-full !bg-accent-primary !text-base-white hover:!bg-[#245fff] hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
            fullWidth
          >
            Log Food
          </Button>
        </div>
      </div>
    );
  };

  const renderQuantityTable = () => (
    <div className="mt-5 rounded-[22px] ">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h3">Item quantities</h3>
          <p className="mt-1 text-body text-grey-500">Optional</p>
        </div>
        <button
          type="button"
          onClick={addQuantityRow}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-accent-primary/50 bg-accent-primary/10 text-[24px] leading-none text-accent-primary transition-colors hover:bg-accent-primary/20"
          aria-label="Add another quantity row"
        >
          +
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-grey-700/50">
        <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_auto] gap-2 border-b border-grey-700/50 bg-grey-900/80 px-3 py-3 text-label-sm uppercase tracking-[0.12em] text-grey-400">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-grey-700/50">
          {quantityRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1.2fr_0.7fr_0.6fr_auto] gap-2 px-3 py-3"
            >
              <TextInput
                value={row.item}
                onChange={(event) =>
                  updateQuantityRow(row.id, "item", event.target.value)
                }
                placeholder="Food item"
                className="h-12 rounded-[14px] bg-grey-950/40"
              />
              <TextInput
                type="number"
                min="0"
                step="0.1"
                value={row.quantity}
                onChange={(event) =>
                  updateQuantityRow(row.id, "quantity", event.target.value)
                }
                placeholder="0"
                className="h-12 rounded-[14px] bg-grey-950/40"
              />
              <select
                value={row.unit}
                onChange={(event) =>
                  updateQuantityRow(row.id, "unit", event.target.value)
                }
                className="h-12 rounded-[14px] border border-grey-700/50 bg-grey-950/40 px-3 text-body text-base-white outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pc">pc</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="oz">oz</option>
                <option value="l">l</option>
              </select>

              <button
                type="button"
                onClick={() => removeQuantityRow(row.id)}
                className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-grey-700/50 text-[20px] leading-none text-grey-300 transition-colors hover:border-semantic-error/40 hover:text-semantic-error"
                aria-label="Remove quantity row"
              >
                −
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuantityRow}
          className="flex w-full items-center justify-center gap-2 border-t border-grey-700/50 bg-grey-950/30 px-4 py-3 text-body-lg font-medium text-accent-primary transition-colors hover:bg-grey-900/50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent-primary/50 text-[18px] leading-none">
            +
          </span>
          Add item
        </button>
      </div>
    </div>
  );

  const renderManualPanel = () => (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-label-lg uppercase text-grey-300">
          Meal details
        </label>
        <textarea
          value={description}
          onChange={(event) => updateDescription(event.target.value)}
          placeholder="Example: 1 bowl curd with 100g oats and a banana"
          className="min-h-32 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 py-4 text-body-lg text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
        />
      </div>

      {renderQuantityTable()}

      <div>
        <label className="mb-2 block text-label-lg uppercase text-grey-300">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(event) => updateNotes(event.target.value)}
          placeholder="Optional: homemade, less oil, no sugar"
          className="min-h-24 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 py-4 text-body text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
        />
      </div>

      <Button
        type="button"
        onClick={handleAnalyzeText}
        loading={isAnalyzing}
        fullWidth
        className="!rounded-full !bg-accent-primary !text-base-white hover:!bg-[#245fff] hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
      >
        Analyze meal
      </Button>

      {renderReviewCard()}
    </div>
  );

  const renderVoicePanel = () => (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-grey-700/50 bg-grey-900/40 p-4">
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
                  isListening ? handleStopVoiceCapture : handleStartVoiceCapture
                }
                className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all ${
                  isListening
                    ? "border-semantic-error/40 bg-semantic-error/15 text-semantic-error"
                    : "border-accent-primary/40 bg-accent-primary/15 text-accent-primary"
                }`}
                aria-label={
                  isListening ? "Stop voice capture" : "Start voice capture"
                }
              >
                <span className="text-[22px]">{isListening ? "■" : "●"}</span>
              </button>
            </div>

            <p className="mt-3 text-body text-grey-500">
              {isListening ? "Listening..." : "Tap to record"}
            </p>
          </>
        ) : (
          <p className="text-body text-grey-300">
            Voice is not available in this browser. Type your meal instead.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-label-lg uppercase text-grey-300">
          Meal details
        </label>
        <textarea
          value={description}
          onChange={(event) => updateDescription(event.target.value)}
          placeholder="Transcript appears here. Edit before saving."
          className="min-h-32 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 py-4 text-body-lg text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
        />
      </div>

      {renderQuantityTable()}

      <div>
        <label className="mb-2 block text-label-lg uppercase text-grey-300">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(event) => updateNotes(event.target.value)}
          placeholder="Optional: homemade, less oil, no sugar"
          className="min-h-24 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 py-4 text-body text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
        />
      </div>

      <Button
        type="button"
        onClick={handleAnalyzeText}
        loading={isAnalyzing}
        fullWidth
        className="!rounded-full !bg-accent-primary !text-base-white hover:!bg-[#245fff] hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
      >
        Analyze meal
      </Button>

      {renderReviewCard()}
    </div>
  );

  const renderCapturePanel = () => {
    if (captureStep === "analyzing") {
      return (
        <div className="rounded-[22px] border border-grey-700/50 bg-grey-900/40 p-5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-grey-600 border-t-accent-primary" />
            <p className="text-body text-grey-300">Analyzing image...</p>
          </div>
        </div>
      );
    }

    if (captureStep === "results" && analysis) {
      return <>{renderReviewCard()}</>;
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[22px] border border-grey-700/50 bg-grey-900/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startCamera}
              className="flex flex-1 items-center justify-center rounded-[20px] border-2 border-accent-primary/40 bg-accent-primary/10 p-5 text-center transition-all hover:border-accent-primary hover:bg-accent-primary/20"
            >
              <div>
                <p className="text-h3 text-accent-primary">Take photo</p>
                <p className="mt-1 text-body text-grey-400">Use camera</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center rounded-[20px] border-2 border-grey-700/70 bg-grey-900/40 p-5 text-center transition-all hover:border-grey-600 hover:bg-grey-900/60"
            >
              <div>
                <p className="text-h3 text-grey-300">Upload image</p>
                <p className="mt-1 text-body text-grey-400">From gallery</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {cameraError && !isCameraOpen && (
            <div className="mt-3 rounded-[16px] border border-semantic-error/40 bg-semantic-error/10 px-4 py-3 text-body text-grey-300">
              <p>{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-3 text-body-lg font-semibold text-accent-primary"
              >
                Try opening camera again
              </button>
            </div>
          )}
        </div>

        {isCameraOpen && (
          <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
            <div className="overflow-hidden rounded-[20px] border border-grey-700/50 bg-black">
              <video
                ref={cameraVideoRef}
                className="h-72 w-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>

            {cameraError && (
              <div className="mt-3 rounded-[16px] border border-semantic-error/40 bg-semantic-error/10 px-4 py-3 text-body text-grey-300">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 text-body-lg font-semibold text-accent-primary"
                >
                  Allow camera and try again
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={stopCamera}
                variant="outline"
                className="!rounded-full !border !border-grey-700/50 !bg-grey-900/40 !text-base-white hover:!border-grey-600 hover:!bg-grey-900/60"
                fullWidth
              >
                Close camera
              </Button>
              <Button
                type="button"
                onClick={captureFromCamera}
                loading={isCameraStarting}
                className="!rounded-full !bg-accent-primary !text-base-white hover:!bg-[#245fff] hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
                fullWidth
              >
                Capture photo
              </Button>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
            <div className="overflow-hidden rounded-[20px] border border-grey-700/50 bg-black">
              <img
                src={imagePreview}
                alt="Food preview"
                className="h-64 w-full object-cover"
              />
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-label-lg uppercase text-grey-300">
                  Meal details
                </label>
                <textarea
                  value={description}
                  onChange={(event) => updateDescription(event.target.value)}
                  placeholder="e.g., Grilled chicken breast with rice and vegetables"
                  className="min-h-28 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 py-4 text-body text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>

              {renderQuantityTable()}

              <div>
                <label className="mb-2 block text-label-lg uppercase text-grey-300">
                  Notes
                </label>
                <input
                  value={notes}
                  onChange={(event) => updateNotes(event.target.value)}
                  placeholder="Optional: lightly salted, homemade"
                  className="h-14 w-full rounded-[18px] border border-grey-700/50 bg-grey-900/40 px-4 text-body text-base-white placeholder-grey-500 outline-none transition-all focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={resetCapture}
                  variant="outline"
                  className="!rounded-full !border !border-grey-700/50 !bg-grey-900/40 !text-base-white hover:!border-grey-600 hover:!bg-grey-900/60"
                  fullWidth
                >
                  Replace image
                </Button>
                <Button
                  type="button"
                  onClick={handleAnalyzeImage}
                  loading={isAnalyzing}
                  className="!rounded-full !bg-accent-primary !text-base-white hover:!bg-[#245fff] hover:enabled:shadow-[0_12px_30px_rgba(11,95,255,0.28)]"
                  fullWidth
                >
                  Analyze meal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFullscreenScanner = () => {
    return (
      <div className="fixed inset-0 z-[70] bg-black/70">
        <div className="relative mx-auto h-full w-full max-w-[480px] overflow-hidden bg-black">
          {!isCameraOpen && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(11,95,255,0.28),rgba(9,9,13,0.28)_38%,rgba(0,0,0,0.95)_100%)]" />
          )}

          {isCameraOpen ? (
            <video
              ref={cameraVideoRef}
              onLoadedMetadata={() => setIsCameraReady(true)}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="absolute inset-0" />
          )}

          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.08)_35%,rgba(0,0,0,0.7))]" />

          <div className="relative z-10 flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseScanner}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-grey-600/70 bg-grey-900/60 text-[20px] text-base-white"
                aria-label="Close scanner"
              >
                ×
              </button>

              <p className="rounded-full border border-grey-600/70 bg-grey-900/55 px-3 py-1 text-label-sm uppercase tracking-[0.16em] text-grey-300">
                Scan Food
              </p>

              <div className="h-10 w-10" />
            </div>

            <div className="mx-auto mt-8 w-full max-w-[360px] rounded-[28px] border-2 border-white/55 p-1 shadow-[0_0_0_2000px_rgba(0,0,0,0.28)]">
              <div
                ref={scannerGuideRef}
                className="h-[44vh] rounded-[24px] border border-white/25"
              />
            </div>

            <p className="mt-6 text-center text-body text-grey-300">
              Align your meal in frame
            </p>

            {cameraError && (
              <div className="mt-3 rounded-[16px] border border-semantic-error/40 bg-semantic-error/10 px-4 py-3 text-body text-grey-200">
                {cameraError}
              </div>
            )}

            <div className="mt-auto space-y-3 pb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 rounded-full border border-grey-600/80 bg-grey-900/65 text-body font-medium text-base-white"
                >
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={isCameraOpen ? captureFromCamera : startCamera}
                  disabled={isCameraOpen && !isCameraReady}
                  className="h-12 rounded-full bg-accent-primary text-body font-semibold text-base-white shadow-[0_12px_30px_rgba(11,95,255,0.28)] disabled:cursor-not-allowed disabled:bg-grey-700/60 disabled:text-grey-400"
                >
                  {isCameraOpen
                    ? isCameraReady
                      ? "Capture"
                      : "Starting..."
                    : "Open Camera"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const showFullscreenScanner =
    isScannerRoute && activeMode === "capture" && captureStep === "upload";

  return (
    <div className="bg-base-black px-4 pb-8 pt-4 text-base-white">
      {showFullscreenScanner ? (
        renderFullscreenScanner()
      ) : (
        <>
          <section className="rounded-[26px] border border-grey-700/50 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.22),rgba(9,9,13,0.2)_38%,rgba(9,9,13,0.9)_100%)] p-5 shadow-card-lg">
            <p className="text-label-lg uppercase text-grey-300">Log Food</p>
            <h1 className="mt-2 text-[34px] font-semibold leading-[38px]">
              Add a meal in seconds
            </h1>
            <p className="mt-3 text-body text-grey-500">
              Pick a mode, review macros, save.
            </p>
          </section>

          {error && (
            <div className="mt-4 rounded-[18px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-grey-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-[22px] border border-semantic-success/35 bg-semantic-success/10 p-5">
              <p className="text-label-lg uppercase text-semantic-success">
                Saved
              </p>
              <h3 className="mt-2 text-h2">{success.foodName}</h3>
              <p className="mt-1 text-body text-grey-300">
                {success.calories} kcal • {success.protein}g protein •{" "}
                {success.carbs}g carbs • {success.fat}g fat
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleAddAnotherMeal}
                  variant="outline"
                  className="!rounded-full !border !border-grey-700/50 !bg-grey-900/40 !text-base-white hover:!border-grey-600 hover:!bg-grey-900/60"
                  fullWidth
                >
                  Add another meal
                </Button>
                <Link
                  to="/dashboard"
                  className="inline-flex h-14 items-center justify-center rounded-card bg-accent-primary px-6 text-body-lg font-semibold text-base-white"
                >
                  View dashboard
                </Link>
              </div>
            </div>
          )}

          {isScannerRoute ? (
            <section className="mt-6 rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card">
              {renderCapturePanel()}
            </section>
          ) : (
            <section className="mt-6 space-y-3">
              {modeCards.map((card) => (
                <div
                  key={card.mode}
                  className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-4 shadow-card"
                >
                  <button
                    type="button"
                    onClick={() => handleModeSelect(card.mode)}
                    aria-expanded={activeMode === card.mode}
                    className={`flex w-full items-start justify-between gap-4 text-left transition-colors ${activeMode === card.mode ? "text-base-white" : "text-grey-300"}`}
                  >
                    <div>
                      <p className="text-label-lg uppercase tracking-[0.16em] text-grey-500">
                        {card.eyebrow}
                      </p>
                      <h2 className="mt-2 text-h2">{card.title}</h2>
                      <p className="mt-2 text-body text-grey-400">
                        {card.description}
                      </p>
                    </div>
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[22px] leading-none ${activeMode === card.mode ? "border-accent-primary/50 bg-accent-primary/15 text-accent-primary" : "border-grey-700/70 bg-grey-900/50 text-grey-400"}`}
                    >
                      {activeMode === card.mode ? "−" : "+"}
                    </div>
                  </button>

                  {activeMode === card.mode && (
                    <div className="mt-4 border-t border-grey-700/50 pt-4">
                      {card.mode === "manual" && renderManualPanel()}
                      {card.mode === "voice" && renderVoicePanel()}
                      {card.mode === "capture" && renderCapturePanel()}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
};

const ReviewStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "accent" | "success" | "warning" | "error";
}) => {
  const toneClasses: Record<
    "accent" | "success" | "warning" | "error",
    string
  > = {
    accent: "border-accent-primary/40 bg-accent-primary/15 text-accent-primary",
    success:
      "border-semantic-success/40 bg-semantic-success/15 text-semantic-success",
    warning:
      "border-semantic-warning/40 bg-semantic-warning/15 text-semantic-warning",
    error: "border-semantic-error/40 bg-semantic-error/15 text-semantic-error",
  };

  return (
    <div
      className={`rounded-[18px] border p-4 text-center ${toneClasses[tone]}`}
    >
      <p className="text-label-lg uppercase text-grey-300">{label}</p>
      <p className="mt-2 text-h3">{value}</p>
    </div>
  );
};
