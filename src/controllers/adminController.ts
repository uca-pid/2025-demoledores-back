import type { Request, Response } from "express";
import { prisma } from "../prismaClient.ts";
import { wouldBeLastAdmin } from "../middleware/adminMiddleware.ts";

/**
 * GET /admin/stats - Estadísticas generales del sistema
 * Acceso: Solo administradores
 */
export const getSystemStats = async (req: Request, res: Response) => {
  try {
    console.log(`📊 [ADMIN STATS] User ${(req as any).user.email} requesting system stats`);

    // Consultas paralelas para mejor rendimiento
    const [
      totalUsers,
      totalApartments,
      totalReservations,
      activeReservations,
      totalAmenities
    ] = await Promise.all([
      prisma.user.count(),
      prisma.apartment.count(),
      prisma.reservation.count(),
      prisma.reservation.count({
        where: {
          status: "confirmed",
          endTime: {
            gte: new Date() // Reservas que aún no han terminado
          }
        }
      }),
      prisma.amenity.count()
    ]);

    const stats = {
      totalUsers,
      totalApartments,
      totalReservations,
      activeReservations,
      totalAmenities,
      generatedAt: new Date().toISOString()
    };

    console.log(`✅ [ADMIN STATS] Stats generated successfully:`, stats);

    res.json(stats);
  } catch (error) {
    console.error("❌ [ADMIN STATS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching system statistics" 
    });
  }
};

/**
 * GET /admin/users - Listar todos los usuarios con información completa
 * Acceso: Solo administradores
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log(`👥 [ADMIN USERS] User ${(req as any).user.email} requesting all users`);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        apartmentId: true,
        apartment: {
          select: {
            id: true,
            unit: true,
            floor: true,
            rooms: true
          }
        },
        _count: {
          select: {
            reservations: true,
            ownedApartments: true
          }
        }
      },
      orderBy: [
        { role: "desc" }, // Admins primero
        { name: "asc" }
      ]
    });

    // Formatear respuesta con información adicional
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      apartmentId: user.apartmentId,
      apartment: user.apartment ? {
        id: user.apartment.id,
        unit: user.apartment.unit,
        floor: user.apartment.floor,
        rooms: user.apartment.rooms
      } : null,
      reservationCount: user._count.reservations,
      ownedApartmentsCount: user._count.ownedApartments
    }));

    console.log(`✅ [ADMIN USERS] Retrieved ${formattedUsers.length} users`);

    res.json({
      users: formattedUsers,
      totalCount: formattedUsers.length,
      retrievedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ [ADMIN USERS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching users list" 
    });
  }
};

/**
 * PUT /admin/users/:id/role - Cambiar role de un usuario
 * Acceso: Solo administradores
 * Protección: No permite eliminar el último admin
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminUser = (req as any).user;

    console.log(`🔄 [ADMIN ROLE CHANGE] User ${adminUser.email} attempting to change user ${id} role to ${role}`);

    // Validar que el role sea válido
    const validRoles = ["admin", "tenant", "owner"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be: admin, tenant, or owner" 
      });
    }

    const userId = parseInt(id || "");
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: "Invalid user ID" 
      });
    }

    // Verificar que el usuario existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ 
        message: "User not found" 
      });
    }

    // PROTECCIÓN CRÍTICA: No permitir eliminar el último admin
    if (targetUser.role === "admin" && role !== "admin") {
      const isLastAdmin = await wouldBeLastAdmin(userId);
      if (isLastAdmin) {
        console.log(`🚨 [SECURITY] Attempt to remove last admin blocked. User: ${adminUser.email}, Target: ${targetUser.email}`);
        return res.status(403).json({ 
          message: "Cannot remove admin role from the last administrator in the system" 
        });
      }
    }

    // Actualizar el role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`✅ [ADMIN ROLE CHANGE] Successfully changed user ${targetUser.email} role from ${targetUser.role} to ${role}`);

    res.json({
      message: "User role updated successfully",
      user: updatedUser,
      previousRole: targetUser.role,
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN ROLE CHANGE ERROR]", error);
    res.status(500).json({ 
      message: "Error updating user role" 
    });
  }
};

/**
 * GET /admin/reservations - Obtener todas las reservas del sistema
 * Acceso: Solo administradores
 */
export const getAllReservations = async (req: Request, res: Response) => {
  try {
    const { status, amenityId, limit = "50" } = req.query;
    const adminUser = (req as any).user;

    console.log(`📋 [ADMIN RESERVATIONS] User ${adminUser.email} requesting reservations. Filters:`, { status, amenityId, limit });

    // Construir filtros
    const where: any = {};
    
    if (status && typeof status === "string") {
      where.status = status;
    }
    
    if (amenityId && typeof amenityId === "string") {
      const amenityIdNum = parseInt(amenityId);
      if (!isNaN(amenityIdNum)) {
        where.amenityId = amenityIdNum;
      }
    }

    const limitNum = parseInt(limit as string) || 50;
    const maxLimit = Math.min(limitNum, 200); // Máximo 200 para evitar sobrecarga

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        amenity: {
          select: {
            id: true,
            name: true,
            capacity: true,
            maxDuration: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: maxLimit
    });

    console.log(`✅ [ADMIN RESERVATIONS] Retrieved ${reservations.length} reservations`);

    res.json({
      reservations,
      totalCount: reservations.length,
      filters: { status, amenityId, limit: maxLimit },
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN RESERVATIONS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching reservations" 
    });
  }
};

/**
 * POST /admin/amenities - Crear nuevo amenity
 * Acceso: Solo administradores
 */
export const createAmenity = async (req: Request, res: Response) => {
  try {
    const { name, capacity, maxDuration } = req.body;
    const adminUser = (req as any).user;

    console.log(`➕ [ADMIN CREATE AMENITY] User ${adminUser.email} creating amenity:`, { name, capacity, maxDuration });

    // Validaciones
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ 
        message: "Amenity name is required and must be a non-empty string" 
      });
    }

    if (!capacity || typeof capacity !== "number" || capacity < 1) {
      return res.status(400).json({ 
        message: "Capacity is required and must be a positive number" 
      });
    }

    if (!maxDuration || typeof maxDuration !== "number" || maxDuration < 1) {
      return res.status(400).json({ 
        message: "Max duration is required and must be a positive number (in minutes)" 
      });
    }

    // Verificar que no exista un amenity con el mismo nombre
    const existingAmenity = await prisma.amenity.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive"
        }
      }
    });

    if (existingAmenity) {
      return res.status(409).json({ 
        message: "An amenity with this name already exists" 
      });
    }

    // Crear el amenity
    const newAmenity = await prisma.amenity.create({
      data: {
        name: name.trim(),
        capacity,
        maxDuration
      }
    });

    console.log(`✅ [ADMIN CREATE AMENITY] Successfully created amenity: ${newAmenity.name} (ID: ${newAmenity.id})`);

    res.status(201).json({
      message: "Amenity created successfully",
      amenity: newAmenity,
      createdBy: adminUser.email,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN CREATE AMENITY ERROR]", error);
    res.status(500).json({ 
      message: "Error creating amenity" 
    });
  }
};

/**
 * PUT /admin/amenities/:id - Actualizar amenity existente
 * Acceso: Solo administradores
 */
export const updateAmenity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, capacity, maxDuration } = req.body;
    const adminUser = (req as any).user;

    console.log(`✏️ [ADMIN UPDATE AMENITY] User ${adminUser.email} updating amenity ${id}:`, { name, capacity, maxDuration });

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ 
        message: "Invalid amenity ID" 
      });
    }

    // Verificar que el amenity existe
    const existingAmenity = await prisma.amenity.findUnique({
      where: { id: amenityId }
    });

    if (!existingAmenity) {
      return res.status(404).json({ 
        message: "Amenity not found" 
      });
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ 
          message: "Name must be a non-empty string" 
        });
      }
      updateData.name = name.trim();
    }

    if (capacity !== undefined) {
      if (typeof capacity !== "number" || capacity < 1) {
        return res.status(400).json({ 
          message: "Capacity must be a positive number" 
        });
      }
      updateData.capacity = capacity;
    }

    if (maxDuration !== undefined) {
      if (typeof maxDuration !== "number" || maxDuration < 1) {
        return res.status(400).json({ 
          message: "Max duration must be a positive number (in minutes)" 
        });
      }
      updateData.maxDuration = maxDuration;
    }

    // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
    if (updateData.name && updateData.name !== existingAmenity.name) {
      const duplicateAmenity = await prisma.amenity.findFirst({
        where: {
          name: {
            equals: updateData.name,
            mode: "insensitive"
          },
          id: {
            not: amenityId
          }
        }
      });

      if (duplicateAmenity) {
        return res.status(409).json({ 
          message: "An amenity with this name already exists" 
        });
      }
    }

    // Actualizar amenity
    const updatedAmenity = await prisma.amenity.update({
      where: { id: amenityId },
      data: updateData
    });

    console.log(`✅ [ADMIN UPDATE AMENITY] Successfully updated amenity: ${updatedAmenity.name} (ID: ${updatedAmenity.id})`);

    res.json({
      message: "Amenity updated successfully",
      amenity: updatedAmenity,
      updatedFields: Object.keys(updateData),
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN UPDATE AMENITY ERROR]", error);
    res.status(500).json({ 
      message: "Error updating amenity" 
    });
  }
};

// ======================================================================
// 🏢 GESTIÓN DE APARTAMENTOS - NUEVAS FUNCIONES
// ======================================================================

/**
 * GET /admin/apartments - Obtener todos los apartamentos con información completa
 * Acceso: Solo administradores
 */
export const getAllApartments = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    console.log(`🏠 [ADMIN APARTMENTS] User ${adminUser.email} requesting all apartments`);

    const apartments = await prisma.apartment.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tenants: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            tenants: true
          }
        }
      },
      orderBy: [
        { floor: "asc" },
        { unit: "asc" }
      ]
    });

    // Formatear respuesta con información adicional
    const formattedApartments = apartments.map(apartment => {
      const isOccupied = apartment.tenants.length > 0;
      const tenant = apartment.tenants.length > 0 ? apartment.tenants[0] : null;

      return {
        id: apartment.id,
        unit: apartment.unit,
        floor: apartment.floor,
        areaM2: apartment.areaM2,
        observations: apartment.observations,
        rooms: apartment.rooms,
        isOccupied,
        owner: apartment.owner,
        tenant,
        _count: {
          users: 1 + apartment.tenants.length, // owner + tenants
          tenants: apartment.tenants.length
        }
      };
    });

    console.log(`✅ [ADMIN APARTMENTS] Retrieved ${formattedApartments.length} apartments`);

    res.json({
      apartments: formattedApartments,
      totalCount: formattedApartments.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN APARTMENTS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching apartments list" 
    });
  }
};

/**
 * POST /admin/apartments - Crear nuevo apartamento
 * Acceso: Solo administradores
 */
export const createApartment = async (req: Request, res: Response) => {
  try {
    const { unit, floor, rooms, areaM2, observations, ownerId } = req.body;
    const adminUser = (req as any).user;

    console.log(`➕ [ADMIN CREATE APARTMENT] User ${adminUser.email} creating apartment:`, { unit, floor, rooms, ownerId });

    // Validaciones obligatorias
    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return res.status(400).json({ 
        message: "Unit is required and must be a non-empty string" 
      });
    }

    if (!floor || typeof floor !== "number" || floor < 1) {
      return res.status(400).json({ 
        message: "Floor is required and must be a positive number (minimum 1)" 
      });
    }

    if (!rooms || typeof rooms !== "number" || rooms < 1 || rooms > 10) {
      return res.status(400).json({ 
        message: "Rooms is required and must be between 1 and 10" 
      });
    }

    // Validar que el unit sea único
    const existingApartment = await prisma.apartment.findFirst({
      where: {
        unit: {
          equals: unit.trim(),
          mode: "insensitive"
        }
      }
    });

    if (existingApartment) {
      return res.status(409).json({ 
        message: "An apartment with this unit number already exists" 
      });
    }

    // Validar owner si se proporciona
    if (ownerId) {
      if (typeof ownerId !== "number") {
        return res.status(400).json({ 
          message: "Owner ID must be a number" 
        });
      }

      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true, email: true }
      });

      if (!owner) {
        return res.status(404).json({ 
          message: "Owner not found" 
        });
      }

      if (owner.role !== "owner" && owner.role !== "admin") {
        return res.status(400).json({ 
          message: "Owner must have role 'owner' or 'admin'" 
        });
      }
    }

    // Preparar datos para crear
    const createData: any = {
      unit: unit.trim(),
      floor,
      rooms
    };

    if (areaM2 && typeof areaM2 === "number" && areaM2 > 0) {
      createData.areaM2 = areaM2;
    }

    if (observations && typeof observations === "string") {
      createData.observations = observations.trim();
    }

    if (ownerId) {
      createData.owner = { connect: { id: ownerId } };
    }

    // Crear el apartamento
    const newApartment = await prisma.apartment.create({
      data: createData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`✅ [ADMIN CREATE APARTMENT] Successfully created apartment: ${newApartment.unit} (ID: ${newApartment.id})`);

    res.status(201).json({
      message: "Apartment created successfully",
      apartment: {
        ...newApartment,
        isOccupied: false,
        tenant: null
      },
      createdBy: adminUser.email,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN CREATE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error creating apartment" 
    });
  }
};

/**
 * PUT /admin/apartments/:id - Actualizar apartamento existente
 * Acceso: Solo administradores
 */
export const updateApartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { unit, floor, rooms, areaM2, observations, ownerId, tenantId } = req.body;
    const adminUser = (req as any).user;

    console.log(`✏️ [ADMIN UPDATE APARTMENT] User ${adminUser.email} updating apartment ${id}:`, req.body);

    const apartmentId = parseInt(id || "");
    if (isNaN(apartmentId)) {
      return res.status(400).json({ 
        message: "Invalid apartment ID" 
      });
    }

    // Verificar que el apartamento existe
    const existingApartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        owner: true,
        tenants: true
      }
    });

    if (!existingApartment) {
      return res.status(404).json({ 
        message: "Apartment not found" 
      });
    }

    // Preparar datos de actualización
    const updateData: any = {};
    const updatedFields: string[] = [];

    // Validar y actualizar unit
    if (unit !== undefined) {
      if (typeof unit !== "string" || unit.trim().length === 0) {
        return res.status(400).json({ 
          message: "Unit must be a non-empty string" 
        });
      }

      // Verificar que el nuevo unit no exista (excepto el actual)
      if (unit.trim() !== existingApartment.unit) {
        const duplicateApartment = await prisma.apartment.findFirst({
          where: {
            unit: {
              equals: unit.trim(),
              mode: "insensitive"
            },
            id: {
              not: apartmentId
            }
          }
        });

        if (duplicateApartment) {
          return res.status(409).json({ 
            message: "An apartment with this unit number already exists" 
          });
        }
      }

      updateData.unit = unit.trim();
      updatedFields.push("unit");
    }

    // Validar y actualizar floor
    if (floor !== undefined) {
      if (typeof floor !== "number" || floor < 1) {
        return res.status(400).json({ 
          message: "Floor must be a positive number (minimum 1)" 
        });
      }
      updateData.floor = floor;
      updatedFields.push("floor");
    }

    // Validar y actualizar rooms
    if (rooms !== undefined) {
      if (typeof rooms !== "number" || rooms < 1 || rooms > 10) {
        return res.status(400).json({ 
          message: "Rooms must be between 1 and 10" 
        });
      }
      updateData.rooms = rooms;
      updatedFields.push("rooms");
    }

    // Actualizar areaM2
    if (areaM2 !== undefined) {
      if (areaM2 === null) {
        updateData.areaM2 = null;
      } else if (typeof areaM2 === "number" && areaM2 > 0) {
        updateData.areaM2 = areaM2;
      } else {
        return res.status(400).json({ 
          message: "Area must be a positive number or null" 
        });
      }
      updatedFields.push("areaM2");
    }

    // Actualizar observations
    if (observations !== undefined) {
      updateData.observations = observations === null ? null : observations.trim();
      updatedFields.push("observations");
    }

    // Validar y actualizar owner
    if (ownerId !== undefined) {
      if (ownerId === null) {
        updateData.owner = { disconnect: true };
        updatedFields.push("owner");
      } else if (typeof ownerId === "number") {
        const owner = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, role: true }
        });

        if (!owner) {
          return res.status(404).json({ 
            message: "Owner not found" 
          });
        }

        if (owner.role !== "owner" && owner.role !== "admin") {
          return res.status(400).json({ 
            message: "Owner must have role 'owner' or 'admin'" 
          });
        }

        updateData.owner = { connect: { id: ownerId } };
        updatedFields.push("owner");
      } else {
        return res.status(400).json({ 
          message: "Owner ID must be a number or null" 
        });
      }
    }

    // Validar y actualizar tenant
    if (tenantId !== undefined) {
      if (tenantId === null) {
        // Desconectar tenant actual
        const currentTenant = existingApartment.tenants[0];
        if (currentTenant) {
          updateData.tenants = { disconnect: { id: currentTenant.id } };
          updatedFields.push("tenant");
        }
      } else if (typeof tenantId === "number") {
        const tenant = await prisma.user.findUnique({
          where: { id: tenantId },
          select: { id: true, role: true, apartmentId: true }
        });

        if (!tenant) {
          return res.status(404).json({ 
            message: "Tenant not found" 
          });
        }

        if (tenant.role !== "tenant") {
          return res.status(400).json({ 
            message: "Tenant must have role 'tenant'" 
          });
        }

        if (tenant.apartmentId && tenant.apartmentId !== apartmentId) {
          return res.status(400).json({ 
            message: "Tenant is already assigned to another apartment" 
          });
        }

        // Desconectar tenant actual si existe
        const currentTenant = existingApartment.tenants[0];
        if (currentTenant && currentTenant.id !== tenantId) {
          updateData.tenants = { 
            disconnect: { id: currentTenant.id },
            connect: { id: tenantId }
          };
        } else if (!currentTenant) {
          updateData.tenants = { connect: { id: tenantId } };
        }
        updatedFields.push("tenant");
      } else {
        return res.status(400).json({ 
          message: "Tenant ID must be a number or null" 
        });
      }
    }

    // Actualizar apartamento si hay cambios
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        message: "No fields to update" 
      });
    }

    const updatedApartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tenants: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`✅ [ADMIN UPDATE APARTMENT] Successfully updated apartment: ${updatedApartment.unit} (ID: ${updatedApartment.id})`);

    res.json({
      message: "Apartment updated successfully",
      apartment: {
        ...updatedApartment,
        isOccupied: updatedApartment.tenants.length > 0,
        tenant: updatedApartment.tenants.length > 0 ? updatedApartment.tenants[0] : null
      },
      updatedFields,
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN UPDATE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error updating apartment" 
    });
  }
};

/**
 * DELETE /admin/apartments/:id - Eliminar apartamento
 * Acceso: Solo administradores
 * Validaciones: Verificar dependencias antes de eliminar
 */
export const deleteApartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    console.log(`🗑️ [ADMIN DELETE APARTMENT] User ${adminUser.email} attempting to delete apartment ${id}`);

    const apartmentId = parseInt(id || "");
    if (isNaN(apartmentId)) {
      return res.status(400).json({ 
        message: "Invalid apartment ID" 
      });
    }

    // Verificar que el apartamento existe y obtener dependencias
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        tenants: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            tenants: true
          }
        }
      }
    });

    if (!apartment) {
      return res.status(404).json({ 
        message: "Apartment not found" 
      });
    }

    // Verificar si tiene usuarios asignados
    const assignedUsers = apartment.tenants.length + (apartment.owner ? 1 : 0);
    
    if (assignedUsers > 0) {
      console.log(`🚨 [ADMIN DELETE APARTMENT] Cannot delete apartment ${id}: has assigned users`);
      return res.status(400).json({ 
        error: "Cannot delete apartment: has assigned users",
        details: {
          assignedUsers,
          owner: apartment.owner,
          tenants: apartment.tenants
        }
      });
    }

    // Verificar si tiene reservas (por parte de inquilinos del apartamento)
    const activeReservations = await prisma.reservation.count({
      where: {
        user: {
          apartmentId: apartmentId
        },
        status: {
          in: ["confirmed", "pending"]
        }
      }
    });

    if (activeReservations > 0) {
      console.log(`🚨 [ADMIN DELETE APARTMENT] Cannot delete apartment ${id}: has active reservations`);
      return res.status(400).json({ 
        error: "Cannot delete apartment: has active reservations",
        details: {
          activeReservations,
          assignedUsers: 0
        }
      });
    }

    // Proceder con la eliminación
    const deletedApartment = await prisma.apartment.delete({
      where: { id: apartmentId }
    });

    console.log(`✅ [ADMIN DELETE APARTMENT] Successfully deleted apartment: ${deletedApartment.unit} (ID: ${deletedApartment.id})`);

    res.json({
      message: "Apartment deleted successfully",
      deletedApartment: {
        id: deletedApartment.id,
        unit: deletedApartment.unit,
        floor: deletedApartment.floor
      },
      deletedBy: adminUser.email,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN DELETE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error deleting apartment" 
    });
  }
};

// ======================================================================
// 🏊 GESTIÓN DE AMENITIES COMPLETA - FUNCIONES NUEVAS Y ACTUALIZADAS
// ======================================================================

/**
 * GET /admin/amenities - Obtener todos los amenities con conteos de reservas
 * Acceso: Solo administradores
 */
export const getAllAmenities = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    console.log(`🏊 [ADMIN AMENITIES] User ${adminUser.email} requesting all amenities`);

    const amenities = await prisma.amenity.findMany({
      include: {
        _count: {
          select: {
            reservations: true
          }
        }
      },
      orderBy: [
        { name: "asc" }
      ]
    });

    // Obtener conteo de reservas activas para cada amenity
    const amenitiesWithCounts = await Promise.all(
      amenities.map(async (amenity) => {
        const activeReservations = await prisma.reservation.count({
          where: {
            amenityId: amenity.id,
            status: "confirmed",
            endTime: {
              gte: new Date() // Reservas que aún no han terminado
            }
          }
        });

        return {
          id: amenity.id,
          name: amenity.name,
          capacity: amenity.capacity,
          maxDuration: amenity.maxDuration,
          _count: {
            reservations: amenity._count.reservations,
            activeReservations
          }
        };
      })
    );

    console.log(`✅ [ADMIN AMENITIES] Retrieved ${amenitiesWithCounts.length} amenities`);

    res.json({
      amenities: amenitiesWithCounts,
      totalCount: amenitiesWithCounts.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN AMENITIES ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching amenities list" 
    });
  }
};

/**
 * DELETE /admin/amenities/:id - Eliminar amenity
 * Acceso: Solo administradores
 * Validaciones: Verificar que no tenga reservas activas
 */
export const deleteAmenity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    console.log(`🗑️ [ADMIN DELETE AMENITY] User ${adminUser.email} attempting to delete amenity ${id}`);

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ 
        message: "Invalid amenity ID" 
      });
    }

    // Verificar que el amenity existe
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      select: {
        id: true,
        name: true,
        capacity: true,
        maxDuration: true
      }
    });

    if (!amenity) {
      return res.status(404).json({ 
        message: "Amenity no encontrado" 
      });
    }

    // Verificar si tiene reservas activas o futuras
    const activeReservations = await prisma.reservation.count({
      where: {
        amenityId: amenityId,
        status: {
          in: ["confirmed", "pending"]
        },
        endTime: {
          gte: new Date() // Reservas que aún no han terminado o están por empezar
        }
      }
    });

    if (activeReservations > 0) {
      console.log(`🚨 [ADMIN DELETE AMENITY] Cannot delete amenity ${id}: has ${activeReservations} active reservations`);
      return res.status(409).json({ 
        message: "No se puede eliminar: el amenity tiene reservas activas",
        details: {
          activeReservations,
          amenityName: amenity.name
        }
      });
    }

    // Proceder con la eliminación
    const deletedAmenity = await prisma.amenity.delete({
      where: { id: amenityId }
    });

    console.log(`✅ [ADMIN DELETE AMENITY] Successfully deleted amenity: ${deletedAmenity.name} (ID: ${deletedAmenity.id})`);

    res.status(204).send(); // 204 No Content

  } catch (error) {
    console.error("❌ [ADMIN DELETE AMENITY ERROR]", error);
    res.status(500).json({ 
      message: "Error deleting amenity" 
    });
  }
};

/**
 * GET /admin/amenities/:id/reservations - Obtener todas las reservas de un amenity específico
 * Acceso: Solo administradores
 */
export const getAmenityDetailReservations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = "50" } = req.query;
    const adminUser = (req as any).user;

    console.log(`📋 [ADMIN AMENITY RESERVATIONS] User ${adminUser.email} requesting reservations for amenity ${id}. Filters:`, { status, limit });

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ 
        message: "Invalid amenity ID" 
      });
    }

    // Verificar que el amenity existe
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      select: {
        id: true,
        name: true,
        capacity: true,
        maxDuration: true
      }
    });

    if (!amenity) {
      return res.status(404).json({ 
        message: "Amenity no encontrado" 
      });
    }

    // Construir filtros para las reservas
    const where: any = {
      amenityId: amenityId
    };

    // Filtrar por status si se proporciona
    if (status && typeof status === "string") {
      const validStatuses = ["active", "confirmed", "pending", "cancelled", "completed"];
      
      if (status === "active") {
        // Reservas activas = confirmadas y que aún no han terminado
        where.status = "confirmed";
        where.endTime = {
          gte: new Date()
        };
      } else if (status === "completed") {
        // Reservas completadas = confirmadas y que ya terminaron
        where.status = "confirmed";
        where.endTime = {
          lt: new Date()
        };
      } else if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    const limitNum = parseInt(limit as string) || 50;
    const maxLimit = Math.min(limitNum, 200); // Máximo 200 para evitar sobrecarga

    // Obtener las reservas
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            apartment: {
              select: {
                unit: true,
                floor: true
              }
            }
          }
        }
      },
      orderBy: { startTime: "desc" },
      take: maxLimit
    });

    // Obtener conteo total (sin límite)
    const totalCount = await prisma.reservation.count({ where });

    // Formatear las reservas
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
      createdAt: reservation.createdAt,
      user: {
        id: reservation.user.id,
        name: reservation.user.name,
        email: reservation.user.email,
        apartment: reservation.user.apartment ? {
          unit: reservation.user.apartment.unit,
          floor: reservation.user.apartment.floor
        } : null
      }
    }));

    console.log(`✅ [ADMIN AMENITY RESERVATIONS] Retrieved ${formattedReservations.length} reservations for amenity ${amenity.name}`);

    res.json({
      reservations: formattedReservations,
      amenityName: amenity.name,
      amenityId: amenity.id,
      totalCount,
      filters: { status, limit: maxLimit },
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN AMENITY RESERVATIONS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching amenity reservations" 
    });
  }
};