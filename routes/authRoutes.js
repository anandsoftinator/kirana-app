const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  register,
  login,
  logout,
  registerShop,
  shopLogin,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.delete("/logout", logout);

router.post("/shop-login", shopLogin);
router.post("/shop-register", upload.single("image"), registerShop);
router.delete("/logout", logout);

module.exports = router;
