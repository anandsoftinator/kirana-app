const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

const {
  handleCreateNewPost,
  handleGetAllPosts,
  handleGetPostByID,
  handleGetPostByIDDummy,
  handleAddLike,
} = require("../controllers/postController");

const {
  authenticateUser,
  // authorizePermissions,
} = require("../middleware/authentication");

router
  .route("/")
  .get(authenticateUser, handleGetAllPosts)
  .post([authenticateUser, uploadFields], handleCreateNewPost);

router
  .route("/:id")
  .get(authenticateUser, handleGetPostByID)
  .patch(authenticateUser, handleAddLike);

router.route("/dummy/:id").get(authenticateUser, handleGetPostByIDDummy);

module.exports = router;
