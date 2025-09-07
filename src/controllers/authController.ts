import type { Request, Response } from "express";

// Dummy in-memory "database" for demonstration
const users: { name: string; email: string; password: string }[] = [];

// ---------------- REGISTER ----------------
export const register = (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  console.log("someone registered");
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const userExists = users.find(u => u.email === email);
  if (userExists) return res.status(400).json({ message: "User already exists" });

  users.push({ name, email, password });
  res.status(201).json({ message: "User registered successfully", data: { name, email } });
};

// ---------------- LOGIN ----------------
export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("someone logged in");
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  res.status(200).json({ message: "Login successful", data: { name: user.name, email: user.email } });
};
