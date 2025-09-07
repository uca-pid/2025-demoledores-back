import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.ts"; // <-- .js

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
