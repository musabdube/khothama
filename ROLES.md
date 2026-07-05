# Role Management

## User Roles

Khothama has two user roles:

1. **USER** (Default) - Regular users who can buy and sell products
2. **ADMIN** - Administrators with full access to the platform

## Default Signup

All users who sign up through the registration form are created as **USER** role by default.

## Creating Admin Users

Admin users cannot be created through the public signup form. To create an admin user, you need to manually update the database:

### Option 1: Using Prisma Studio

```bash
npx prisma studio
```

Then navigate to the User model and change the role field to "ADMIN" for the desired user.

### Option 2: Using SQL

Connect to your PostgreSQL database and run:

```sql
UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'admin@example.com';
```

### Option 3: Create a script

Create a script in your project to promote users to admin:

```typescript
import prisma from "@/lib/prisma"

async function promoteToAdmin(email: string) {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" }
  })
  console.log(`User ${user.email} promoted to ADMIN`)
}

// Usage: promoteToAdmin("user@example.com")
```

## Security Note

Always ensure that admin creation is done securely and never expose admin creation endpoints publicly.
