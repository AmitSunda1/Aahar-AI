# Understanding Aahar AI: The Detailed Architecture & Flow

Aahar AI is a complex, AI-powered nutrition and fitness platform. While the user experiences a simple app that generates meal plans and analyzes food photos, underneath is a robust, strictly typed framework. This document breaks down the actual files, code structure, and logic powering the platform.

---

## 1. The Big Picture: How the App is Divided

Aahar AI is a **monorepo**, meaning both the front-end (Client) and the back-end (Server) live in the same project repository. 

* **The Client (`/client/src`)**: The user interface, built with React 19, TypeScript, and Tailwind CSS. It focuses on rendering the screens, saving local drafts, and talking to the server.
* **The Server (`/server/src`)**: The brain of the operation, built with Node.js, Express 5, and MongoDB. It handles authentication, database storage, scientific nutrition math, and talks to Google's Gemini AI.

---

## 2. The Client: What Happens on the Screen (`/client`)

The client side is structured "feature-first." Instead of lumping all components into one folder, code is grouped by what it does:

### State Management & APIs (`/app` & `/features`)
Instead of using basic React state, the app uses **Redux Toolkit** and **RTK Query** for heavy lifting:
* **`baseApi.ts` & `dashboardApi.ts`**: These files define exactly how the app talks to the server. When you load the dashboard, RTK Query fetches the data. When you log food, the app sends a `PATCH` request to the server, and RTK Query automatically "invalidates" the cache (using `ApiTags.DASHBOARD`). This means your progress bars visually update on the screen instantly without needing to refresh the page.
* **`onboardingSlice.ts`**: During the 10-step onboarding, your answers are saved locally in `sessionStorage`. If you accidentally close the tab halfway through, your draft is saved so you don't have to start over.

### UI & Styling
* **Tailwind CSS (`index.css`, `theme.ts`)**: Everything you see—colors, paddings, rounded corners—is powered by Tailwind utility classes to ensure a responsive, mobile-first design.
* **Common Components (`/components/ui`)**: Reusable Lego blocks like Buttons or Input rows are stored here to keep the design consistent.

---

## 3. The Server: The Brain Behind the App (`/server`)

The server is heavily organized and heavily protected. It never trusts the client and always double-checks data.

### Strict Data Models (MongoDB & Mongoose)
In `/modules/user/user.model.ts`, the database schema is strictly defined. It stores:
* Basic Auth (Email, hashed password, verification status).
* Onboarding Profile (Height, weight, activity level).
* **Medical Conditions & Dietary Preferences**: Instead of just text, these are strict lists (Enums). The database explicitly stores if a user has PCOS, Diabetes, CKD (Chronic Kidney Disease), or is pregnant.

### The Bouncer: Zod Validators (`/validators`)
Before any data reaches the database, it goes through **Zod**. If a user tries to send a height of 500 inches, or if the AI returns a meal plan missing the "calories" field, Zod catches it instantly and rejects the request, keeping the database perfectly clean and crash-free.

---

## 4. The Scientific Engine: `nutrition.calculator.ts`

This is arguably the most important file in the project. The app doesn't guess your nutrition; it calculates it based on clinical formulas.

Inside `nutrition.calculator.ts`, the following happens:
1. **BMR Calculation**: It uses the scientifically backed **Mifflin-St Jeor equation** to find your Basal Metabolic Rate (calories burned just staying alive).
2. **Activity Multipliers**: It cross-references your self-reported activity level with your actual daily steps to ensure you aren't over-reporting how active you are.
3. **Medical Overrides (Safety First)**:
   * **PCOS**: Forces a calorie floor of 1,400 kcal to prevent metabolic damage.
   * **Pregnancy**: Disables "lose weight" goals entirely, reverting the user to maintenance calories.
   * **CKD / Kidney Disease**: Strictly caps protein intake (0.6g per kilo of body weight) to reduce renal workload.
   * **Hypertension**: Limits daily sodium intake to 1,500mg.
4. **Calculations**: It perfectly balances Macros (Protein, Carbs, Fat) and calculates daily water intake based on weight and exercise duration.

---

## 5. The Artificial Intelligence: Google Gemini (`/services/ai`)

Aahar AI uses Google's Gemini AI, but it is highly controlled by the server. 

### Meal Plan Generation (`gemini.service.ts`)
When the app needs a meal plan:
* The server writes a massive, dynamic prompt including all your calculated macros, food allergies, and medical conditions.
* It sends this to Gemini, specifically asking for the response in **JSON format**. 
* The `temperature` (AI creativity) is set low (`0.4` or `0.5`) so the AI doesn't hallucinate; it stays strict and mathematical.
* **Rate Limits**: The app uses a `rateLimitManager` so that if Gemini is overloaded, the server automatically waits and retries without crashing the user's app. If Gemini fully goes down, the app has a fallback system that hands you a deterministic backup menu.

### Food Image Analysis (`foodAnalysis.service.ts`)
When you take a picture of your food:
1. **Optimization**: Photos are massive. The `optimizeImageForGemini.service.ts` shrinks the image and converts it to a standard `.webp` format. This saves incredible amounts of bandwidth and AI processing costs.
2. **Analysis**: The compressed image, along with any text notes you added (like "I ate two of these"), is sent to the Gemini Vision AI. 
3. **The AI's Job**: The AI identifies the food and breaks it down into exact grams of protein, carbs, fats, and total calories, returning it in a structured package.
4. **Validation**: The server runs the AI's answer through Zod validators to guarantee the numbers are real, and then adds those calories right into your daily progress tracker.

---

## 6. Security and Authentication (`/utils/otp.ts` & `jwt.ts`)

How does the app know it's you?
1. **Email OTPs**: When you sign up, an email is sent to you with a One-Time Password via `nodemailer`.
2. **JWT Cookies**: Once verified, the server generates a JSON Web Token (JWT) and locks it inside an `HTTP-only cookie`. This is a highly secure digital nametag. Your browser automatically sends this cookie with every request (like logging food), proving who you are without you needing to log in again. Hackers can't easily steal this cookie using malicious scripts.

## Summary

In short, **Aahar AI** operates like a strict, highly clinical nutritionist funneling custom data into an advanced AI brain. 

1. **Client** provides a fast, cached UI.
2. **Nutrition Calculator** acts as the clinical safety net, crunching your numbers against strict medical rules.
3. **Gemini AI** acts as the intelligent assistant, parsing photos and drafting custom menus.
4. **MongoDB & Zod** ensure your data is always safe, strictly formatted, and permanently saved.
