const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["error"],
});
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.log("DB keepalive failed, reconnecting...");
  }
}, 2 * 60 * 1000);

async function connectWithRetry(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log("Database connected");
      return;
    } catch (err) {
      console.log(`DB connection attempt ${i + 1} failed. Retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.error("Could not connect to database after retries");
}

connectWithRetry();
const authRoutes = require("./routes/auth");
const buildingRoutes = require("./routes/buildings");
const unitRoutes = require("./routes/units");
const rateRoutes = require("./routes/rates");
const meterRoutes = require("./routes/meters");
const billRoutes = require("./routes/bills");
const paymentRoutes = require("./routes/payments");
const disputeRoutes = require("./routes/disputes");
const dashboardRoutes = require("./routes/dashboard");
const { startReminderJob } = require("./cron/reminderJob");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/buildings", buildingRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/rates", rateRoutes);
app.use("/api/meters", meterRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startReminderJob();
});