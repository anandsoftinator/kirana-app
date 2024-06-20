const express = require("express");
const router = express.Router();

const { updateUserRole } = require("../controllers/authController");

router.route("/:id").patch(updateUserRole);

module.exports = router;
