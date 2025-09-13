import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.ts"; // <-- .js
import { requireAuth } from "./auth_middleware.ts";
import amenityRoutes from "./routes/get_ammenities.ts";
import reservationRoutes from "./routes/reservations.ts";
import userRoutes from "./routes/user.ts";
import { emailService } from "./services/emailService.ts";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Test email service connection on startup
emailService.testConnection().then(isConnected => {
  if (isConnected) {
    console.log('✅ Email service is ready');
  } else {
    console.log('⚠️ Email service connection failed - check your configuration');
  }
}).catch(error => {
  console.log('⚠️ Email service initialization error:', error.message);
});

// Routes
app.use("/auth", authRoutes);
app.use("/amenities", amenityRoutes);
app.use("/reservations", reservationRoutes);
app.use("/user", userRoutes);


// protected route
app.get("/dashboard", requireAuth, (req, res) => {
    res.json({ message: "Hello!", user: (req as any).user });
});


app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
