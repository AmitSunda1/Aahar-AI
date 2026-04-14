import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";

interface User {
  _id: string;
  email: string;
  isEmailVerified: boolean;
  isCompletedOnboarding: boolean;
  name?: string;
  gender?: "male" | "female" | "other";
  age?: number;
  height?: {
    value: number;
    unit: "cm" | "ft" | "in";
  };
  weight?: {
    value: number;
    unit: "kg" | "lb" | "lbs";
  };
  goal?: "lose_weight" | "maintain_weight" | "gain_weight" | "build_muscle";
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dailySteps?: number;
  dietaryPreferences?: Array<
    | "vegetarian"
    | "vegan"
    | "pescatarian"
    | "gluten_free"
    | "dairy_free"
    | "nut_free"
    | "soy_free"
  >;
  medicalConditions?: string[];
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

interface MessageResponse {
  success: boolean;
  message: string;
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

interface ResendOtpRequest {
  email: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: [ApiTags.ME],
    }),
    signup: builder.mutation<MessageResponse, any>({
      query: (userData) => ({
        url: "/auth/signup",
        method: "POST",
        body: userData,
      }),
    }),
    verifyOtp: builder.mutation<AuthResponse, VerifyOtpRequest>({
      query: (body) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body,
      }),
      invalidatesTags: [ApiTags.ME],
    }),
    resendOtp: builder.mutation<MessageResponse, ResendOtpRequest>({
      query: (body) => ({
        url: "/auth/resend-otp",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<MessageResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<AuthResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
      invalidatesTags: [ApiTags.ME],
    }),
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(baseApi.util.resetApiState());
        } catch {
          // Leave cached state in place if logout fails.
        }
      },
    }),
    getMe: builder.query<AuthResponse, void>({
      query: () => "/auth/me",
      providesTags: [ApiTags.ME],
    }),
    changePassword: builder.mutation<
      { success: boolean; message: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useGetMeQuery,
  useChangePasswordMutation,
} = authApi;
