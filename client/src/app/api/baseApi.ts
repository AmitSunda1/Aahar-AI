import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { apiTagTypes } from "./apiTags";

// Base query pointing to our API
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  credentials: "include",
});

const shouldSkipReauth = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  return url.startsWith("/auth/");
};

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !shouldSkipReauth(args)) {
    const refreshResult = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      console.error("Token refresh failed. User needs to log in again.");
    }
  }

  return result;
};

export const baseApi = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: apiTagTypes,
  endpoints: () => ({}),
});
