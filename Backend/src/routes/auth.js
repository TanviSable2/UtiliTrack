const express = require("express");
const { register, login, getMe, getTenants ,registerTenant} = require("../controllers/authController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.get("/tenants", authenticate, requireAdmin, getTenants);
router.post("/register-tenant", authenticate, requireAdmin, registerTenant);

module.exports = router;