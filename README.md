# Aahar AI

Aahar AI is a full-stack, mobile-first nutrition and fitness app built for Indian lifestyles. It turns onboarding data into personalized calorie and macro targets, generates meal plans, analyzes food photos or text logs, and tracks daily progress, workouts, and user profile data.

## What It Does

- Email OTP signup, login, password reset, and authenticated sessions
- Multi-step onboarding to collect health, lifestyle, and dietary data
- Personalized dashboard with nutrition targets and progress tracking
- AI-powered food analysis from image or text input
- Daily food logging and workout session tracking
- Weekly meal-plan generation with a deterministic fallback when Gemini is unavailable
- PWA support with install prompt and offline fallback

## Tech Stack

### Client
- React 19
- TypeScript
- Vite
- React Router
- Redux Toolkit
- RTK Query
- Tailwind CSS
- vite-plugin-pwa

### Server
- Express 5
- TypeScript
- MongoDB and Mongoose
- Zod
- JWT cookies
- bcryptjs
- Nodemailer
- Sharp
- Google Gemini API

## Architecture

The repository is organized as a monorepo:

- `client/` contains the React application
- `server/` contains the Express API and business logic

The app follows a feature-first structure:

- Auth, onboarding, dashboard, and food logic are grouped in separate client features
- Auth, user, dashboard, food, progress, and meal-plan are separated into server modules
- Shared nutrition and onboarding enums/types live in dedicated type files so validation, models, and business rules stay aligned

## Main User Flow

1. User lands on the splash screen.
2. User signs up or logs in.
3. New users verify their email via OTP.
4. The app checks whether onboarding is complete.
5. If onboarding is incomplete, the user completes the 10-step onboarding flow.
6. The dashboard loads personalized nutrition targets, progress, and meal-plan data.
7. The user can log food manually or scan food images for AI analysis.
8. Workout progress and daily metrics are updated through the dashboard.

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- MongoDB connection string
- Gmail or SMTP account for email OTP delivery
- Gemini API key if you want AI meal planning and food analysis

### Client Setup

```bash
cd client
npm install
npm run dev
```

The client runs on the Vite dev server.

### Server Setup

```bash
cd server
npm install
npm run dev
```

The server uses `ts-node-dev` in development.

## Environment Variables

### Client

Create a `.env` file in `client/`:

```bash
VITE_API_URL=http://localhost:8000
```

### Server

Create a `.env` file in `server/`:

```bash
NODE_ENV=development
PORT=8000
MONGO_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173
JWT_ACCESS_SECRET=your_long_access_secret_here
JWT_REFRESH_SECRET=your_long_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_USER=your_email@example.com
EMAIL_APP_PASSWORD=your_email_app_password
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

`GEMINI_API_KEY` is optional, but AI meal-plan and food-analysis features will be unavailable without it.

## Available Scripts

### Client

- `npm run dev` - start development server
- `npm run build` - type-check and build for production
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build

### Server

- `npm run dev` - start the API in development
- `npm run build` - compile TypeScript
- `npm run start` - run the compiled server from `dist/`

## Notable Features

- 10-step onboarding flow with draft persistence in `sessionStorage`
- RTK Query re-auth flow that retries once through `/auth/refresh` on `401`
- Personalized nutrition calculations based on weight, height, age, gender, activity level, steps, and medical conditions
- Meal-plan generation with Gemini and a deterministic fallback path
- Food image optimization before sending images to Gemini
- PWA manifest, offline fallback page, and service-worker caching strategy
- Mobile bottom-tab layout with a central food-scan action

## Project Structure

```text
client/
  src/
    app/
    components/
    features/
    pages/
    utils/
server/
  src/
    config/
    middlewares/
    modules/
    routes/
    services/
    types/
    utils/
    validators/
```

## License

No license has been specified in this repository.
