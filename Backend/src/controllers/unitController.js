const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { building_id } = req.query;

    if (req.user.role === "TENANT") {
      const unit = await prisma.unit.findUnique({
        where: { tenant_id: req.user.id },
        include: {
          building: true,
          tenant: { select: { id: true, name: true, email: true } },
        },
      });
      return res.json(unit ? [unit] : []);
    }

    // Get only buildings that belong to this admin
    const adminBuildings = await prisma.building.findMany({
      where: { admin_id: req.user.id },
      select: { id: true },
    });
    const adminBuildingIds = adminBuildings.map((b) => b.id);

    // If filtering by a specific building, verify it belongs to this admin
    const where = {};
    if (building_id) {
      const requestedId = parseInt(building_id);
      if (!adminBuildingIds.includes(requestedId)) {
        return res.json([]);
      }
      where.building_id = requestedId;
    } else {
      where.building_id = { in: adminBuildingIds };
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        building: { select: { name: true } },
        tenant: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ building_id: "asc" }, { floor: "asc" }, { unit_number: "asc" }],
    });

    res.json(units);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        building: { include: { admin: { select: { id: true } } } },
        tenant: { select: { id: true, name: true, email: true } },
        bills: { orderBy: { billing_month: "desc" }, take: 6 },
      },
    });

    if (!unit) return res.status(404).json({ error: "Unit not found" });

    if (req.user.role === "ADMIN" && unit.building.admin.id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const create = async (req, res) => {
  const { unit_number, floor, building_id, tenant_id, monthly_rent } = req.body;

  if (!unit_number || !floor || !building_id) {
    return res.status(400).json({ error: "unit_number, floor and building_id are required" });
  }

  try {
    // Verify the building belongs to this admin
    const building = await prisma.building.findUnique({
      where: { id: parseInt(building_id) },
    });

    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }

    if (building.admin_id !== req.user.id) {
      return res.status(403).json({ error: "You can only add units to your own buildings" });
    }

    const unit = await prisma.unit.create({
      data: {
        unit_number,
        floor: parseInt(floor),
        building_id: parseInt(building_id),
        tenant_id: tenant_id ? parseInt(tenant_id) : null,
        monthly_rent: monthly_rent ? parseFloat(monthly_rent) : 0,
      },
    });
    res.status(201).json(unit);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Unit number already exists in this building" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const update = async (req, res) => {
  const { unit_number, floor, tenant_id, monthly_rent } = req.body;

  try {
    // Verify the unit belongs to this admin's building
    const existing = await prisma.unit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { building: { select: { admin_id: true } } },
    });

    if (!existing) return res.status(404).json({ error: "Unit not found" });

    if (existing.building.admin_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const unit = await prisma.unit.update({
      where: { id: parseInt(req.params.id) },
      data: {
        unit_number,
        floor: floor ? parseInt(floor) : undefined,
        tenant_id: tenant_id !== undefined ? (tenant_id ? parseInt(tenant_id) : null) : undefined,
        monthly_rent: monthly_rent ? parseFloat(monthly_rent) : undefined,
      },
    });
    res.json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.unit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { building: { select: { admin_id: true } } },
    });

    if (!existing) return res.status(404).json({ error: "Unit not found" });

    if (existing.building.admin_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.unit.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Unit deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAll, getOne, create, update, remove };