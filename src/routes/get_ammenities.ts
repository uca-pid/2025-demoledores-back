import { Router } from "express";
import { getAmenities } from "../controllers/get_ammenities.ts";
import { requireAuth } from "../auth_middleware.ts";

const router = Router();

router.get("/", requireAuth, getAmenities); // protegida con JWT

export default router;
