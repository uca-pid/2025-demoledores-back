import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prismaClient.ts";

// Interfaz para el payload del JWT
interface JWTPayload {
  id: number;
  email: string;
  role?: string;
}

// Función para registrar logs de seguridad
const logSecurityEvent = (
  event: "UNAUTHORIZED_ADMIN_ACCESS" | "ADMIN_ACCESS_SUCCESS" | "INVALID_TOKEN",
  req: Request,
  userId?: number,
  userEmail?: string
) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent") || "unknown";
  const endpoint = req.originalUrl;
  
  console.log(`🚨 [SECURITY LOG] ${timestamp} - ${event}`, {
    userId: userId || "unknown",
    userEmail: userEmail || "unknown",
    endpoint,
    ip,
    userAgent,
    method: req.method
  });
};

/**
 * Middleware que valida que el usuario sea administrador
 * SEGURIDAD: Verifica JWT + consulta BD + logs de seguridad
 */
export const validateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", req);
      return res.status(401).json({ 
        message: "Authorization header required for admin access" 
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logSecurityEvent("INVALID_TOKEN", req);
      return res.status(401).json({ 
        message: "Invalid Authorization header format" 
      });
    }

    const token = parts[1];
    if (!token) {
      logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", req);
      return res.status(401).json({ 
        message: "Token missing" 
      });
    }

    // 1. Verificar y decodificar JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch (err) {
      logSecurityEvent("INVALID_TOKEN", req);
      return res.status(401).json({ 
        message: "Invalid or expired token" 
      });
    }

    // 2. CRÍTICO: Consultar BD para verificar role actual (no confiar solo en token)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });

    if (!user) {
      logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", req, payload.id, payload.email);
      return res.status(401).json({ 
        message: "User not found" 
      });
    }

    // 3. VERIFICACIÓN CRÍTICA: Validar que el role sea admin
    if (user.role !== "admin") {
      logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", req, user.id, user.email);
      return res.status(403).json({ 
        message: "Admin access required. Unauthorized attempt logged." 
      });
    }

    // 4. Log de acceso exitoso
    logSecurityEvent("ADMIN_ACCESS_SUCCESS", req, user.id, user.email);

    // 5. Agregar información del usuario a la request
    (req as any).user = user;
    
    next();

  } catch (error) {
    console.error("❌ [ADMIN MIDDLEWARE ERROR]", error);
    logSecurityEvent("UNAUTHORIZED_ADMIN_ACCESS", req);
    
    return res.status(500).json({ 
      message: "Internal server error during admin validation" 
    });
  }
};

/**
 * Función helper para verificar si existe al menos un admin en el sistema
 * Usado para prevenir eliminación del último admin
 */
export const ensureAdminExists = async (): Promise<boolean> => {
  try {
    const adminCount = await prisma.user.count({
      where: { role: "admin" }
    });
    return adminCount > 0;
  } catch (error) {
    console.error("❌ Error checking admin existence:", error);
    return false;
  }
};

/**
 * Función helper para verificar si sería el último admin
 * Usado antes de cambiar role de un admin
 */
export const wouldBeLastAdmin = async (userId: number): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== "admin") {
      return false; // No es admin, no hay problema
    }

    const adminCount = await prisma.user.count({
      where: { role: "admin" }
    });

    return adminCount === 1; // Es el único admin
  } catch (error) {
    console.error("❌ Error checking if would be last admin:", error);
    return true; // En caso de error, asumir que sí sería el último (más seguro)
  }
};