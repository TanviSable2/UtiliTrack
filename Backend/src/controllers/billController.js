const { PrismaClient } = require("@prisma/client");
const {
  generateBillForUnit,
  generateBillsForBuilding,
  detectConsumptionAnomalies,
  detectLeaks,
} = require("../services/billingEngine");
const { generateInvoicePDF, generateConvergentPDF } = require("../services/pdfGenerator");
const { uploadToS3 } = require("../services/s3Service");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { unit_id, billing_month, status } = req.query;
    const where = {};

    if (req.user.role === "TENANT") {
      const unit = await prisma.unit.findUnique({ where: { tenant_id: req.user.id } });
      if (!unit) return res.json([]);
      where.unit_id = unit.id;
    } else {
      if (unit_id) where.unit_id = parseInt(unit_id);
    }

    if (billing_month) where.billing_month = billing_month;
    if (status) where.status = status;

    const bills = await prisma.bill.findMany({
      where,
      include: {
        unit: {
          include: {
            building: { select: { name: true, address: true } },
            tenant: { select: { name: true, email: true } },
          },
        },
        line_items: true,
        payments: true,
        disputes: true,
      },
      orderBy: { billing_month: "desc" },
    });

    res.json(bills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        unit: {
          include: {
            building: true,
            tenant: { select: { name: true, email: true } },
          },
        },
        line_items: true,
        payments: true,
        disputes: true,
      },
    });
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const generate = async (req, res) => {
  const { unit_id, billing_month } = req.body;
  if (!unit_id || !billing_month) {
    return res.status(400).json({ error: "unit_id and billing_month are required" });
  }

  try {
    const result = await generateBillForUnit(parseInt(unit_id), billing_month);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

const generateBulk = async (req, res) => {
  const { building_id, billing_month } = req.body;
  if (!building_id || !billing_month) {
    return res.status(400).json({ error: "building_id and billing_month are required" });
  }

  try {
    const results = await generateBillsForBuilding(parseInt(building_id), billing_month);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const downloadPDF = async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        unit: {
          include: {
            building: true,
            tenant: { select: { name: true, email: true } },
          },
        },
        line_items: true,
        payments: true,
      },
    });

    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const pdfBuffer = await generateInvoicePDF(bill);

    if (process.env.AWS_BUCKET_NAME) {
      const s3Url = await uploadToS3(
        { buffer: pdfBuffer, mimetype: "application/pdf" },
        `invoices/invoice-${bill.id}-${bill.billing_month}.pdf`
      );
      await prisma.bill.update({ where: { id: bill.id }, data: { pdf_path: s3Url } });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${bill.id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

const downloadConvergentPDF = async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        unit: {
          include: {
            building: true,
            tenant: { select: { name: true, email: true } },
          },
        },
        line_items: true,
        payments: true,
      },
    });

    if (!bill) return res.status(404).json({ error: "Bill not found" });

    if (bill.unit.monthly_rent === 0) {
      return res.status(400).json({
        error: "No rent amount set for this unit. Update the unit with monthly_rent before generating convergent bill.",
      });
    }

    const pdfBuffer = await generateConvergentPDF(bill);

    await prisma.bill.update({
      where: { id: bill.id },
      data: { is_convergent: true },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=convergent-invoice-${bill.id}-${bill.billing_month}.pdf`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate convergent PDF" });
  }
};

const getAnomalies = async (req, res) => {
  const { billing_month } = req.query;
  if (!billing_month) {
    return res.status(400).json({ error: "billing_month is required" });
  }

  try {
    const anomalies = await detectConsumptionAnomalies(billing_month);
    res.json(anomalies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getLeakAlerts = async (req, res) => {
  const { billing_month } = req.query;
  if (!billing_month) {
    return res.status(400).json({ error: "billing_month is required" });
  }

  try {
    const leaks = await detectLeaks(billing_month);
    res.json(leaks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOverdueReport = async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      where: { status: { in: ["UNPAID", "OVERDUE"] }, due_date: { lt: new Date() } },
      include: {
        unit: {
          include: {
            building: { select: { name: true } },
            tenant: { select: { name: true, email: true } },
          },
        },
      },
    });

    const report = bills.map((bill) => {
      const daysOverdue = Math.floor(
        (new Date() - new Date(bill.due_date)) / (1000 * 60 * 60 * 24)
      );
      return {
        unit_number: bill.unit.unit_number,
        building_name: bill.unit.building.name,
        tenant_name: bill.unit.tenant?.name || "Unoccupied",
        tenant_email: bill.unit.tenant?.email || "",
        billing_month: bill.billing_month,
        total_amount: bill.total_amount,
        days_overdue: daysOverdue,
        due_date: bill.due_date,
      };
    });

    const fields = [
      "unit_number",
      "building_name",
      "tenant_name",
      "tenant_email",
      "billing_month",
      "total_amount",
      "days_overdue",
      "due_date",
    ];

    const csv = [
      fields.join(","),
      ...report.map((row) => fields.map((f) => `"${row[f]}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=overdue-report.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getAll,
  getOne,
  generate,
  generateBulk,
  downloadPDF,
  downloadConvergentPDF,
  getAnomalies,
  getLeakAlerts,
  getOverdueReport,
};