# Aahar AI Project Overview

## What This Project Is

Aahar AI is a full-stack nutrition and fitness app that combines:

- authenticated user accounts with email OTP verification,
- a multi-step onboarding flow for collecting health and lifestyle data,
- a personalized dashboard powered by calculated nutrition targets,
- meal-plan generation with Gemini when available,
- deterministic fallback planning when Gemini is unavailable,
- food image analysis and food logging,
- persistent progress tracking in MongoDB.

The repository is organized as a monorepo with a React client and an Express/Mongoose server.

## High-Level Architecture

```text
client/  -> Vite + React + TypeScript + Redux Toolkit + RTK Query
server/  -> Express + TypeScript + Mongoose + JWT + Gemini + Nodemailer
```

The app follows a feature-first structure:

- the client keeps domain code grouped by feature (`auth`, `onboarding`, `dashboard`),
- the server keeps each API domain in its own module (`auth`, `user`, `dashboard`, `food`, `progress`, `meal-plan`),
- shared domain enums and types live in dedicated `types/` files so validation, models, and business logic stay aligned.

## Main User Journey

1. The user lands on the splash screen.
2. They sign up or log in.
3. New accounts receive an email OTP and must verify before continuing.
4. After login, the app checks whether onboarding is complete.
5. If onboarding is incomplete, the user is routed through a 10-step onboarding flow.
6. Once onboarding is saved, the dashboard becomes available.
7. The dashboard loads progress, active plans, and daily meal-plan data.
8. The user can log food manually or scan food images for AI analysis.
9. The backend updates the user’s daily progress and plan state.
10. The profile and workout tabs reuse the same authenticated shell layout.

## Client Architecture

### Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Redux Toolkit
- RTK Query
- Tailwind CSS

### Client Entry Points

- `client/src/main.tsx` bootstraps the app.
- `client/src/App.tsx` defines routing and top-level providers.
- `client/src/app/store.ts` configures Redux.
- `client/src/app/api/baseApi.ts` defines the shared RTK Query base client.

### Routing Structure

The app has two route groups:

- public routes: splash, login, signup, OTP verification,
- protected routes: onboarding, dashboard, food logging, workout, profile.

`ProtectedRoute` checks the authenticated user via `getMe`, then enforces onboarding completion before allowing access to the protected shell.

### Layout

`client/src/components/layout/AppLayout.tsx` is the authenticated shell:

- it renders the current route via `Outlet`,
- it adds a fixed mobile-style bottom navigation bar,
- it includes a central scan button that routes to `/log-food/scan`.

### State Management

Redux is used in two layers:

- one local slice for onboarding draft state,
- RTK Query for server state and caching.

`client/src/features/onboarding/onboardingSlice.ts` persists the in-progress onboarding draft to `sessionStorage`, which allows refresh recovery without keeping stale onboarding data after the tab is closed.

`client/src/app/api/baseApi.ts` is the shared query layer for all network calls. It:

- points at `VITE_API_URL` or `http://localhost:8000`,
- sends credentials with requests,
- retries once through `/auth/refresh` when a request returns `401`.

### Feature Modules

#### Auth

Location:

- `client/src/features/auth/`

Responsibilities:

- login and signup forms,
- OTP verification and resend flows,
- authenticated user lookup (`getMe`),
- route guarding through `ProtectedRoute`.

#### Onboarding

Location:

- `client/src/features/onboarding/`

Responsibilities:

- the 10-step onboarding flow,
- shared step constants and typed draft data,
- saving onboarding to `/user/onboarding`,
- updating the cached `getMe` result after completion.

#### Dashboard

Location:

- `client/src/features/dashboard/`

Responsibilities:

- loading the home dashboard,
- exposing daily progress mutation hooks,
- defining dashboard data types,
- supporting cache invalidation for progress updates.

### Page Organization

There are two layers of page files:

- older compatibility wrappers in `client/src/pages/*.tsx`,
- the actual page implementations in subfolders such as:
  - `client/src/pages/auth/`
  - `client/src/pages/dashboard/`
  - `client/src/pages/onboarding/`
  - `client/src/pages/log-food/`
  - `client/src/pages/profile/`

The wrapper files exist so imports can stay stable while the implementation was moved to a cleaner folder layout.

### Client Utilities and UI

Useful supporting pieces:

- `client/src/components/ui/` contains reusable primitives like buttons, inputs, loaders, and scroll controls,
- `client/src/utils/imageCompression.ts` compresses uploaded food images before sending them to the backend,
- `client/src/theme.ts`, `client/src/index.css`, and `client/src/App.css` hold styling and design tokens.

## Server Architecture

### Tech Stack

- Express 5
- TypeScript
- Mongoose
- MongoDB
- JWT
- bcryptjs
- cookie-parser
- cors
- morgan
- nodemailer
- sharp
- Zod
- Google Generative AI

### Server Entry Point

`server/src/index.ts` wires the app together:

- loads environment config,
- connects to MongoDB,
- enables CORS with credentials,
- parses JSON and URL-encoded payloads with a large body limit for base64 images,
- mounts versioned routes under `/api/v1`,
- serves the built client in production,
- registers `notFound` and `errorHandler` middleware.

### Configuration

`server/src/config/env.config.ts` validates every required environment variable with Zod before the app starts. This makes the process fail fast when secrets or URLs are missing.

`server/src/config/db.config.ts` opens the MongoDB connection using the validated `MONGO_URI`.

### Route Modules

All v1 routes are mounted from `server/src/routes/v1/index.ts`.

#### `/api/v1/auth`

Files:

- `server/src/modules/auth/auth.routes.ts`
- `server/src/modules/auth/auth.controller.ts`

Responsibilities:

- signup,
- login,
- OTP verification,
- OTP resend,
- token refresh,
- logout,
- authenticated `me` lookup.

Auth uses:

- hashed passwords,
- OTPs hashed before storage,
- access and refresh cookies,
- email verification before login,
- protected `me` access through `authenticate`.

#### `/api/v1/user`

Files:

- `server/src/modules/user/user.routes.ts`
- `server/src/modules/user/user.controller.ts`

Responsibilities:

- fetch onboarding data,
- save onboarding profile data,
- mark onboarding as complete.

This route group requires authentication.

#### `/api/v1/dashboard`

Files:

- `server/src/modules/dashboard/dashboard.routes.ts`
- `server/src/modules/dashboard/dashboard.controller.ts`
- `server/src/modules/dashboard/dashboard.service.ts`

Responsibilities:

- build the home dashboard,
- generate or refresh the active plan,
- update today’s progress,
- provide today’s and weekly meal plans.

This module combines:

- user profile data,
- progress state,
- nutrition calculations,
- Gemini meal-plan generation,
- deterministic fallback generation.

#### `/api/v1/food`

Files:

- `server/src/modules/food/food.routes.ts`
- `server/src/modules/food/food.controller.ts`

Responsibilities:

- analyze food images with Gemini,
- validate uploaded image payloads,
- log analyzed food into daily progress.

### Middleware

Key middleware lives in `server/src/middlewares/`:

- `auth.middleware.ts` reads the access token from cookies or a Bearer header and loads `req.user`,
- `errorHandler.ts` normalizes server errors,
- `notFound.ts` handles unknown routes.

### Auth and Session Handling

The auth flow uses short-lived access tokens and longer-lived refresh tokens.

Important utilities:

- `server/src/utils/jwt.ts` signs and verifies JWTs,
- `server/src/utils/cookie.ts` attaches and clears HTTP-only cookies,
- `server/src/utils/otp.ts` generates verification codes,
- `server/src/services/email/email.service.ts` sends OTP emails.

Cookies are configured to be HTTP-only, with production/staging secure behavior and environment-aware `sameSite` settings.

## Data Model

### User

`server/src/modules/user/user.model.ts`

Stores:

- email and password,
- email verification state,
- OTP hash and expiry,
- onboarding completion flag,
- onboarding profile data:
  - name,
  - gender,
  - age,
  - height,
  - weight,
  - goal,
  - activity level,
  - daily steps,
  - dietary preferences,
  - medical conditions.

### User Progress

`server/src/modules/progress/userProgress.model.ts`

Stores:

- the active plan,
- historical plans,
- daily progress entries,
- timestamps for plan generation and progress updates.

Each daily progress entry contains:

- targets,
- actuals,
- adherence score,
- status (`not_started`, `in_progress`, `completed`, `missed`),
- optional notes.

### Meal Plan

`server/src/modules/meal-plan/mealPlan.model.ts`

Stores:

- a weekly plan,
- the week start date,
- generation source (`gemini` or `fallback`),
- a nutrition-profile snapshot,
- optional prompt context and raw Gemini response.

This model is intentionally structured to preserve both the AI-generated content and enough metadata to audit or regenerate it later.

## AI and Nutrition Engine

### Nutrition Calculator

`server/src/utils/nutrition.calculator.ts` centralizes the physiology and nutrition math:

- BMR calculation,
- maintenance calories,
- goal-adjusted calorie targets,
- macro allocation,
- hydration targets,
- micro limits,
- safety checks,
- medical condition normalization,
- step-count to activity-level reconciliation.

This file is the source of truth for nutrition math. Other parts of the codebase consume its outputs rather than duplicating formulas.

### Gemini Meal Plans

`server/src/services/ai/gemini.service.ts` generates structured JSON meal plans and validates the returned payloads before they are used.

The dashboard controller:

- tries Gemini first when configured,
- stores the generated plan and raw response,
- falls back to a deterministic plan when Gemini is unavailable or fails.

### Food Analysis

`server/src/services/ai/foodAnalysis.service.ts` analyzes food photos plus text descriptions.

It includes:

- image optimization via `sharp`,
- retry and rate-limit handling,
- Gemini response validation,
- quota-aware error messages.

The client complements this by compressing images in `client/src/utils/imageCompression.ts` before upload.

## API Surface Summary

Important server endpoints:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/resend-otp`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/user/onboarding`
- `PATCH /api/v1/user/onboarding`
- `GET /api/v1/dashboard/home`
- `POST /api/v1/dashboard/plan/generate`
- `PATCH /api/v1/dashboard/progress/today`
- `GET /api/v1/dashboard/meal-plan/today`
- `GET /api/v1/dashboard/meal-plan/week`
- `POST /api/v1/food/analyze`
- `POST /api/v1/food/log`

## Conventions And Notes

- The project uses shared enums/types for onboarding and progress so client and server stay in sync.
- Server validation is primarily done with Zod before any database writes.
- RTK Query caching is used heavily on the client, with explicit tags for `Me` and `Dashboard`.
- The authenticated UI is mobile-first and uses a bottom tab layout.
- The repo currently contains `server/dist/`, which is build output and should be treated as generated artifacts.
- Some files under `client/src/pages/*.tsx` are compatibility shims that re-export the newer folder-based page components.

## Directory Map

```text
client/
  src/
    app/                 Redux store and RTK Query base API
    assets/              Static assets and reference documents
    components/          Shared layout and UI primitives
    features/            Domain-focused feature slices
    pages/               Route components and compatibility wrappers
    utils/               Client-side helpers
    main.tsx             React bootstrap
    App.tsx              Router definition

server/
  src/
    config/              Environment and database setup
    middlewares/         Auth, error, and 404 handlers
    modules/             Feature modules by API domain
    services/            Email and AI services
    types/               Shared server-side enums and interfaces
    utils/               JWT, cookies, calculations, helpers
    validators/          Zod request validators
    index.ts             Express app bootstrap
```

## In One Sentence

Aahar AI is a feature-first, AI-assisted nutrition tracking app where the client manages authenticated user journeys and the server owns the nutrition logic, progress persistence, and Gemini-backed personalization.
