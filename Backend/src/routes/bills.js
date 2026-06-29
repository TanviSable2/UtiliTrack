const express = require("express");
const {
  getAll,
  getOne,
  generate,
  generateBulk,
  downloadPDF,
  downloadConvergentPDF,
  getAnomalies,
  getLeakAlerts,
  getOverdueReport,
} = require("../controllers/billController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/", authenticate, getAll);
router.get("/overdue-report", authenticate, requireAdmin, getOverdueReport);
router.get("/anomalies", authenticate, requireAdmin, getAnomalies);
router.get("/leaks", authenticate, requireAdmin, getLeakAlerts);
router.post("/generate", authenticate, requireAdmin, generate);
router.post("/generate-bulk", authenticate, requireAdmin, generateBulk);

// dynamic routes after
router.get("/:id", authenticate, getOne);
router.get("/:id/pdf", authenticate, downloadPDF);
router.get("/:id/convergent-pdf", authenticate, downloadConvergentPDF);

module.exports = router;