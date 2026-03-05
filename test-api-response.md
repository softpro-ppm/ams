# API Response Testing Guide

## Test Projects, Categories, and Subcategories in Forms

### Database Status
✅ **Projects**: 3 (Softpro HO, BC Corporation, APSSDC)
✅ **Categories**: 16 (10 expense + 5 income)
✅ **Subcategories**: 68

### How to Test

1. **Start Backend Server** (if not running):
   ```bash
   cd backend
   php artisan serve
   ```

2. **Start Frontend Server** (if not running):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login**:
   - Email: `demo@softpro.test` or `admin@softpro.com`
   - Password: `password`

4. **Test Transaction Form**:
   - Navigate to Transactions page
   - Click "Add transaction" button
   - Verify:
     - ✅ Type dropdown shows both "Income" and "Expense"
     - ✅ Category dropdown shows categories based on selected type
     - ✅ Subcategory dropdown shows subcategories when category is selected
     - ✅ Project dropdown shows all 3 projects

5. **Test Loan Form**:
   - Navigate to Loans page
   - Click "New loan" button
   - Verify:
     - ✅ Project dropdown shows all 3 projects

6. **Test Reports Filters**:
   - Navigate to Reports page
   - Open filters
   - Verify:
     - ✅ Project dropdown shows all projects
     - ✅ Category dropdown shows all categories

### Expected API Responses

**Projects API** (`GET /api/projects`):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Softpro HO",
      "color": "#2563eb",
      "is_active": true,
      ...
    }
  ]
}
```

**Categories API** (`GET /api/categories`):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Office Operations",
      "type": "expense",
      "color": "#2563eb",
      "subcategories": [...]
    }
  ]
}
```

**Subcategories API** (`GET /api/subcategories?category_id=1`):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Office Supplies",
      "category_id": 1,
      ...
    }
  ]
}
```

### Troubleshooting

If data doesn't appear:
1. Check browser console for errors
2. Check Network tab for API responses
3. Verify API returns data wrapped in `{ data: [...] }` format
4. Check if user is authenticated (cookies/session)
5. Verify backend is running on correct port (8000 or 8001)

