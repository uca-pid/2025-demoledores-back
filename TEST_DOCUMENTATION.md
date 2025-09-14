# 🧪 Complete Test Suite Documentation

This document provides a comprehensive overview of all tests in the US Residential Complex Backend, including what they test, inputs, outputs, and detailed explanations.

## 📊 Test Suite Overview

| Test Suite | File | Tests Count | Status | Purpose |
|------------|------|-------------|--------|---------|
| **Basic Tests** | `tests/basic.test.ts` | 2 | ✅ (2/2) | Infrastructure validation |
| **Middleware Tests** | `tests/middleware.test.ts` | 7 | ✅ (7/7) | Security & authentication |
| **Auth Tests** | `tests/auth.test.ts` | 19 | ✅ (19/19) | User authentication flow |
| **Admin Tests** | `tests/admin.test.ts` | 21 | ⚠️ (20/21) | Admin functionality |
| **Reservation Tests** | `tests/reservations.test.ts` | 27 | ✅ (27/27) | Complete reservation system |
| **TOTAL** | - | **76** | **75/76 passing** | Complete backend coverage |

---

## 🔧 Basic Infrastructure Tests (`tests/basic.test.ts`)

### Purpose
Validates that the test environment is properly configured and basic functionality works.

### Tests

#### 1. `should run basic test`
- **What it tests**: Basic Jest functionality
- **Input**: Simple arithmetic operation (1 + 1)
- **Expected Output**: `2`
- **Why important**: Ensures Jest is working correctly

#### 2. `should have access to environment variables`
- **What it tests**: Environment variable access
- **Input**: `process.env.NODE_ENV`
- **Expected Output**: Any defined value (not undefined)
- **Why important**: Confirms test environment has proper configuration

---

## 🔐 Security Middleware Tests (`tests/middleware.test.ts`)

### Purpose
Tests the admin middleware security system that protects admin-only endpoints.

### Test Setup
- Creates Express app with protected `/test-admin` route
- Creates test users: regular user and admin user
- Uses JWT tokens for authentication

### Tests

#### Authentication Tests

##### 1. `should reject requests without authorization header`
- **Input**: GET request to `/test-admin` with no Authorization header
- **Expected Output**: 
  - Status: `401 Unauthorized`
  - Message: `"Authorization header required for admin access"`
- **What it validates**: Endpoint is protected and requires authentication

##### 2. `should reject requests with invalid token format`
- **Input**: Authorization header with invalid format (`"InvalidToken"`)
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Invalid Authorization header format"`
- **What it validates**: Proper Bearer token format is required

##### 3. `should reject requests with invalid JWT`
- **Input**: Malformed JWT token (`"Bearer invalid.jwt.token"`)
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Invalid or expired token"`
- **What it validates**: JWT validation works correctly

##### 4. `should allow valid admin access`
- **Input**: Valid admin JWT token
- **Expected Output**:
  - Status: `200 OK`
  - Message: `"Admin access granted"`
  - userId: Admin's ID
- **What it validates**: Valid admin users can access protected routes

##### 5. `should reject non-admin users`
- **Input**: Valid JWT but for a non-admin user (role: 'tenant')
- **Expected Output**:
  - Status: `403 Forbidden`
  - Message: `"Admin access required. Unauthorized attempt logged."`
- **What it validates**: Role-based access control works

#### Security Tests

##### 6. `should validate user exists in database`
- **Input**: Valid JWT for non-existent user (ID: 99999)
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"User not found"`
- **What it validates**: Middleware checks database, not just token

##### 7. `should validate current user role from database`
- **Input**: Admin JWT token for user whose role was changed to 'tenant' in database
- **Expected Output**:
  - Status: `403 Forbidden`
  - Message: `"Admin access required. Unauthorized attempt logged."`
- **What it validates**: Real-time role validation from database (critical security feature)

---

## 🔑 Authentication Tests (`tests/auth.test.ts`)

### Purpose
Tests the complete user authentication system including registration, login, and password reset.

### Test Setup
- Creates Express app with auth routes
- Uses test database with cleanup
- Creates initial test user for reuse

### Tests

#### User Registration Tests

##### 1. `should register a new user successfully`
- **Input**:
  ```json
  {
    "email": "test-random@example.com",
    "password": "password123",
    "name": "John Doe"
  }
  ```
- **Expected Output**:
  - Status: `201 Created`
  - Message: `"User registered successfully"`
  - Database: User created with hashed password
- **What it validates**: Complete user registration flow

##### 2. `should prevent duplicate email registration`
- **Input**: Registration data with existing email
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"User already exists"`
- **What it validates**: Email uniqueness constraint

##### 3. `should reject registration with missing required fields`
- **Input**: Data missing password and name
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"All fields are required"`
- **What it validates**: Input validation

#### User Login Tests

##### 4. `should login with valid credentials`
- **Input**:
  ```json
  {
    "email": "test-user@example.com",
    "password": "testpassword123"
  }
  ```
- **Expected Output**:
  - Status: `200 OK`
  - Message: `"Login successful"`
  - JWT token in response
- **What it validates**: Successful authentication and token generation

##### 5. `should reject login with invalid email`
- **Input**: Non-existent email
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Invalid credentials"`
- **What it validates**: Email validation without leaking information

##### 6. `should reject login with wrong password`
- **Input**: Valid email, wrong password
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Invalid credentials"`
- **What it validates**: Password validation without leaking information

##### 7. `should reject login with missing credentials`
- **Input**: Missing password field
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Email and password are required"`
- **What it validates**: Required field validation

#### Forgot Password Tests

##### 8. `should handle forgot password for existing email`
- **Input**:
  ```json
  {
    "email": "existing-user@example.com"
  }
  ```
- **Expected Output**:
  - Status: `200 OK`
  - Message: Contains `"se ha enviado un enlace"`
  - Database: Reset token and expiry created
- **What it validates**: Password reset token generation and email sending

##### 9. `should handle forgot password for non-existent email gracefully`
- **Input**: Non-existent email
- **Expected Output**:
  - Status: `200 OK`
  - Message: Contains `"se ha enviado un enlace"`
- **What it validates**: Security - doesn't reveal if email exists

##### 10. `should reject forgot password with missing email`
- **Input**: Empty request body
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Email is required"`
- **What it validates**: Input validation

#### Reset Password Tests

##### 11. `should reset password with valid token`
- **Input**:
  ```json
  {
    "token": "valid-reset-token",
    "newPassword": "newpassword123"
  }
  ```
- **Expected Output**:
  - Status: `200 OK`
  - Message: `"Password reset successfully"`
  - Database: Password updated, reset token cleared
- **What it validates**: Complete password reset flow

##### 12. `should reject reset with invalid token`
- **Input**: Invalid/non-existent token
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Invalid or expired reset token"`
- **What it validates**: Token validation

##### 13. `should reject reset with short password`
- **Input**: Password shorter than 6 characters
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Password must be at least 6 characters long"`
- **What it validates**: Password strength requirements

##### 14. `should reject reset with missing fields`
- **Input**: Missing newPassword field
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Token and new password are required"`
- **What it validates**: Required field validation

##### 15. `should reject reset with expired token`
- **Input**: Valid token but expired (created in past)
- **Expected Output**:
  - Status: `400 Bad Request`
  - Message: `"Invalid or expired reset token"`
- **What it validates**: Token expiration logic

#### Security Tests

##### 16. `should handle SQL injection attempts in login`
- **Input**: Malicious SQL in email field
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Invalid credentials"`
  - No database corruption
- **What it validates**: SQL injection protection

##### 17. `should hash passwords properly during registration`
- **Input**: Plain text password
- **Expected Output**:
  - Stored password is hashed (not plain text)
  - Hash length > 50 characters
- **What it validates**: Password hashing security

##### 18. `should handle malformed JSON gracefully`
- **Input**: Invalid JSON format
- **Expected Output**:
  - Status: `400 Bad Request`
  - No server crash
- **What it validates**: JSON parsing error handling

##### 19. `should not leak sensitive information in error messages`
- **Input**: Various invalid credentials
- **Expected Output**: Generic error messages
- **What it validates**: Information disclosure prevention

---

## 👑 Admin Functionality Tests (`tests/admin.test.ts`)

### Purpose
Tests all administrative functions including system stats, user management, amenity/apartment/reservation management.

### Test Setup
- Creates Express app with all admin routes
- Creates test admin and regular user
- Uses admin JWT tokens for authorization
- Comprehensive CRUD operation testing

### Tests

#### System Stats Tests

##### 1. `should return system statistics for admin`
- **Input**: GET `/admin/stats` with admin token
- **Expected Output**:
  - Status: `200 OK`
  - Response includes:
    ```json
    {
      "totalUsers": number,
      "totalApartments": number,
      "totalReservations": number,
      "totalAmenities": number,
      "generatedAt": "timestamp"
    }
    ```
- **What it validates**: System statistics calculation and admin access

##### 2. `should reject stats request without admin token`
- **Input**: GET `/admin/stats` without authorization
- **Expected Output**:
  - Status: `401 Unauthorized`
  - Message: `"Authorization header required for admin access"`
- **What it validates**: Admin protection on stats endpoint

#### User Management Tests

##### 3. `should get all users for admin`
- **Input**: GET `/admin/users` with admin token
- **Expected Output**:
  - Status: `200 OK`
  - Array of users with id, email, role properties
- **What it validates**: User listing functionality

##### 4. `should update user role`
- **Input**: PUT `/admin/users/{id}/role` with `{"role": "owner"}`
- **Expected Output**:
  - Status: `200 OK`
  - Message contains `"updated successfully"`
  - Database: User role actually updated
- **What it validates**: Role change functionality

##### 5. `should reject invalid role update`
- **Input**: Invalid role value
- **Expected Output**:
  - Status: `400 Bad Request`
- **What it validates**: Role validation

##### 6. `should prevent removing last admin`
- **Input**: Attempt to change last admin's role to non-admin
- **Expected Output**:
  - Status: `403 Forbidden`
  - Message: `"Cannot remove admin role from the last administrator"`
- **What it validates**: Critical security constraint

#### Amenity Management Tests

##### 7. `should create new amenity`
- **Input**:
  ```json
  {
    "name": "Test Gym",
    "capacity": 15,
    "maxDuration": 90
  }
  ```
- **Expected Output**:
  - Status: `201 Created`
  - Message contains `"created successfully"`
  - Returns amenity with generated ID
- **What it validates**: Amenity creation

##### 8. `should get all amenities with reservation counts`
- **Input**: GET `/admin/amenities`
- **Expected Output**:
  - Status: `200 OK`
  - Array of amenities with `_count` property
- **What it validates**: Amenity listing with aggregated data

##### 9. `should update amenity`
- **Input**: PUT with updated amenity data
- **Expected Output**:
  - Status: `200 OK`
  - Updated amenity data returned
- **What it validates**: Amenity update functionality

##### 10. `should delete amenity without active reservations`
- **Input**: DELETE `/admin/amenities/{id}` for amenity without reservations
- **Expected Output**:
  - Status: `204 No Content`
- **What it validates**: Safe amenity deletion

##### 11. `should prevent deletion of amenity with active reservations`
- **Input**: DELETE request for amenity with reservations
- **Expected Output**:
  - Status: `409 Conflict`
- **What it validates**: Business rule enforcement

#### Apartment Management Tests

##### 12. `should create new apartment`
- **Input**:
  ```json
  {
    "unit": "A202",
    "floor": 2,
    "rooms": 3,
    "ownerId": 123
  }
  ```
- **Expected Output**:
  - Status: `201 Created`
  - Apartment created with valid owner
- **What it validates**: Apartment creation with owner validation

##### 13. `should get all apartments`
- **Input**: GET `/admin/apartments`
- **Expected Output**:
  - Status: `200 OK`
  - Array of apartments
- **What it validates**: Apartment listing

##### 14. `should update apartment`
- **Input**: PUT with apartment updates
- **Expected Output**:
  - Status: `200 OK`
  - Updated apartment data
- **What it validates**: Apartment modification

##### 15. `should prevent apartment deletion with assigned users`
- **Input**: DELETE apartment with users assigned
- **Expected Output**:
  - Status: `400 Bad Request`
  - Error about assigned users
- **What it validates**: Data integrity constraint

##### 16. `should reject apartment creation with invalid owner`
- **Input**: Non-existent owner ID
- **Expected Output**:
  - Status: `404 Not Found`
- **What it validates**: Owner validation

#### Reservation Management Tests

##### 17. `should get all reservations`
- **Input**: GET `/admin/reservations`
- **Expected Output**:
  - Status: `200 OK`
  - Array of reservations with details
- **What it validates**: Reservation listing

##### 18. `should get amenity-specific reservations`
- **Input**: GET `/admin/amenities/{id}/reservations`
- **Expected Output**:
  - Status: `200 OK`
  - Filtered reservations for specific amenity
- **What it validates**: Filtered reservation queries

#### Validation Tests

##### 19. `should reject requests with missing required fields`
- **Input**: Incomplete amenity data
- **Expected Output**:
  - Status: `400 Bad Request`
- **What it validates**: Input validation

##### 20. `should reject requests with invalid IDs`
- **Input**: Non-numeric ID in URL
- **Expected Output**:
  - Status: `400 Bad Request`
- **What it validates**: ID format validation

##### 21. `should handle non-existent resource updates`
- **Input**: Update request for non-existent resource
- **Expected Output**:
  - Status: `404 Not Found`
- **What it validates**: Resource existence validation

---

## 🛠️ Test Infrastructure

### Test Data Management

#### Test Factories (`tests/helpers.ts`)
- **`createTestUser()`**: Creates users with unique emails and hashed passwords
- **`createTestAdmin()`**: Creates admin users
- **`createTestAmenity()`**: Creates test amenities
- **`createTestApartment()`**: Creates test apartments with owner validation
- **`createTestReservation()`**: Creates test reservations
- **`generateTestEmail()`**: Generates unique test emails
- **`generateTestJWT()`**: Creates valid JWT tokens for testing

#### Data Cleanup System
- **Targeted Cleanup**: Each test suite only cleans up data it created
- **Registry System**: Tracks created data by type (users, amenities, apartments, reservations)
- **Dependency Order**: Deletes in correct order to avoid foreign key violations
- **Test Isolation**: Prevents test interference when running in parallel

### Configuration Files

#### `jest.config.cjs`
```javascript
{
  testEnvironment: 'node',
  transform: { '^.+\\.(ts|tsx)$': 'babel-jest' },
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true
}
```

#### `babel.config.json`
```json
{
  "presets": [
    ["@babel/preset-env", { "targets": { "node": "current" } }],
    "@babel/preset-typescript"
  ]
}
```

### Running Tests

```bash
# All tests
npm test

# Specific test suites
npm run test:auth      # Authentication tests only
npm run test:admin     # Admin functionality tests only
npm run test:middleware # Security middleware tests only

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🔍 Test Execution Flow

### 1. Global Setup (`tests/setup.ts`)
- Initializes Prisma client
- Cleans database before tests start
- Sets up global test environment

### 2. Individual Test Suite Setup
- Creates Express app with specific routes
- Creates test data using factories
- Sets up authentication tokens

### 3. Test Execution
- Each test runs with isolated data
- Uses Supertest for HTTP request testing
- Validates responses and database state

### 4. Cleanup
- Each test suite cleans up its own data
- Global cleanup runs after all tests
- Database connection closed

---

## 📈 Test Coverage

### Security Coverage
- ✅ JWT Authentication
- ✅ Role-based Authorization  
- ✅ Input Validation
- ✅ SQL Injection Protection
- ✅ Information Disclosure Prevention
- ✅ Token Expiration
- ✅ Database Role Validation

### Business Logic Coverage
- ✅ User Registration & Login
- ✅ Password Reset Flow
- ✅ Admin System Statistics
- ✅ User Role Management
- ✅ Amenity CRUD Operations
- ✅ Apartment CRUD Operations
- ✅ Reservation Management
- ✅ Data Integrity Constraints

### Error Handling Coverage
- ✅ Missing Required Fields
- ✅ Invalid Data Types
- ✅ Non-existent Resources
- ✅ Business Rule Violations
- ✅ Authentication Failures
- ✅ Authorization Failures

---
---

## 🏊 Reservation System Tests (`tests/reservations.test.ts`)

### Purpose
Comprehensive testing of the complete reservation system, covering all 5 user reservation endpoints with complex business logic validation.

### Test Categories

#### 📝 Create Reservation Tests (9 tests)
Tests the `POST /reservations` endpoint for creating new reservations.

**1. Should create a reservation successfully**
- **Input**: Valid amenity ID, future start/end times
- **Expected**: Status 200, reservation object returned
- **Validates**: Basic reservation creation workflow

**2. Should reject reservation without authentication**
- **Input**: Valid reservation data, no auth token
- **Expected**: Status 401, authentication error
- **Validates**: Authentication requirement

**3. Should reject reservation with missing parameters**
- **Input**: Missing amenityId, startTime, or endTime
- **Expected**: Status 400, "Missing parameters"
- **Validates**: Required field validation

**4. Should reject reservation for non-existent amenity**
- **Input**: Invalid amenity ID (99999)
- **Expected**: Status 404, "Amenity not found"
- **Validates**: Foreign key validation

**5. Should reject reservation exceeding max duration**
- **Input**: Reservation longer than amenity's maxDuration
- **Expected**: Status 400, duration limit message
- **Validates**: Business rule: duration limits

**6. Should reject reservation with invalid time range**
- **Input**: Start time after end time
- **Expected**: Status 400, "Start time must be before end time"
- **Validates**: Logical time validation

**7. Should reject overlapping reservations for same user**
- **Input**: Two overlapping time slots for same user
- **Expected**: Status 400, "You already have a reservation during this time"
- **Validates**: Business rule: no overlapping user reservations

**8. Should reject multiple reservations for same amenity on same day**
- **Input**: Two reservations for same amenity, same day
- **Expected**: Status 400, "You already have a reservation for [amenity] on this day"
- **Validates**: Business rule: one reservation per amenity per day

**9. Should reject reservation when amenity capacity is full**
- **Input**: Reservation when capacity already reached
- **Expected**: Status 400, capacity exceeded message
- **Validates**: Business rule: capacity management

#### � Get User Reservations Tests (4 tests)
Tests the `GET /reservations` endpoint for retrieving user's own reservations.

**10. Should get user reservations successfully**
- **Input**: Authenticated user with existing reservations
- **Expected**: Status 200, array of user's reservations
- **Validates**: Basic retrieval functionality

**11. Should not show hidden reservations**
- **Input**: User with hidden and visible reservations
- **Expected**: Status 200, only visible reservations returned
- **Validates**: Hidden reservation filtering

**12. Should reject request without authentication**
- **Input**: No authentication token
- **Expected**: Status 401, authentication error
- **Validates**: Authentication requirement

**13. Should only return user own reservations**
- **Input**: Multiple users with reservations
- **Expected**: Status 200, only authenticated user's reservations
- **Validates**: Authorization: data isolation

#### ❌ Cancel Reservation Tests (4 tests)
Tests the `PATCH /reservations/:id/cancel` endpoint for canceling reservations.

**14. Should cancel reservation successfully**
- **Input**: Valid reservation ID owned by user
- **Expected**: Status 200, reservation status changed to "cancelled"
- **Validates**: Basic cancellation workflow

**15. Should reject cancellation without authentication**
- **Input**: Valid reservation ID, no auth token
- **Expected**: Status 401, authentication error
- **Validates**: Authentication requirement

**16. Should reject cancellation of non-existent reservation**
- **Input**: Invalid reservation ID (99999)
- **Expected**: Status 404, "Reservation not found"
- **Validates**: Resource existence validation

**17. Should reject cancellation of other user reservation**
- **Input**: Reservation ID owned by different user
- **Expected**: Status 403, "You can only cancel your own reservations"
- **Validates**: Authorization: ownership validation

#### 🏊‍♀️ Get Amenity Reservations Tests (4 tests)
Tests the `GET /reservations/amenity/:amenityId` endpoint for viewing amenity availability.

**18. Should get amenity reservations successfully**
- **Input**: Valid amenity ID with existing reservations
- **Expected**: Status 200, array of amenity's reservations
- **Validates**: Basic amenity reservation lookup

**19. Should filter reservations by date range**
- **Input**: Amenity ID with startDate and endDate query params
- **Expected**: Status 200, filtered reservations within date range
- **Validates**: Date range filtering functionality

**20. Should only return confirmed reservations**
- **Input**: Amenity with confirmed and cancelled reservations
- **Expected**: Status 200, only confirmed reservations
- **Validates**: Status filtering (excludes cancelled)

**21. Should reject request without authentication**
- **Input**: Valid amenity ID, no auth token
- **Expected**: Status 401, authentication error
- **Validates**: Authentication requirement

#### 👁️ Hide Reservation Tests (4 tests)
Tests the `PATCH /reservations/:id/hide` endpoint for hiding reservations from user view.

**22. Should hide reservation successfully**
- **Input**: Valid reservation ID owned by user
- **Expected**: Status 200, hiddenFromUser set to true
- **Validates**: Basic hide functionality

**23. Should reject hiding without authentication**
- **Input**: Valid reservation ID, no auth token
- **Expected**: Status 401, authentication error
- **Validates**: Authentication requirement

**24. Should reject hiding non-existent reservation**
- **Input**: Invalid reservation ID (99999)
- **Expected**: Status 404, "Reservation not found"
- **Validates**: Resource existence validation

**25. Should reject hiding other user reservation**
- **Input**: Reservation ID owned by different user
- **Expected**: Status 403, "You can only hide your own reservations"
- **Validates**: Authorization: ownership validation

#### ⚠️ Error Handling Tests (2 tests)
Tests error scenarios and edge cases.

**26. Should handle database errors gracefully**
- **Input**: Valid data when database connection might fail
- **Expected**: Status 500, "Internal server error"
- **Validates**: Graceful error handling

**27. Should handle malformed dates**
- **Input**: Invalid date strings (e.g., "invalid-date")
- **Expected**: Status 400, "Invalid date format"
- **Validates**: Input validation and error handling

### Key Business Rules Tested

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access/modify their own reservations
3. **No Overlapping Reservations**: Users cannot have time conflicts
4. **One Per Day Rule**: Users can only book one reservation per amenity per day
5. **Capacity Limits**: Reservations respect amenity capacity constraints
6. **Duration Limits**: Reservations cannot exceed amenity max duration
7. **Time Validation**: Start time must be before end time
8. **Date Validation**: Proper handling of invalid date formats
9. **Hidden Reservations**: Hidden reservations don't appear in user lists
10. **Status Filtering**: Only confirmed reservations shown in amenity views

### Test Infrastructure

- **Setup**: Creates test users, amenities, and tokens before each test suite
- **Cleanup**: Comprehensive cleanup after each test to prevent interference
- **Authentication**: JWT token generation for different user roles
- **Data Isolation**: Each test uses unique data to avoid conflicts
- **Foreign Key Handling**: Proper cleanup order to respect database constraints

---

## �🚀 Key Features

1. **Complete Test Isolation**: Tests don't interfere with each other
2. **Realistic Test Data**: Uses factories to create valid test scenarios
3. **Security-First Testing**: Extensive security and authorization testing
4. **Business Rule Validation**: Tests all critical business constraints
5. **Error Scenario Coverage**: Tests both success and failure paths
6. **Database Integration**: Full database testing with proper cleanup
7. **Type Safety**: Full TypeScript support in tests
8. **CI/CD Ready**: Fast, reliable tests suitable for automation
9. **Comprehensive Coverage**: All 5 user reservation endpoints tested
10. **Complex Business Logic**: Overlapping prevention, capacity management, same-day restrictions

This comprehensive test suite ensures the reliability, security, and maintainability of the US Residential Complex Backend system.