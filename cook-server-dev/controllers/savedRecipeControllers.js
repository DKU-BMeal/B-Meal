// src/controllers/savedRecipeControllers.js
import SavedRecipe from "../models/SavedRecipe.js";
import mongoose from "mongoose";

// ================================
// 📌 GET /saved-recipes
// 사용자의 모든 저장된 레시피 가져오기
// ================================
export const getSavedRecipes = async (req, res) => {
  try {
    const savedRecipes = await SavedRecipe.find({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: savedRecipes.length,
      data: savedRecipes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// 📌 POST /saved-recipes
// 레시피 저장
// ================================
export const saveRecipe = async (req, res) => {
  const { recipeData, recipeId, recipeTitle } = req.body;

  try {
    // 중복 체크
    const exists = await SavedRecipe.findOne({
      user: req.user.id,
      recipeId,
    });

    if (exists) {
      return res
        .status(409)
        .json({ success: false, error: "Recipe already saved" });
    }

    const savedRecipe = await SavedRecipe.create({
      user: req.user.id,
      recipeData,
      recipeId,
      recipeTitle:
        recipeTitle ||
        (recipeData?.title ? recipeData.title : "Untitled Recipe"),
    });

    res.status(201).json({
      success: true,
      data: savedRecipe,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, error: messages.join(", ") });
    }

    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// 📌 DELETE /saved-recipes/:id
// 저장된 레시피 제거
// ================================
export const removeSavedRecipe = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid Saved Recipe ID format" });
  }

  try {
    const deleted = await SavedRecipe.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Saved Recipe not found or unauthorized",
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
