# C Mindset -> This Codebase

If you come from C/C++ systems background, this mapping helps:

## High-level mapping

- **API routes** (`src/app/api/*/route.ts`)  
  Equivalent to HTTP handlers/endpoints in a server module.

- **Prisma schema** (`prisma/schema.prisma`)  
  Equivalent to data model/table definitions.

- **`src/lib/*`**  
  Equivalent to utility/business-logic modules. Keep logic here, keep handlers thin.

- **React components** (`src/components/*`)  
  Equivalent to UI view modules. Inputs/state -> render output.

## Practical reading order

1. Start with `prisma/schema.prisma` (domain model)
2. Read API route handlers
3. Read supporting logic in `src/lib`
4. Read UI components last

## Rules for maintainability

- Keep route handlers short.
- Move logic to pure helper functions in `src/lib`.
- Prefer explicit typing and small functions.
- Keep side effects (Stripe/Runpod/storage) behind dedicated wrappers.
