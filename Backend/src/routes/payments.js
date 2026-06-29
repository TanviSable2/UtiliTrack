const express = require("express");
const { create, getByBill, getTenantHistory } = require("../controllers/paymentController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/my-history", authenticate, getTenantHistory);
router.post("/", authenticate, requireAdmin, create);

// dynamic routes after
router.get("/bill/:bill_id", authenticate, getByBill);

module.exports = router;