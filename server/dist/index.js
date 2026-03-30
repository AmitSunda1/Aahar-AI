"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const env_config_1 = require("./config/env.config");
const db_config_1 = __importDefault(require("./config/db.config"));
const index_1 = __importDefault(require("./routes/v1/index"));
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
const notFound_1 = __importDefault(require("./middlewares/notFound"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
(0, db_config_1.default)();
const app = (0, express_1.default)();
if (env_config_1.env.NODE_ENV === "development") {
    app.use((0, morgan_1.default)("dev"));
}
const corsOptions = {
    origin: env_config_1.env.FRONTEND_URL,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-VERIFY", "x-verify"],
};
app.use((0, cors_1.default)(corsOptions));
app.use((0, cookie_parser_1.default)());
// Apply express.json() to all other routes
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/v1", index_1.default);
if (env_config_1.env.NODE_ENV === "production") {
    const buildPath = path_1.default.join(__dirname, "..", "..", "client", "dist");
    app.use(express_1.default.static(buildPath));
    app.get("*", (req, res) => {
        res.sendFile(path_1.default.resolve(buildPath, "index.html"));
    });
}
app.use(notFound_1.default);
app.use(errorHandler_1.default);
const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const PORT = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) : env_config_1.env.PORT;
const server = (0, http_1.createServer)(app);
server.listen(PORT, () => {
    console.log(`Server running in ${env_config_1.env.NODE_ENV} mode on port ${PORT}`);
});
