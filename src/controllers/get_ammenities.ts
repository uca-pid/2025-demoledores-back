import type { Request, Response } from "express";
import { prisma } from "../prismaClient.ts";

// GET /amenities
export const getAmenities = async (req: Request, res: Response) => {
  try {
    // Opcional: puedes usar (req as any).user si quieres filtrar amenities por usuario
    const amenities = await prisma.amenity.findMany({
      select: {
        id: true,
        name: true,
        capacity: true,
        maxDuration: true,
      },
    });

    res.json(amenities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
