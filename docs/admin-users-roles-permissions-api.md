# Admin Users, Roles & Permissions API

Centralised endpoints for managing back-office users, role assignments, and permission catalogues. All routes require an authenticated Sanctum admin token and the appropriate permission guard.

## Users (`/api/users`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/users` | Paginated list with optional filters. | `users.view` |
| GET `/api/users/{id}` | Retrieve a user (`UserResource`). | `users.view` |
| POST `/api/users` | Create a user and assign roles. | `users.create` |
| PUT `/api/users/{id}` | Update profile, password, and roles. | `users.update` |
| DELETE `/api/users/{id}` | Delete user (revokes tokens). | `users.delete` |
| POST `/api/users/{id}/super` | Promote to super user (bypass permission checks). | `users.grant_super` |
| DELETE `/api/users/{id}/super` | Remove super flag. | `users.revoke_super` |

### Query filters
- `roles` – slug or CSV list (`roles=admin,marketing`).
- `search` – matches first name, last name, email, username, and phone (if column exists).
- Standard pagination parameters apply (`per_page`, `page`).

### Create request
```json
{
  "first_name": "Andrei",
  "last_name": "Ionescu",
  "email": "andrei@dacars.ro",
  "username": "andrei",
  "password": "StrongPass!2025",
  "roles": ["admin", "marketing"]
}
```

### Response (201)
```json
{
  "data": {
    "id": 12,
    "first_name": "Andrei",
    "last_name": "Ionescu",
    "email": "andrei@dacars.ro",
    "username": "andrei",
    "avatar": null,
    "super_user": false,
    "manage_supers": false,
    "roles": ["admin", "marketing"],
    "permissions": [
      "bookings.view",
      "bookings.update",
      "blog_posts.view"
    ],
    "last_login": null,
    "created_at": "2025-02-14T12:05:00+02:00",
    "updated_at": "2025-02-14T12:05:00+02:00"
  }
}
```

Passwords are hashed automatically. Omitting `roles` on create leaves the user without role assignments.

### Update example
```json
{
  "first_name": "Andrei",
  "last_name": "Ionescu",
  "email": "andrei@dacars.ro",
  "username": "andrei",
  "roles": ["operational"],
  "password": "NewPass!2025"
}
```

Response mirrors the resource. When `roles` is provided the controller syncs the pivot to match the supplied slugs.

### Super user toggles
```
POST   /api/users/12/super    → { "data": { ... "super_user": true } }
DELETE /api/users/12/super    → { "data": { ... "super_user": false } }
```
Both endpoints enforce an additional policy: the acting user must be `super_user` or have `manage_supers = true`, otherwise `403 Forbidden` is returned.

---

## Roles (`/api/roles`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/roles` | Paginated list with attached permissions. | `roles.view` |
| POST `/api/roles` | Create role (`slug`, `name`, optional `description`, `is_default`). | `roles.create` |
| PUT `/api/roles/{id}` | Update role and sync permissions. | `roles.update` |
| DELETE `/api/roles/{id}` | Delete role (detaches users + permissions). | `roles.delete` |

### Create example
```json
{
  "slug": "marketing",
  "name": "Marketing",
  "description": "Gestionare blog, oferte, campanii",
  "permissions": [
    "blog_posts.view",
    "blog_posts.create",
    "blog_posts.update",
    "blog_posts.delete"
  ]
}
```

### Response
```json
{
  "id": 7,
  "slug": "marketing",
  "name": "Marketing",
  "description": "Gestionare blog, oferte, campanii",
  "is_default": 0,
  "created_at": "2025-02-14T12:20:00+02:00",
  "updated_at": "2025-02-14T12:20:00+02:00",
  "permissions": [
    { "id": 101, "name": "blog_posts.view", "group": "blog_posts" },
    { "id": 102, "name": "blog_posts.create", "group": "blog_posts" },
    { "id": 103, "name": "blog_posts.update", "group": "blog_posts" },
    { "id": 104, "name": "blog_posts.delete", "group": "blog_posts" }
  ]
}
```

Omitting `permissions` leaves the role without abilities. When updating, include the full permission list—missing names are removed.

---

## Permissions (`/api/permissions`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/permissions` | Return the full permission catalogue grouped alphabetically. | `permissions.view` |

### Response
```json
[
  { "id": 1, "name": "bookings.view", "group": "bookings" },
  { "id": 2, "name": "bookings.update", "group": "bookings" },
  { "id": 3, "name": "bookings.delete", "group": "bookings" },
  { "id": 4, "name": "cars.view", "group": "cars" },
  { "id": 5, "name": "cars.create", "group": "cars" },
  { "id": 6, "name": "cars.update", "group": "cars" },
  { "id": 7, "name": "cars.delete", "group": "cars" }
]
```

Use the catalogue to build permission pickers in the admin UI. Permissions follow the `group.action` naming convention and mirror the entries seeded by `PermissionSeeder`.

---

## Error handling
- Duplicate emails or usernames return standard validation errors (HTTP 422).
- Attempting to delete a non-existent user or role returns 404.
- Creating roles without the `slug` field returns `422 { "errors": { "slug": ["The slug field is required."] } }`.
