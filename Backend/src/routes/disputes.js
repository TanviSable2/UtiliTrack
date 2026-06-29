const express = require("express");
const { getAll, getOne, raise, resolve, recalculateBill } = require("../controllers/disputeController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/", authenticate, getAll);
router.post("/", authenticate, raise);

// dynamic routes after
router.get("/:id", authenticate, getOne);
router.put("/:id/resolve", authenticate, requireAdmin, resolve);
router.put("/:id/recalculate", authenticate, requireAdmin, recalculateBill);

module.exports = router;