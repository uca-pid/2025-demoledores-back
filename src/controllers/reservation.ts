import type { Request, Response } from "express";
import { prisma } from "../prismaClient.ts";

// Create a reservation
export const createReservation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "User not authenticated" });

    const { amenityId, startTime, endTime } = req.body;
    if (!amenityId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
    if (!amenity) return res.status(404).json({ message: "Amenity not found" });

    const duration = (end.getTime() - start.getTime()) / 60000;
    if (duration > amenity.maxDuration) {
      return res.status(400).json({ message: `Max duration for ${amenity.name} is ${amenity.maxDuration} minutes` });
    }

    if (start >= end) return res.status(400).json({ message: "Start time must be before end time" });

    const conflicts = await prisma.reservation.findMany({
      where: {
        amenityId,
        status: "confirmed",
        OR: [{ startTime: { lte: end }, endTime: { gte: start } }],
      },
    });

    if (conflicts.length > 0) return res.status(400).json({ message: "Time slot already reserved" });

    const reservation = await prisma.reservation.create({
      data: {
        user: { connect: { id: userId } },
        amenity: { connect: { id: amenityId } },
        startTime: start,
        endTime: end,
        status: "confirmed",
      },
    });

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all reservations of the logged-in user
export const getUserReservations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: { amenity: true },
      orderBy: { startTime: "asc" },
    });

    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// PATCH /reservations/:id/cancel
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params; // reservation ID

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Check if reservation exists and belongs to user
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    if (reservation.userId !== userId) return res.status(403).json({ message: "Not allowed" });

    // Update status to cancelled
    const cancelled = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status: "cancelled" },
    });

    res.json(cancelled);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
