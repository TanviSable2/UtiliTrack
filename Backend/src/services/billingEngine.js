const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function getPreviousMonth(billingMonth) {
  const [year, month] = billingMonth.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function calculateBillForUnit(unit_id, billing_month) {
  const previousMonth = getPreviousMonth(billing_month);

  const currentReadings = await prisma.meterReading.findMany({
    where: { unit_id, billing_month },
  });

  if (currentReadings.length === 0) {
    throw new Error("No meter readings found for this unit and billing month");
  }

  const utilityTypes = currentReadings.map((r) => r.utility_type);
  const previousReadings = await prisma.meterReading.findMany({
    where: {
      unit_id,
      billing_month: previousMonth,
      utility_type: { in: utilityTypes },
    },
  });

  const prevReadingMap = {};
  for (const r of previousReadings) {
    prevReadingMap[r.utility_type] = r.reading_value;
  }

  const lineItems = [];
  let total_amount = 0;

  for (const current of currentReadings) {
    const rateRecord = await prisma.utilityRate.findFirst({
      where: { utility_type: current.utility_type },
      orderBy: { effective_from: "desc" },
    });

    if (!rateRecord) continue;

    const previous_reading = prevReadingMap[current.utility_type] ?? 0;
    const units_consumed = Math.max(0, current.reading_value - previous_reading);
    const amount = units_consumed * rateRecord.rate_per_unit + rateRecord.fixed_charge;

    lineItems.push({
      utility_type: current.utility_type,
      previous_reading,
      current_reading: current.reading_value,
      units_consumed,
      rate_per_unit: rateRecord.rate_per_unit,
      fixed_charge: rateRecord.fixed_charge,
      amount,
    });

    total_amount += amount;
  }

  return { lineItems, total_amount };
}

async function generateBillForUnit(unit_id, billing_month) {
  const existing = await prisma.bill.findUnique({
    where: { unit_id_billing_month: { unit_id, billing_month } },
  });

  if (existing) {
    return { bill: existing, already_exists: true };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unit_id } });
  const { lineItems, total_amount } = await calculateBillForUnit(unit_id, billing_month);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  const bill = await prisma.bill.create({
    data: {
      unit_id,
      billing_month,
      rent_amount: unit.monthly_rent,
      utility_amount: total_amount,
      total_amount: total_amount + unit.monthly_rent,
      due_date: dueDate,
      status: "UNPAID",
      line_items: { create: lineItems },
    },
    include: { line_items: true },
  });

  return { bill, already_exists: false };
}

async function generateBillsForBuilding(building_id, billing_month) {
  const units = await prisma.unit.findMany({
    where: { building_id },
    select: { id: true, unit_number: true },
  });

  const results = [];

  for (const unit of units) {
    try {
      const result = await generateBillForUnit(unit.id, billing_month);
      results.push({
        unit_id: unit.id,
        unit_number: unit.unit_number,
        success: true,
        already_exists: result.already_exists,
        total_amount: result.bill.total_amount,
      });
    } catch (err) {
      results.push({
        unit_id: unit.id,
        unit_number: unit.unit_number,
        success: false,
        error: err.message,
      });
    }
  }

  return results;
}

async function detectConsumptionAnomalies(billing_month) {
  const currentReadings = await prisma.meterReading.findMany({
    where: { billing_month },
    include: {
      unit: { select: { unit_number: true, building: { select: { name: true } } } },
    },
  });

  const anomalies = [];

  for (const reading of currentReadings) {
    const pastReadings = await prisma.meterReading.findMany({
      where: {
        unit_id: reading.unit_id,
        utility_type: reading.utility_type,
        billing_month: { not: billing_month },
      },
      orderBy: { billing_month: "desc" },
      take: 3,
    });

    if (pastReadings.length < 2) continue;

    const avgPast = pastReadings.reduce((sum, r) => sum + r.reading_value, 0) / pastReadings.length;
    if (avgPast === 0) continue;

    const deviation = ((reading.reading_value - avgPast) / avgPast) * 100;

    if (deviation > 40) {
      anomalies.push({
        unit_id: reading.unit_id,
        unit_number: reading.unit.unit_number,
        building_name: reading.unit.building.name,
        utility_type: reading.utility_type,
        current_reading: reading.reading_value,
        avg_past_reading: parseFloat(avgPast.toFixed(2)),
        deviation_percent: parseFloat(deviation.toFixed(2)),
      });
    }
  }

  return anomalies;
}

async function detectLeaks(billing_month) {
  const currentReadings = await prisma.meterReading.findMany({
    where: { billing_month, utility_type: "WATER" },
    include: {
      unit: { select: { unit_number: true, building: { select: { name: true } } } },
    },
  });

  const leaks = [];

  for (const reading of currentReadings) {
    const pastReadings = await prisma.meterReading.findMany({
      where: {
        unit_id: reading.unit_id,
        utility_type: "WATER",
        billing_month: { not: billing_month },
      },
      orderBy: { billing_month: "desc" },
      take: 3,
    });

    if (pastReadings.length < 2) continue;

    const avgPast = pastReadings.reduce((sum, r) => sum + r.reading_value, 0) / pastReadings.length;
    if (avgPast === 0) continue;

    if (reading.reading_value > avgPast * 2) {
      leaks.push({
        unit_id: reading.unit_id,
        unit_number: reading.unit.unit_number,
        building_name: reading.unit.building.name,
        current_reading: reading.reading_value,
        avg_past_reading: parseFloat(avgPast.toFixed(2)),
        excess_factor: parseFloat((reading.reading_value / avgPast).toFixed(2)),
        alert: "POSSIBLE_LEAK",
      });
    }
  }

  return leaks;
}

module.exports = {
  calculateBillForUnit,
  generateBillForUnit,
  generateBillsForBuilding,
  detectConsumptionAnomalies,
  detectLeaks,
};