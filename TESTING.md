# Testing Documentation

This document describes the comprehensive testing suite implemented for the US Residential Complex Backend API.

## Test Coverage

### 🔐 Authentication & Security Tests
- **Admin Middleware (`tests/middleware.test.ts`)**
  - JWT token validation (valid/invalid/expired tokens)
  - Role-based access control (admin vs tenant)
  - Database user validation (deleted users, role changes)
  - Security edge cases and error handling

### 🔑 Auth Controller Tests (`tests/auth.test.ts`)
- **User Registration**
  - Valid user creation with password hashing
  - Duplicate email prevention
  - Required field validation
- **User Login**
  - Valid credential authentication
  - Invalid email/password rejection
  - JWT token generation
- **Password Reset Flow**
  - Forgot password token generation
  - Reset password with valid tokens
  - Token expiration and validation
- **Security**
  - SQL injection protection
  - Input validation
  - Error handling

### 👑 Admin Controller Tests (`tests/admin.test.ts`)
- **System Statistics**
  - User, apartment, reservation, amenity counts
  - Admin-only access validation
- **User Management**
  - Get all users
  - Update user roles (tenant/owner/admin)
  - Prevent last admin deletion
- **Amenity Management**
  - Create/read/update/delete amenities
  - Prevent deletion with active reservations
  - Reservation count tracking
- **Apartment Management**
  - CRUD operations for apartments
  - Owner assignment validation
  - Tenant relationship handling
- **Reservation Management**
  - View all reservations
  - Amenity-specific reservation filtering
  - Status-based filtering

## Test Infrastructure

### Dependencies
- **Jest**: Testing framework
- **Supertest**: HTTP endpoint testing
- **TypeScript**: Type-safe testing
- **Prisma**: Database operations in tests

### Configuration
- **jest.config.js**: Jest configuration with TypeScript support
- **tests/setup.ts**: Global test setup and database connection
- **tests/helpers.ts**: Test utilities and data factories
- **tests/jest.d.ts**: TypeScript declarations for Jest

### Test Database
Tests use the same database as development but with careful cleanup between tests to prevent data pollution.

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# Admin functionality tests
npm run test:admin

# Middleware security tests
npm run test:middleware
```

## Test Utilities

### Data Factories (`tests/helpers.ts`)
- `createTestUser()`: Creates test users with configurable properties
- `createTestAdmin()`: Creates admin users for testing
- `createTestAmenity()`: Creates test amenities
- `createTestApartment()`: Creates test apartments
- `createTestReservation()`: Creates test reservations
- `generateTestJWT()`: Generates valid JWT tokens for testing

### Cleanup Functions
- `cleanupTestData()`: Removes all test data
- `cleanupTestUsers()`: Removes test users specifically

## Test Structure

Each test file follows the pattern:
1. **Setup**: Create Express app, test data, and authentication tokens
2. **Test Suites**: Grouped by functionality (e.g., "User Management Tests")
3. **Individual Tests**: Specific scenarios with assertions
4. **Cleanup**: Remove test data after completion

## Security Testing

### Authentication Tests
- ✅ JWT validation (malformed, expired, missing tokens)
- ✅ Role-based access control
- ✅ Database user verification
- ✅ Token payload validation

### Input Validation Tests
- ✅ SQL injection protection
- ✅ Required field validation
- ✅ Type checking
- ✅ Edge case handling

### Authorization Tests
- ✅ Admin-only endpoint protection
- ✅ User role verification from database
- ✅ Last admin protection
- ✅ Resource ownership validation

## Business Logic Testing

### Admin Operations
- ✅ System statistics calculation
- ✅ User role management with constraints
- ✅ CRUD operations with validation
- ✅ Relationship integrity (apartments-owners, reservations-amenities)

### Data Integrity
- ✅ Prevent deletion of amenities with active reservations
- ✅ Validate apartment-owner relationships
- ✅ Ensure proper reservation status transitions
- ✅ Maintain referential integrity

## Error Handling

### Database Errors
- ✅ Connection failures
- ✅ Constraint violations
- ✅ Non-existent resource operations
- ✅ Transaction rollbacks

### Validation Errors
- ✅ Missing required fields
- ✅ Invalid data types
- ✅ Business rule violations
- ✅ Proper HTTP status codes

## Best Practices Implemented

1. **Isolated Tests**: Each test is independent and doesn't rely on others
2. **Data Cleanup**: Proper cleanup prevents test pollution
3. **Realistic Data**: Test factories create realistic test data
4. **Security Focus**: Extensive security and authorization testing
5. **Error Coverage**: Tests both success and failure scenarios
6. **Type Safety**: Full TypeScript support in tests

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- Fast execution (parallelizable tests)
- Clear failure reporting
- Coverage metrics
- No external dependencies (uses same database)

## Adding New Tests

When adding new functionality:
1. Add test data factories to `helpers.ts` if needed
2. Create test file following naming convention (`feature.test.ts`)
3. Include security, validation, and business logic tests
4. Add cleanup for any new test data
5. Update this documentation if needed

## Metrics

The test suite covers:
- **13 Admin Endpoints**: All admin functionality tested
- **5 Auth Endpoints**: Complete authentication flow
- **Security Middleware**: JWT and role validation
- **Business Logic**: All critical business rules
- **Error Scenarios**: Comprehensive error handling
- **Data Integrity**: Database constraints and relationships

This comprehensive testing approach ensures the reliability, security, and maintainability of the residential complex management system.