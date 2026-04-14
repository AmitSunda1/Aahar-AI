import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";

export interface FoodAnalysisResult {
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

interface FoodAnalysisResponse {
  success: boolean;
  message: string;
  data: FoodAnalysisResult;
}

interface LogFoodResponse {
  success: boolean;
  message: string;
  data: {
    logged: {
      foodName: string;
      macros: FoodAnalysisResult["macros"];
    };
    updatedProgress: unknown;
  };
}

export interface AnalyzeFoodTextRequest {
  description: string;
  quantity?: number;
  unit?: "g" | "ml" | "pc" | "cup" | "tbsp" | "oz" | "l";
  notes?: string;
}

export interface AnalyzeFoodImageRequest extends AnalyzeFoodTextRequest {
  image: string;
  mimeType: string;
}

export const foodApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    analyzeFoodText: builder.mutation<FoodAnalysisResponse, AnalyzeFoodTextRequest>({
      query: (body) => ({
        url: "/food/describe",
        method: "POST",
        body,
      }),
    }),
    analyzeFoodImage: builder.mutation<
      FoodAnalysisResponse,
      AnalyzeFoodImageRequest
    >({
      query: (body) => ({
        url: "/food/analyze",
        method: "POST",
        body,
      }),
    }),
    logFood: builder.mutation<
      LogFoodResponse,
      { foodName: string; macros: FoodAnalysisResult["macros"] }
    >({
      query: (body) => ({
        url: "/food/log",
        method: "POST",
        body,
      }),
      invalidatesTags: [ApiTags.DASHBOARD],
    }),
  }),
});

export const {
  useAnalyzeFoodTextMutation,
  useAnalyzeFoodImageMutation,
  useLogFoodMutation,
} = foodApi;
