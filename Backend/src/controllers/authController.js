const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email,
        created_by_admin_id: null,
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: role === "ADMIN" ? "ADMIN" : "TENANT",
        created_by_admin_id: null,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find all users with this email — could be admin or tenants under different admins
    const users = await prisma.user.findMany({
      where: { email },
      orderBy: { created_at: "asc" },
    });

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Try each user with matching email until one has correct password
    let matchedUser = null;
    for (const user of users) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: matchedUser.id,
        email: matchedUser.email,
        role: matchedUser.role,
        name: matchedUser.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, phone: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getTenants = async (req, res) => {
  try {
    const tenants = await prisma.user.findMany({
      where: {
        role: "TENANT",
        created_by_admin_id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        unit: {
          select: {
            id: true,
            unit_number: true,
            building: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(tenants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const registerTenant = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }

  try {
    // Check if this admin already has a tenant with this email
    const existing = await prisma.user.findFirst({
      where: {
        email,
        created_by_admin_id: req.user.id,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "You already have a tenant registered with this email",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: "TENANT",
        created_by_admin_id: req.user.id,
      },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, getMe, getTenants, registerTenant };