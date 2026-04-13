import { useState, useRef } from "react";
import { useUpdateTodayProgressMutation } from "../../features/dashboard/dashboardApi";
import { Loader } from "../../components/ui/Loader";
import { compressImage } from "../../utils/imageCompression";

interface AnalysisResult {
  foodName: string;
  description: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  };
  confidence: "high" | "medium" | "low";
  servingSize?: string;
  additionalInfo?: string;
  dietaryTags?: string[];
}

type UploadStep = "upload" | "describe" | "analyzing" | "results";

export const ScanFood = () => {
  const [uploadStep, setUploadStep] = useState<UploadStep>("upload");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState<"g" | "ml" | "pc" | "cup" | "tbsp" | "oz" | "l">("g");
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [updateTodayProgress] = useUpdateTodayProgressMutation();

  const handleImageSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (max 2MB for mobile optimization)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError(
        `Image size must be less than 2MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      );
      return;
    }

    setImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
      setUploadStep("describe");
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
      setUploadStep("describe");
    }
  };

  const handleAnalyze = async () => {
    if (!image || !description.trim()) {
      setError("Please provide a description for the food");
      return;
    }

    setIsAnalyzing(true);
    setUploadStep("analyzing");
    setError(null);

    try {
      // Compress image to reduce payload size (especially for mobile)
      const compressedBase64 = await compressImage(image, 1200, 1200, 0.75);
      const base64Data = compressedBase64.split(",")[1];
      const mimeType = image.type || "image/jpeg";

      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
        const response = await fetch(`${apiUrl}/food/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            image: base64Data,
            mimeType,
            description: description.trim(),
            quantity: quantity ? Number(quantity) : undefined,
            unit: quantity ? unit : undefined,
            notes: notes.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage =
            errorData.message || "Failed to analyze food image";

          // Check if it's a rate limit error
          if (response.status === 429) {
            setError(
              `AI system is busy: ${errorMessage}. Please wait a moment and try again.`,
            );
            // Start countdown timer
            startRetryCountdown();
          } else {
            setError(errorMessage);
          }

          setUploadStep("describe");
          return;
        }

        const data = await response.json();
        setAnalysis(data.data);
        setUploadStep("results");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to analyze image";
        setError(message);
        setUploadStep("describe");
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to compress image. Please try a different image.";
      setError(message);
      setUploadStep("describe");
      setIsAnalyzing(false);
    }
  };

  const startRetryCountdown = () => {
    setRetryCountdown(10); // 10 second countdown
    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAccept = async () => {
    if (!analysis) return;

    setIsLogging(true);
    setError(null);

    try {
      // Log to daily progress
      await updateTodayProgress({
        caloriesConsumed: analysis.macros.calories,
        proteinConsumed: analysis.macros.protein,
        carbsConsumed: analysis.macros.carbs,
        fatConsumed: analysis.macros.fat,
        notes: [`Added: ${analysis.foodName}`],
      }).unwrap();

      // Reset form and show success
      setUploadStep("upload");
      setImage(null);
      setImagePreview("");
      setDescription("");
      setQuantity("");
      setUnit("g");
      setNotes("");
      setAnalysis(null);

      // Show success message
      alert(`${analysis.foodName} has been logged to your daily intake!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to log food";
      setError(message);
    } finally {
      setIsLogging(false);
    }
  };

  const handleReject = () => {
    setUploadStep("describe");
    setAnalysis(null);
    setError(null);
  };

  const resetForm = () => {
    setUploadStep("upload");
    setImage(null);
    setImagePreview("");
    setDescription("");
    setQuantity("");
    setUnit("g");
    setNotes("");
    setAnalysis(null);
    setError(null);
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-base-black px-4 pb-8 pt-6 text-base-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-h1">Scan Food</h1>
        <p className="mt-1 text-body text-grey-500">
          Upload or capture a photo of your food to analyze its nutritional
          content
        </p>
      </div>

      {error && (
        <div className={`mb-4 rounded-[18px] border p-4 text-body ${
          error.includes("busy") || error.includes("quota")
            ? "border-semantic-warning/40 bg-semantic-warning/10 text-semantic-warning"
            : "border-semantic-error/40 bg-semantic-error/10 text-grey-300"
        }`}>
          {error}
        </div>
      )}

      {/* UPLOAD STEP */}
      {uploadStep === "upload" && (
        <section className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-6 shadow-card">
          <div className="mb-6 text-center">
            <h2 className="text-h2">Choose how to upload</h2>
            <p className="mt-2 text-body text-grey-500">
              Take a photo or upload an existing image
            </p>
          </div>

          <div className="space-y-3">
            {/* Camera Capture */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-[20px] border-2 border-accent-primary/50 bg-accent-primary/10 p-6 transition-all hover:border-accent-primary hover:bg-accent-primary/20"
            >
              <div className="text-center">
                <p className="text-[32px] leading-none">📷</p>
                <p className="mt-2 text-h3 text-accent-primary">Take Photo</p>
                <p className="mt-1 text-body text-grey-400">
                  Use your device camera
                </p>
              </div>
            </button>

            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-[20px] border-2 border-grey-700/70 bg-grey-900/40 p-6 transition-all hover:border-grey-600 hover:bg-grey-900/60"
            >
              <div className="text-center">
                <p className="text-[32px] leading-none">📁</p>
                <p className="mt-2 text-h3 text-grey-300">Upload Image</p>
                <p className="mt-1 text-body text-grey-400">
                  Choose from your gallery
                </p>
              </div>
            </button>

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
          </div>
        </section>
      )}

      {/* DESCRIBE STEP */}
      {uploadStep === "describe" && imagePreview && (
        <section className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-6 shadow-card">
          {/* Image Preview */}
          <div className="mb-6 rounded-[20px] border border-grey-700/50 overflow-hidden bg-black">
            <img
              src={imagePreview}
              alt="Food preview"
              className="w-full h-64 object-cover"
            />
          </div>

          {/* Description Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-label-lg uppercase text-grey-300 mb-2">
                Food Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grilled chicken breast with rice and vegetables"
                className="w-full rounded-[12px] border border-grey-700/50 bg-grey-900/40 px-4 py-3 text-body text-base-white placeholder-grey-500 focus:border-accent-primary focus:outline-none"
                rows={3}
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-lg uppercase text-grey-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="e.g., 200"
                  min="0.1"
                  step="0.1"
                  className="w-full rounded-[12px] border border-grey-700/50 bg-grey-900/40 px-4 py-3 text-body text-base-white placeholder-grey-500 focus:border-accent-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label-lg uppercase text-grey-300 mb-2">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) =>
                    setUnit(
                      e.target.value as
                        | "g"
                        | "ml"
                        | "pc"
                        | "cup"
                        | "tbsp"
                        | "oz"
                        | "l",
                    )
                  }
                  className="w-full rounded-[12px] border border-grey-700/50 bg-grey-900/40 px-4 py-3 text-body text-base-white focus:border-accent-primary focus:outline-none"
                >
                  <option value="g">Grams (g)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pc">Piece (pc)</option>
                  <option value="cup">Cup</option>
                  <option value="tbsp">Tablespoon (tbsp)</option>
                  <option value="oz">Ounce (oz)</option>
                  <option value="l">Liter (l)</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-label-lg uppercase text-grey-300 mb-2">
                Additional Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Cooked with olive oil, lightly salted"
                maxLength={200}
                className="w-full rounded-[12px] border border-grey-700/50 bg-grey-900/40 px-4 py-3 text-body text-base-white placeholder-grey-500 focus:border-accent-primary focus:outline-none"
              />
              <p className="mt-1 text-caption text-grey-500">
                {notes.length}/200
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-grey-700/50">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-[14px] border border-grey-700/50 bg-grey-900/40 px-6 py-3 text-h3 text-grey-300 transition-colors hover:bg-grey-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing ||
                  !description.trim() ||
                  retryCountdown > 0
                }
                className="rounded-[14px] border-2 border-accent-primary bg-accent-primary px-6 py-3 text-h3 text-base-white transition-all disabled:opacity-50 hover:enabled:shadow-[0_10px_30px_rgba(11,95,255,0.22)]"
              >
                {isAnalyzing
                  ? "Analyzing..."
                  : retryCountdown > 0
                    ? `Retry in ${retryCountdown}s`
                    : "Analyze"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ANALYZING STEP */}
      {uploadStep === "analyzing" && <Loader />}

      {/* RESULTS STEP */}
      {uploadStep === "results" && analysis && (
        <section className="space-y-4">
          {/* Food Info Card */}
          <div className="rounded-[24px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-h2">{analysis.foodName}</h2>
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

            {analysis.servingSize && (
              <p className="text-body text-grey-400 mb-4">
                Serving: {analysis.servingSize}
              </p>
            )}

            {analysis.additionalInfo && (
              <p className="text-body text-grey-400 mb-4">
                {analysis.additionalInfo}
              </p>
            )}

            {analysis.dietaryTags && analysis.dietaryTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.dietaryTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block rounded-full bg-accent-primary/15 px-3 py-1 text-label-sm text-accent-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Macros Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <MacroCard
              label="Calories"
              value={Math.round(analysis.macros.calories)}
              unit="kcal"
              color="accent-primary"
            />
            <MacroCard
              label="Protein"
              value={analysis.macros.protein.toFixed(1)}
              unit="g"
              color="semantic-success"
            />
            <MacroCard
              label="Carbs"
              value={analysis.macros.carbs.toFixed(1)}
              unit="g"
              color="semantic-warning"
            />
            <MacroCard
              label="Fat"
              value={analysis.macros.fat.toFixed(1)}
              unit="g"
              color="semantic-error"
            />
          </div>

          {/* Additional Macros if available */}
          {(analysis.macros.fiber || analysis.macros.sugar) && (
            <div className="rounded-[20px] border border-grey-700/50 bg-grey-900/40 p-4">
              <h3 className="text-h3 mb-3">Additional Info</h3>
              <div className="space-y-2">
                {analysis.macros.fiber !== undefined && (
                  <div className="flex justify-between text-body">
                    <span className="text-grey-400">Fiber</span>
                    <span className="text-base-white">
                      {analysis.macros.fiber.toFixed(1)}g
                    </span>
                  </div>
                )}
                {analysis.macros.sugar !== undefined && (
                  <div className="flex justify-between text-body">
                    <span className="text-grey-400">Sugar</span>
                    <span className="text-base-white">
                      {analysis.macros.sugar.toFixed(1)}g
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={handleReject}
              className="rounded-[14px] border border-grey-700/50 bg-grey-900/40 px-6 py-4 text-h3 text-grey-300 transition-colors hover:bg-grey-900/60"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isLogging}
              className="rounded-[14px] border-2 border-accent-primary bg-accent-primary px-6 py-4 text-h3 text-base-white transition-all disabled:opacity-50 hover:enabled:shadow-[0_10px_30px_rgba(11,95,255,0.22)]"
            >
              {isLogging ? "Logging..." : "Log Food"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Helper Component: Macro Card
// ────────────────────────────────────────────────────────────────────────────

interface MacroCardProps {
  label: string;
  value: string | number;
  unit: string;
  color:
    | "accent-primary"
    | "semantic-success"
    | "semantic-warning"
    | "semantic-error";
}

const MacroCard = ({ label, value, unit, color }: MacroCardProps) => {
  const colorClasses: Record<string, string> = {
    "accent-primary":
      "bg-accent-primary/15 border-accent-primary/40 text-accent-primary",
    "semantic-success":
      "bg-semantic-success/15 border-semantic-success/40 text-semantic-success",
    "semantic-warning":
      "bg-semantic-warning/15 border-semantic-warning/40 text-semantic-warning",
    "semantic-error":
      "bg-semantic-error/15 border-semantic-error/40 text-semantic-error",
  };

  return (
    <div
      className={`rounded-[16px] border ${colorClasses[color]} p-4 text-center`}
    >
      <p className="text-label-lg uppercase text-grey-300">{label}</p>
      <p className="mt-2 text-h2">
        {value}
        <span className="text-body text-grey-400"> {unit}</span>
      </p>
    </div>
  );
};
