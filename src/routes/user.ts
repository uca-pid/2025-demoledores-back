import { Router } from "express";
import { requireAuth } from "../auth_middleware.ts";
import { updateUserName, updateUserPassword } from "../controllers/user.ts";

const router = Router();

// PATCH /user/name -> actualizar el nombre del usuario logueado
router.patch("/name", requireAuth, updateUserName);

// PATCH /user/password -> actualizar la contraseña del usuario logueado
router.patch("/password", requireAuth, updateUserPassword);

export default router;
