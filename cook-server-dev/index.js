import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { authenticateToken } from "./middleware/auth.js"; // ✅ 여기 수정

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import ingredientsRoutes from './routes/ingredients.js';
import recipesRoutes from './routes/recipes.js';
import aiRoutes from './routes/ai.js';

import sttRoutes from './routes/sttRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import completedRecipesRoutes from './routes/completedRecipes.js';

import communityRoutes from "./routes/community.js";
import savedRoutes from "./routes/saved.js";




dotenv.config();

/* ✅✅✅ app 선언은 무조건 제일 먼저 */
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// Middleware
// ============================================

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // 서버 내부 호출 (curl, pm2, health check 등)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ CORS 차단:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ============================================
// Body Parser
// ============================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================
// Logger
// ============================================

process.env.NODE_ENV !== "production"
  ? app.use(morgan("dev"))
  : app.use(morgan("combined"));

// ============================================
// Routes
// ============================================

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/voice", sttRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ingredients", ingredientsRoutes);
app.use("/api/recipes", recipesRoutes);
app.use("/api", aiRoutes);

app.use("/api/receipt", receiptRoutes);
app.use("/api/completed-recipes", completedRecipesRoutes);

/* ✅✅✅ 여기서부터 보호 라우트 */
app.use("/api/community", authenticateToken, communityRoutes);
app.use("/api/saved", authenticateToken, savedRoutes);


// ============================================
// Error Handling
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.url} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? "OK" : "X"}`);
  console.log(`🔑 JWT: ${process.env.JWT_SECRET ? "OK" : "X"}`);
});

export default app;
