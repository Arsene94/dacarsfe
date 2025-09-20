# Customer Authentication API

The customer-facing auth endpoints power the booking portal. They use a dedicated Sanctum guard (`customer`). Public actions live under the `/api/customer` prefix; protected routes apply the `auth:sanctum` and `customer` middleware stack.

## Endpoint overview
| Method | URL | Description | Auth | Notes |
| --- | --- | --- | --- | --- |
| POST | `/api/customer/register` | Create a new customer account and issue a token. | None | Status defaults to `published`; email verification token is generated automatically. |
| POST | `/api/customer/login` | Authenticate by email + password. | None | Returns a token + `CustomerResource`. |
| POST | `/api/customer/password/forgot` | Send a reset email through the `customers` password broker. | None | Response mirrors the admin password helper. |
| POST | `/api/customer/password/reset` | Reset customer password and revoke tokens. | None | Requires `token`, `email`, `password`, `password_confirmation`. |
| POST | `/api/customer/verify` | Confirm email by token. | None | Optional flow – returns a confirmation message. |
| GET | `/api/customer/me` | Fetch the authenticated customer profile. | Bearer token + `customer` guard | Header: `Authorization: Bearer <token>`. |
| POST | `/api/customer/logout` | Revoke the current token. | Bearer token + `customer` guard | Response `{ "message": "OK" }`. |
| POST | `/api/customer/logout-all` | Revoke every token belonging to the customer. | Bearer token + `customer` guard | Useful after password changes. |

---

## POST `/api/customer/register`
Creates a customer record and sets `status` to `published`. The controller hashes the password and seeds an `email_verify_token` so you can implement a custom confirmation flow.

### Request body
```json
{
  "name": "Maria Enache",
  "email": "maria.enache@example.com",
  "password": "CarRental!2025",
  "phone": "+40 723 555 111"
}
```

### Success response (HTTP 201)
```json
{
  "token": "4|U3p3WkF4d3pHM1FJcTdxbk11M2Y1dkdUak5pUzltcWJkYVdNM1ZKVnV6dE9u",
  "customer": {
    "id": 88,
    "name": "Maria Enache",
    "email": "maria.enache@example.com",
    "avatar": null,
    "phone": "+40 723 555 111",
    "dob": null,
    "status": "published",
    "confirmed_at": null,
    "created_at": "2025-02-14T09:05:00+02:00",
    "updated_at": "2025-02-14T09:05:00+02:00"
  }
}
```

Validation errors follow the standard Laravel JSON format (422 status).

---

## POST `/api/customer/login`
Authenticates by email and password. The returned payload mirrors the register response but without the 201 status code.

### Request
```json
{
  "email": "maria.enache@example.com",
  "password": "CarRental!2025"
}
```

### Success response
```json
{
  "token": "5|bE5HTXlqQWtNVG45cXNtZ3V6d09RSHhaUG4yRzQydWZFTkxGd1RTbnBaUmhw",
  "customer": {
    "id": 88,
    "name": "Maria Enache",
    "email": "maria.enache@example.com",
    "avatar": null,
    "phone": "+40 723 555 111",
    "dob": null,
    "status": "published",
    "confirmed_at": null,
    "created_at": "2025-02-14T09:05:00+02:00",
    "updated_at": "2025-02-14T09:05:00+02:00"
  }
}
```

Invalid credentials yield HTTP 422 and `{ "message": "Invalid credentials" }`.

---

## Password reset helpers
The forgot and reset endpoints behave like their admin counterparts but rely on the `customers` password broker. Successful responses include translated messages (e.g. `"We have emailed your password reset link!"`). On reset success all active customer tokens are revoked.

```json
{
  "token": "a54eb7bcbf7f4ebf93c2f6b0cbceaa61ec89c92d",
  "email": "maria.enache@example.com",
  "password": "NewStrongPass2025",
  "password_confirmation": "NewStrongPass2025"
}
```

Response:
```json
{
  "message": "Your password has been reset!"
}
```

---

## POST `/api/customer/verify`
Optional confirmation step that clears the `email_verify_token` and stores the confirmation timestamp.

### Request
```json
{
  "token": "8d52771e0b2c43bb8c1c7645f8f4b332"
}
```

### Response
```json
{
  "message": "Email verified"
}
```

Unknown tokens respond with HTTP 422 and `{ "message": "Invalid token" }`.

---

## Authenticated routes
Attach the customer token to access the protected profile routes.

### GET `/api/customer/me`
```json
{
  "data": {
    "id": 88,
    "name": "Maria Enache",
    "email": "maria.enache@example.com",
    "avatar": null,
    "phone": "+40 723 555 111",
    "dob": null,
    "status": "published",
    "confirmed_at": null,
    "created_at": "2025-02-14T09:05:00+02:00",
    "updated_at": "2025-02-14T09:05:00+02:00"
  }
}
```

### POST `/api/customer/logout`
```json
{
  "message": "OK"
}
```

### POST `/api/customer/logout-all`
```json
{
  "message": "OK"
}
```
