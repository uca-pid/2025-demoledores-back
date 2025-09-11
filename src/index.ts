import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.ts"; // <-- .js
import { requireAuth } from "./auth_middleware.ts";
import amenityRoutes from "./routes/get_ammenities.ts";
import reservationRoutes from "./routes/reservations.ts";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/amenities", amenityRoutes);
app.use("/reservations", reservationRoutes);


// protected route
app.get("/dashboard", requireAuth, (req, res) => {
    res.json({ message: "Hello!", user: (req as any).user });
});


app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
