import express from "express";
import { saveRecipe } from "../controllers/savedController.js";

const router = express.Router();

router.post("/", saveRecipe);

export default router;
