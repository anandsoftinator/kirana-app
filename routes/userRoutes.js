const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  handleGetAllUsers,
  handleGetUserByID,
  handleUpdateUserByID,
  handleDeleteUserByID,
} = require("../controllers/userController");

router.route("/").get(handleGetAllUsers);
router
  .route("/:id")
  .get(handleGetUserByID)
  .patch(upload.single("image"), handleUpdateUserByID)
  .delete(handleDeleteUserByID);

module.exports = router;
