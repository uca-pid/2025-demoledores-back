import { Router } from "express";
import { requireAuth } from "../auth_middleware.ts";
import { createReservation, getUserReservations, cancelReservation, getAmenityReservations } from "../controllers/reservation.ts";


const router = Router();

// POST /reservations -> create a new reservation
router.post("/", requireAuth, createReservation);

// GET /reservations -> get reservations of the logged-in user
router.get("/", requireAuth, getUserReservations);


// PATCH /reservations/:id/cancel -> cancel a reservation
router.patch("/:id/cancel", requireAuth, cancelReservation);

// GET /reservations/amenity/:amenityId -> get all reservations for a specific amenity
router.get("/amenity/:amenityId", requireAuth, getAmenityReservations);


export default router;
