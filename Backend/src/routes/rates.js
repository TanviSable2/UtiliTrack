const express = require("express");
const { getAll, getCurrent, create } = require("../controllers/rateController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/", authenticate, getAll);
router.get("/current", authenticate, getCurrent);
router.post("/", authenticate, requireAdmin, create);

module.exports = router;