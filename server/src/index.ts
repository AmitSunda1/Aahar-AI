import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { env } from "./config/env.config";
import connectDB from "./config/db.config";
import v1Routes from "./routes/v1/index";
import errorHandlerMiddleware from "./middlewares/errorHandler";
import notFoundMiddleware from "./middlewares/notFound";
import cookieParser from "cookie-parser";

dotenv.config();

connectDB();

const app = express();

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const allowedOrigins = [env.FRONTEND_URL, ...env.FRONTEND_URLS];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-VERIFY", "x-verify"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

// Increase size limits to support base64-encoded images from mobile devices
// Base64 encoding increases size by ~33%, so 50MB limit supports ~37MB images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/v1", v1Routes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const PORT = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) : env.PORT;

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});
