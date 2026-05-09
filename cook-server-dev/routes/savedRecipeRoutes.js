import express from "express";
import {
  getSavedRecipes,
  saveRecipe,
  removeSavedRecipe
} from "../controllers/savedRecipeControllers.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// 모든 저장된 레시피 관련 경로는 인증 필요
router
  .route("/")
  .get(authenticateToken, getSavedRecipes)
  .post(authenticateToken, saveRecipe);

router
  .route("/:id")
  .delete(authenticateToken, removeSavedRecipe);

export default router;
