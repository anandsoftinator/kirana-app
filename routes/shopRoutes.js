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
  handleCreateNewShop,
  handleFindShowByPhone,
} = require("../controllers/shopController");

const {
  authenticateUser,
  // authorizePermissions,
} = require("../middleware/authentication");

router.route(
  "/upload-order-image").post([authenticateUser, upload.single("image")],
  handleUploadOrderImage
);

router
  .route("/")
  .get(authenticateUser,handleGetAllShops)
  .post([authenticateUser, upload.single("image")], handleCreateNewShop);

router
  .route("/categories")
  .get(authenticateUser, handleGetCategories)
  .post(authenticateUser, handleAddCategory);

router
  .route("/:id")
  .get(authenticateUser, handleGetShopByID)
  .patch(authenticateUser, handleUpdateShopByID)
  .delete(authenticateUser, handleDeleteShopByID);



module.exports = router;
