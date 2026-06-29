const express = require("express");
const { getAll, getOne, create, update, remove } = require("../controllers/unitController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// static routes first
router.get("/", authenticate, getAll);
router.post("/", authenticate, requireAdmin, create);

// dynamic routes after
router.get("/:id", authenticate, getOne);
router.put("/:id", authenticate, requireAdmin, update);
router.delete("/:id", authenticate, requireAdmin, remove);

module.exports = router;