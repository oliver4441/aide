# Agent C - Product Images, Auto SKU, Configurable Categories

## Completed Edits

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `imageUrl String?` and `thumbnailUrl String?` to Product model
- Ran `npx prisma generate` and `npx prisma db push` — both succeeded

### 2. Dexie DB (`src/lib/db.ts`)
- Added `imageUrl?: string` and `thumbnailUrl?: string` to ProductRecord interface

### 3. Inventory Page (`src/app/dashboard/inventory/page.tsx`)
**Image Upload:**
- File input accepts jpg, png, webp
- Compresses images >500KB via canvas (scales down dimensions + reduces JPEG quality)
- Stores base64 data URL in state, persisted to Dexie product record
- Preview shown in form with remove button
- Two buttons: "Upload" (file picker) and "Take Photo" (device camera via `capture="environment"`)

**Auto SKU:**
- Manual SKU input removed for new products
- Auto-generates SKU on save: format `{CATEGORY_ABBR}-{4 digits}`
- Category abbreviation lookup (HC for Hair Care, EL for Electronics, etc.)
- Falls back to "GEN-" prefix if no category
- Generated SKU shown as read-only text after first save
- Edit mode still allows manual SKU editing

**Product Table:**
- Added thumbnail image column (9x9 rounded image or placeholder icon)
- Shows category name instead of "—"

### 4. Settings Page (`src/app/dashboard/settings/page.tsx`)
- Added "Product Categories" section between Sync/Conflicts and Preferences
- Loads categories from Dexie via liveQuery
- Input + "Add" button for new categories
- List of categories with "Remove" buttons
- Categories stored in Dexie, sync via syncEngine

### 5. Receipt Document (`src/components/receipt/ReceiptDocument.tsx`)
- Added `imageUrl?: string` to ReceiptItem interface
- Renders 32x32 thumbnail next to item name when imageUrl exists
- CSS rule `.receipt-image { display: none !important; }` in `@media print` hides images in thermal print mode
- A4/screen mode shows thumbnails normally

### 6. API Routes
- `src/app/api/products/route.ts`: POST now includes `imageUrl` and `thumbnailUrl`
- `src/app/api/products/[id]/route.ts`: PATCH handles `imageUrl` and `thumbnailUrl`

## Files Modified
- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/app/dashboard/inventory/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/components/receipt/ReceiptDocument.tsx`
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`

## Design Token Compliance
- All colors use design tokens: bg-surface, text-on-surface, bg-primary, text-on-primary, border-outline-variant, bg-surface-container, text-on-surface-variant, text-primary
- No hardcoded colors used
- No emojis used
