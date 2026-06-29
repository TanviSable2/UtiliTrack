const express = require("express");
const { getAll, getOne, create, update, remove, getBillingCalendar } = require("../controllers/buildingController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/", authenticate, getAll);
router.get("/calendar", authenticate, requireAdmin, getBillingCalendar);

// dynamic routes after
router.get("/:id", authenticate, getOne);
router.post("/", authenticate, requireAdmin, create);
router.put("/:id", authenticate, requireAdmin, update);
router.delete("/:id", authenticate, requireAdmin, remove);

module.exports = router;