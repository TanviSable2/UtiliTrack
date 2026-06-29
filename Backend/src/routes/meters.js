const express = require("express");
const multer = require("multer");
const { getAll, validateReading, create, getFlagged } = require("../controllers/meterController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// static routes first
router.get("/", authenticate, getAll);
router.get("/flagged", authenticate, requireAdmin, getFlagged);
router.post("/validate", authenticate, requireAdmin, validateReading);

// dynamic routes after
router.post("/", authenticate, requireAdmin, upload.single("photo"), create);

module.exports = router;