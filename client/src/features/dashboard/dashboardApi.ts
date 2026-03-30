import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";
import type {
  HomeDashboardResponse,
  UpdateTodayProgressRequest,
} from "./dashboard.types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHomeDashboard: builder.query<HomeDashboardResponse, void>({
      query: () => "/dashboard/home",
      providesTags: [ApiTags.DASHBOARD],
    }),
    updateTodayProgress: builder.mutation<
      HomeDashboardResponse,
      UpdateTodayProgressRequest
    >({
      query: (body) => ({
        url: "/dashboard/progress/today",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [ApiTags.DASHBOARD],
    }),
  }),
});

export const { useGetHomeDashboardQuery, useUpdateTodayProgressMutation } =
  dashboardApi;
