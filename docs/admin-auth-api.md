# Admin Authentication API

These endpoints issue and manage Sanctum tokens for the internal admin SPA. All routes live under the `/api` prefix. Only the "me" and logout operations require an authenticated admin token.

## Endpoint overview
| Method | URL | Description | Auth | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Exchange email or username + password for an access token. | None | Request uses the `login` field (email or username). |
| POST | `/api/auth/register` | Create a new back-office user and return an access token. | None | Registration can be disabled at runtime from config. |
| POST | `/api/auth/password/forgot` | Send a password reset email. | None | Alias of `/api/password/forgot`. |
| POST | `/api/password/forgot` | Send a password reset email. | None | Public helper for custom forms. |
| POST | `/api/auth/password/reset` | Reset the password using a token issued via email. | None | Alias of `/api/password/reset`. |
| POST | `/api/password/reset` | Reset the password using a token issued via email. | None | Revokes all active tokens on success. |
| GET | `/api/auth/me` | Fetch the authenticated admin profile. | Bearer token | Returns a `UserResource`. |
| POST | `/api/auth/logout` | Revoke the current Sanctum token. | Bearer token | Always responds with `{ "message": "OK" }`. |
| POST | `/api/auth/logout-all` | Revoke all tokens for the current admin. | Bearer token | Use after password resets. |

> **Permissions:** these routes rely solely on Sanctum authentication. No additional `permission:` middleware is applied in `routes/api.php` for the auth endpoints.

---

## POST `/api/auth/login`
Authenticate an admin by email or username. The controller updates the `last_login` timestamp and issues a new token named `api`.

### Request body
```json
{
  "login": "admin@dacars.ro",
  "password": "secret-password"
}
```

### Successful response
```json
{
  "token": "1|Q1J1dE5oZ0d5UUtHa1h0R0pFQm1mUzlaRjZsZ0lPN1k5c0EyZzh3SllmTThW",
  "user": {
    "id": 12,
    "first_name": "Andrei",
    "last_name": "Ionescu",
    "email": "admin@dacars.ro",
    "username": "andrei",
    "avatar": null,
    "super_user": true,
    "manage_supers": true,
    "roles": [
      "admin"
    ],
    "permissions": [
      "bookings.view",
      "cars.update",
      "roles.view"
    ],
    "last_login": "2025-02-12T10:14:22+02:00",
    "created_at": "2024-11-08T09:30:00+02:00",
    "updated_at": "2025-02-12T10:14:22+02:00"
  }
}
```

### Invalid credentials
```json
{
  "message": "Invalid credentials"
}
```
(Response code: 422)

---

## POST `/api/auth/register`
Creates a new admin account, hashes the password, and immediately returns a token + profile payload.

### Request body
```json
{
  "first_name": "Ioana",
  "last_name": "Pop",
  "email": "ioana.pop@dacars.ro",
  "username": "ioana.pop",
  "password": "ChangeMe2024"
}
```

### Successful response
Identical to the login payload but with HTTP status `201 Created`.

```json
{
  "token": "2|ZlZqUkZuM2hMVjV4bkhYemk1R2hjSFhLcnVCeVlnSlpZMm5lbGZWeEUzWnJy",
  "user": {
    "id": 13,
    "first_name": "Ioana",
    "last_name": "Pop",
    "email": "ioana.pop@dacars.ro",
    "username": "ioana.pop",
    "avatar": null,
    "super_user": false,
    "manage_supers": false,
    "roles": [],
    "permissions": [],
    "last_login": null,
    "created_at": "2025-02-14T08:02:41+02:00",
    "updated_at": "2025-02-14T08:02:41+02:00"
  }
}
```

Duplicate email/username constraints trigger validation errors:
```json
{
  "message": "The email has already been taken.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

## Password reset helpers
Both the `/api/auth/password/forgot` and `/api/password/forgot` routes call the same controller. They expect a JSON payload with the target email. On success the Laravel password broker returns a translated message (`passwords.sent`).

### Request
```json
{
  "email": "admin@dacars.ro"
}
```

### Success response
```json
{
  "message": "We have emailed your password reset link!"
}
```

When the email is unknown the broker still responds with HTTP 200 but includes the translated error message in the body. Validation errors (missing email) yield status 422.

### Reset endpoint
The `/api/auth/password/reset` and `/api/password/reset` routes validate the broker token and accept the new password twice (`password` + `password_confirmation`).

```json
{
  "token": "3c42767d90f6d0b37f0475bb4cc4b8c78a5c4d54",
  "email": "admin@dacars.ro",
  "password": "NewSecurePass2025",
  "password_confirmation": "NewSecurePass2025"
}
```

Success response:
```json
{
  "message": "Your password has been reset!"
}
```

On success all previous tokens are revoked (`$user->tokens()->delete()`), so the UI should force the user to log in again.

---

## GET `/api/auth/me`
Returns the authenticated admin user using `UserResource`. Attach the token in the `Authorization` header.

```
Authorization: Bearer <token>
```

### Response
```json
{
  "data": {
    "id": 12,
    "first_name": "Andrei",
    "last_name": "Ionescu",
    "email": "admin@dacars.ro",
    "username": "andrei",
    "avatar": null,
    "super_user": true,
    "manage_supers": true,
    "roles": ["admin"],
    "permissions": ["bookings.view", "cars.update", "roles.view"],
    "last_login": "2025-02-12T10:14:22+02:00",
    "created_at": "2024-11-08T09:30:00+02:00",
    "updated_at": "2025-02-12T10:14:22+02:00"
  }
}
```

---

## POST `/api/auth/logout`
Revokes the current token and responds with a confirmation message.

```json
{
  "message": "OK"
}
```

## POST `/api/auth/logout-all`
Deletes every token that belongs to the authenticated admin. Use after changing sensitive data such as passwords or roles.

```json
{
  "message": "OK"
}
```
