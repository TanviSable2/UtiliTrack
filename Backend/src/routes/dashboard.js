const express = require("express");
const { adminDashboard, tenantDashboard } = require("../controllers/dashboardController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/admin", authenticate, requireAdmin, adminDashboard);
router.get("/tenant", authenticate, tenantDashboard);

module.exports = router;