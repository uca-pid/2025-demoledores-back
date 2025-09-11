import type { Request, Response } from "express";
import { prisma} from "../prismaClient.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";




// ---------------- REGISTER ----------------
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash
      }
    });

    res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
};

// ---------------- LOGIN ----------------
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

  // ✅ Create JWT
  const token = jwt.sign(
    {id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!, // must be set in .env
    { expiresIn: "120m" }
  );

  res.json({ message: "Login successful", token });
};
