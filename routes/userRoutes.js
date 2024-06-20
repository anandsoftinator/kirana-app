const express = require("express");
const router = express.Router();

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
  .patch(handleUpdateUserByID)
  .delete(handleDeleteUserByID);

module.exports = router;
