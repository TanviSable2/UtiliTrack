const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const tenantPassword = await bcrypt.hash("tenant123", 10);

  const admin1 = await prisma.user.create({
    data: {
      name: "Rajesh Sharma",
      email: "admin@utilitrack.com",
      password_hash: adminPassword,
      role: "ADMIN",
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      name: "Priya Mehta",
      email: "admin2@utilitrack.com",
      password_hash: adminPassword,
      role: "ADMIN",
    },
  });

  const tenants = [];
  const tenantData = [
    { name: "Amit Kumar", email: "amit@tenant.com" },
    { name: "Sneha Patil", email: "sneha@tenant.com" },
    { name: "Rahul Singh", email: "rahul@tenant.com" },
    { name: "Pooja Desai", email: "pooja@tenant.com" },
    { name: "Vikram Joshi", email: "vikram@tenant.com" },
    { name: "Neha Gupta", email: "neha@tenant.com" },
    { name: "Suresh Nair", email: "suresh@tenant.com" },
    { name: "Anita Reddy", email: "anita@tenant.com" },
    { name: "Manoj Tiwari", email: "manoj@tenant.com" },
    { name: "Deepika Rao", email: "deepika@tenant.com" },
  ];

  for (const t of tenantData) {
    const tenant = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        password_hash: tenantPassword,
        role: "TENANT",
      },
    });
    tenants.push(tenant);
  }

  const building1 = await prisma.building.create({
    data: {
      name: "Sunrise Apartments",
      address: "Plot 12, Sector 7, Nagpur, Maharashtra 440001",
      admin_id: admin1.id,
    },
  });

  const building2 = await prisma.building.create({
    data: {
      name: "Green Valley Society",
      address: "Survey No. 45, Wardha Road, Nagpur, Maharashtra 440015",
      admin_id: admin2.id,
    },
  });

  const units = [];
  const unitData = [
    { unit_number: "101", floor: 1, building_id: building1.id },
    { unit_number: "102", floor: 1, building_id: building1.id },
    { unit_number: "201", floor: 2, building_id: building1.id },
    { unit_number: "202", floor: 2, building_id: building1.id },
    { unit_number: "301", floor: 3, building_id: building1.id },
    { unit_number: "101", floor: 1, building_id: building2.id },
    { unit_number: "102", floor: 1, building_id: building2.id },
    { unit_number: "201", floor: 2, building_id: building2.id },
    { unit_number: "202", floor: 2, building_id: building2.id },
    { unit_number: "301", floor: 3, building_id: building2.id },
  ];

  for (let i = 0; i < unitData.length; i++) {
    const unit = await prisma.unit.create({
      data: {
        ...unitData[i],
        tenant_id: tenants[i].id,
      },
    });
    units.push(unit);
  }

  await prisma.utilityRate.createMany({
    data: [
      { utility_type: "ELECTRICITY", rate_per_unit: 6.5, fixed_charge: 50 },
      { utility_type: "WATER", rate_per_unit: 3.0, fixed_charge: 30 },
      { utility_type: "GAS", rate_per_unit: 45.0, fixed_charge: 0 },
    ],
  });

  const currentMonth = "2025-05";
  const prevMonth = "2025-04";

  for (const unit of units) {
    const elecPrev = Math.floor(Math.random() * 200) + 100;
    const elecCurr = elecPrev + Math.floor(Math.random() * 150) + 50;
    const waterPrev = Math.floor(Math.random() * 50) + 10;
    const waterCurr = waterPrev + Math.floor(Math.random() * 30) + 5;

    await prisma.meterReading.createMany({
      data: [
        {
          unit_id: unit.id,
          utility_type: "ELECTRICITY",
          reading_value: elecPrev,
          billing_month: prevMonth,
        },
        {
          unit_id: unit.id,
          utility_type: "ELECTRICITY",
          reading_value: elecCurr,
          billing_month: currentMonth,
        },
        {
          unit_id: unit.id,
          utility_type: "WATER",
          reading_value: waterPrev,
          billing_month: prevMonth,
        },
        {
          unit_id: unit.id,
          utility_type: "WATER",
          reading_value: waterCurr,
          billing_month: currentMonth,
        },
      ],
    });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@utilitrack.com / admin123");
  console.log("Tenant login: amit@tenant.com / tenant123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });