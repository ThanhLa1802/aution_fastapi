# 2FA Implementation Guide

## Overview
This implementation provides a complete TOTP (Time-based One-Time Password) 2FA flow integrated with your FastAPI authentication system. Users can register, setup 2FA, verify their identity, and enable 2FA on their account.

## Database Changes
- Added `totp_secret` column to the `users` table to store the TOTP secret key
- Run migration: `alembic upgrade head` to apply the changes

## API Endpoints

### 1. Setup 2FA
**Endpoint:** `POST /2fa/setup`
- **Authentication:** Required (Bearer token)
- **Description:** Initialize 2FA setup for the user
- **Response:**
```json
{
  "secret": "ABCD1234EFGH5678IJKL",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
  "manual_entry_key": "ABCD1234EFGH5678IJKL"
}
```

**Steps:**
1. User calls this endpoint after logging in
2. Frontend displays the QR code to the user
3. User scans the QR code with their authenticator app (Google Authenticator, Authy, etc.)
4. The secret is temporarily stored in Redis for 10 minutes
5. Frontend saves the secret for step 2 (optional, for offline access)

### 2. Verify Setup Code
**Endpoint:** `POST /2fa/verify`
- **Authentication:** Required (Bearer token)
- **Body:**
```json
{
  "code": "123456"  // 6-digit code from authenticator app
}
```
- **Description:** Verify the TOTP code to confirm the setup is correct
- **Response:**
```json
{
  "message": "Verification code is correct. You can now enable 2FA.",
  "status": "verified"
}
```

**Steps:**
1. User enters the 6-digit code from their authenticator app
2. System verifies the code matches the temporarily stored secret
3. If correct, a "verified" flag is set in Redis (10 minutes expiry)
4. User proceeds to enable 2FA

### 3. Enable 2FA
**Endpoint:** `POST /2fa/enable`
- **Authentication:** Required (Bearer token)
- **Description:** Finalize 2FA setup by saving the secret to database
- **Response:**
```json
{
  "message": "2FA has been successfully enabled",
  "is_enabled_2fa": true
}
```

**Steps:**
1. After successful verification, user calls this endpoint
2. The temporary secret from Redis is saved to the database
3. Temporary Redis entries are cleaned up
4. User's `is_enabled_2fa` flag is set to `true`

### 4. Disable 2FA
**Endpoint:** `POST /2fa/disable`
- **Authentication:** Required (Bearer token)
- **Description:** Disable 2FA for the user
- **Response:**
```json
{
  "message": "2FA has been disabled",
  "is_enabled_2fa": false
}
```

### 5. Verify TOTP During Login
**Endpoint:** `POST /auth/verify-totp`
- **Authentication:** Not required
- **Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"  // Current TOTP code
}
```
- **Description:** Verify TOTP code during login process
- **Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

## Complete User Flow

### Setup Flow (First Time)
```
1. User logs in (gets JWT token)
   POST /auth/login → receive access_token

2. User initiates 2FA setup
   POST /2fa/setup
   → receive QR code + secret

3. User scans QR code with authenticator app
   (App generates 6-digit codes every 30 seconds)

4. User verifies the code
   POST /2fa/verify (body: {"code": "123456"})
   → receive "verified" status

5. User enables 2FA
   POST /2fa/enable
   → 2FA is now enabled on account
```

### Login Flow (After 2FA Enabled)
```
1. User logs in with password
   POST /auth/login or /auth/send-otp
   
2. If 2FA is enabled, user gets TOTP code from app
   
3. User verifies TOTP code
   POST /auth/verify-totp (body: {"email": "user@example.com", "code": "123456"})
   → receive access_token

4. User is logged in
```

## Security Features

1. **Temporary Storage:** Secrets are stored in Redis with 10-minute expiry
2. **Time Window:** TOTP verification allows ±1 time window for clock skew
3. **Atomic Operations:** 2FA is only enabled after successful verification
4. **Cleanup:** Temporary Redis entries are automatically deleted after verification

## Installation

### 1. Install Dependencies
```bash
pip install pyotp qrcode[pil]
```

Or use the updated requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. Run Database Migration
```bash
alembic upgrade head
```

## Testing with curl

### Setup 2FA
```bash
curl -X POST "http://localhost:8000/2fa/setup" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Verify Setup Code (use code from authenticator app)
```bash
curl -X POST "http://localhost:8000/2fa/verify" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### Enable 2FA
```bash
curl -X POST "http://localhost:8000/2fa/enable" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Login with TOTP (after 2FA is enabled)
```bash
curl -X POST "http://localhost:8000/auth/verify-totp" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "code": "123456"}'
```

### Disable 2FA
```bash
curl -X POST "http://localhost:8000/2fa/disable" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Files Modified/Created

- **app/models.py** - Added `totp_secret` field to User model
- **app/schemas.py** - Added 2FA-related Pydantic schemas
- **app/services/twofa_service.py** - New file with 2FA business logic
- **app/routers/twofa.py** - New file with 2FA endpoints
- **app/routers/auth.py** - Added `/auth/verify-totp` endpoint
- **app/repositories/user_repo.py** - Added `update_user` method
- **app/dependencies.py** - Updated `get_current_user` to return User object
- **app/main.py** - Registered the 2FA router
- **requirements.txt** - Added pyotp and qrcode dependencies
- **alembic/versions/add_totp_secret.py** - Database migration

## Common Issues

### 1. "2FA setup not initialized"
- Call `/2fa/setup` first
- Make sure Redis is running

### 2. "Invalid verification code"
- Check system time synchronization (TOTP is time-based)
- Code expires every 30 seconds
- Make sure user is using current code, not previous one

### 3. "2FA code not verified"
- Call `/2fa/verify` with correct code before calling `/2fa/enable`
- Make sure verification happened within 10 minutes

### 4. "Token has been revoked"
- User's token is blacklisted
- User needs to log in again

## Enhancement Ideas

1. **Backup Codes** - Generate single-use backup codes for account recovery
2. **Recovery Email** - Send recovery codes to email during 2FA setup
3. **Device Trust** - Remember devices for 30 days
4. **SMS/Email OTP** - Add alternative 2FA methods
5. **Rate Limiting** - Prevent brute force attacks on 2FA codes
6. **Audit Logging** - Log all 2FA setup/disable events

