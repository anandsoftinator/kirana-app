const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  handleUploadOrderImage,
  handleGetCategories,
  handleAddCategory,
  handleGetAllShops,
  handleGetShopByID,
  handleUpdateShopByID,
  handleDeleteShopByID,
  handleDeleteCategoryById,
  handleFindShowByPhone,
} = require("../controllers/shopController");

const {
  authenticateUser,
  // authorizePermissions,
} = require("../middleware/authentication");

router
  .route("/upload-order-image")
  .post([authenticateUser, upload.single("image")], handleUploadOrderImage);

router.route("/").get(authenticateUser, handleGetAllShops);

router
  .route("/categories")
  .get(authenticateUser, handleGetCategories)
  .post(authenticateUser, handleAddCategory);

router
  .route("/categories/:id")
  .delete(authenticateUser, handleDeleteCategoryById);

router
  .route("/:id")
  .get(authenticateUser, handleGetShopByID)
  .patch([authenticateUser, upload.single("image")], handleUpdateShopByID)
  .delete(authenticateUser, handleDeleteShopByID);

module.exports = router;
