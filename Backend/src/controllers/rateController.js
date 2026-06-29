const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const rates = await prisma.utilityRate.findMany({
      orderBy: { effective_from: "desc" },
    });
    res.json(rates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getCurrent = async (req, res) => {
  try {
    const types = ["ELECTRICITY", "WATER", "GAS"];
    const currentRates = {};

    for (const type of types) {
      const rate = await prisma.utilityRate.findFirst({
        where: { utility_type: type },
        orderBy: { effective_from: "desc" },
      });
      currentRates[type] = rate;
    }

    res.json(currentRates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const create = async (req, res) => {
  const { utility_type, rate_per_unit, fixed_charge } = req.body;

  if (!utility_type || rate_per_unit === undefined) {
    return res.status(400).json({ error: "utility_type and rate_per_unit are required" });
  }

  const validTypes = ["ELECTRICITY", "WATER", "GAS"];
  if (!validTypes.includes(utility_type)) {
    return res.status(400).json({ error: "Invalid utility type. Must be ELECTRICITY, WATER or GAS" });
  }

  try {
    const rate = await prisma.utilityRate.create({
      data: {
        utility_type,
        rate_per_unit: parseFloat(rate_per_unit),
        fixed_charge: fixed_charge ? parseFloat(fixed_charge) : 0,
      },
    });
    res.status(201).json(rate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAll, getCurrent, create };