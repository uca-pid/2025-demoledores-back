import { Router } from 'express';
import { getApartments, getApartmentById } from '../controllers/apartmentController.ts';

const router = Router();

// GET /apartments - Get all apartments
router.get('/', getApartments);

// GET /apartments/:id - Get apartment by ID
router.get('/:id', getApartmentById);

export default router;