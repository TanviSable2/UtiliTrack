const { PrismaClient } = require("@prisma/client");
const { uploadToS3 } = require("../services/s3Service");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { unit_id, billing_month } = req.query;
    const where = {};
    if (unit_id) where.unit_id = parseInt(unit_id);
    if (billing_month) where.billing_month = billing_month;

    const readings = await prisma.meterReading.findMany({
      where,
      include: {
        unit: {
          select: {
            unit_number: true,
            building: { select: { name: true } },
          },
        },
      },
      orderBy: [{ billing_month: "desc" }, { unit_id: "asc" }],
    });
    res.json(readings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const validateReading = async (req, res) => {
  const { unit_id, utility_type, reading_value, billing_month } = req.body;

  if (!unit_id || !utility_type || reading_value === undefined || !billing_month) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [year, month] = billing_month.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const previousReading = await prisma.meterReading.findUnique({
      where: {
        unit_id_utility_type_billing_month: {
          unit_id: parseInt(unit_id),
          utility_type,
          billing_month: prevMonth,
        },
      },
    });

    const warnings = [];

    if (previousReading) {
      if (parseFloat(reading_value) < previousReading.reading_value) {
        warnings.push({
          type: "READING_LOWER_THAN_PREVIOUS",
          message: `New reading (${reading_value}) is lower than previous reading (${previousReading.reading_value}). This is impossible unless the meter was reset.`,
          severity: "ERROR",
        });
      } else {
        const consumption = parseFloat(reading_value) - previousReading.reading_value;
        const prevDate2 = new Date(year, month - 3, 1);
        const prevPrevMonth = `${prevDate2.getFullYear()}-${String(prevDate2.getMonth() + 1).padStart(2, "0")}`;

        const prevPrevReading = await prisma.meterReading.findUnique({
          where: {
            unit_id_utility_type_billing_month: {
              unit_id: parseInt(unit_id),
              utility_type,
              billing_month: prevPrevMonth,
            },
          },
        });

        if (prevPrevReading) {
          const prevConsumption = previousReading.reading_value - prevPrevReading.reading_value;
          if (prevConsumption > 0 && consumption > prevConsumption * 1.5) {
            warnings.push({
              type: "CONSUMPTION_SPIKE",
              message: `Consumption this month (${consumption.toFixed(2)} units) is ${(((consumption - prevConsumption) / prevConsumption) * 100).toFixed(0)}% higher than last month (${prevConsumption.toFixed(2)} units). Possible typo.`,
              severity: "WARNING",
            });
          }
        }
      }
    }

    res.json({
      valid: !warnings.some((w) => w.severity === "ERROR"),
      warnings,
      previous_reading: previousReading?.reading_value ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const create = async (req, res) => {
  const { unit_id, utility_type, reading_value, billing_month } = req.body;

  if (!unit_id || !utility_type || reading_value === undefined || !billing_month) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    let photo_url = null;
    let is_flagged = false;
    let flag_reason = null;

    // Photo upload — non-blocking, reading saves even if photo fails
    if (req.file) {
      try {
        photo_url = await uploadToS3(req.file, `meter-photos/${unit_id}/${billing_month}`);
        console.log("Photo uploaded successfully:", photo_url);
      } catch (photoErr) {
        console.error("Photo upload failed, saving reading without photo:", photoErr.message);
        photo_url = null;
      }
    }

    const [year, month] = billing_month.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const previousReading = await prisma.meterReading.findUnique({
      where: {
        unit_id_utility_type_billing_month: {
          unit_id: parseInt(unit_id),
          utility_type,
          billing_month: prevMonth,
        },
      },
    });

    if (previousReading) {
      if (parseFloat(reading_value) < previousReading.reading_value) {
        is_flagged = true;
        flag_reason = `Reading ${reading_value} is lower than previous reading ${previousReading.reading_value}`;
      } else {
        const consumption = parseFloat(reading_value) - previousReading.reading_value;
        const prevDate2 = new Date(year, month - 3, 1);
        const prevPrevMonth = `${prevDate2.getFullYear()}-${String(prevDate2.getMonth() + 1).padStart(2, "0")}`;

        const prevPrevReading = await prisma.meterReading.findUnique({
          where: {
            unit_id_utility_type_billing_month: {
              unit_id: parseInt(unit_id),
              utility_type,
              billing_month: prevPrevMonth,
            },
          },
        });

        if (prevPrevReading) {
          const prevConsumption = previousReading.reading_value - prevPrevReading.reading_value;
          if (prevConsumption > 0 && consumption > prevConsumption * 1.5) {
            is_flagged = true;
            flag_reason = `Consumption spike: ${consumption.toFixed(2)} units vs last month's ${prevConsumption.toFixed(2)} units`;
          }
        }
      }
    }

    const reading = await prisma.meterReading.upsert({
      where: {
        unit_id_utility_type_billing_month: {
          unit_id: parseInt(unit_id),
          utility_type,
          billing_month,
        },
      },
      update: {
        reading_value: parseFloat(reading_value),
        photo_url,
        is_flagged,
        flag_reason,
      },
      create: {
        unit_id: parseInt(unit_id),
        utility_type,
        reading_value: parseFloat(reading_value),
        billing_month,
        photo_url,
        is_flagged,
        flag_reason,
      },
    });

    res.status(201).json({
      ...reading,
      photo_uploaded: !!photo_url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getFlagged = async (req, res) => {
  try {
    const { billing_month } = req.query;
    const where = { is_flagged: true };
    if (billing_month) where.billing_month = billing_month;

    const readings = await prisma.meterReading.findMany({
      where,
      include: {
        unit: {
          include: {
            building: { select: { name: true } },
            tenant: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(readings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAll, validateReading, create, getFlagged };