# Bulk Upload Logic Explanation

## Overview
Bulk upload allows you to import multiple transactions or loans from an Excel file (.xlsx or .xls) at once instead of adding them one by one.

## How It Works

### Step 1: Download Template
- Click "Download Template" button in Settings page
- This downloads a pre-formatted Excel file with:
  - Header row (column names)
  - One example row showing the format
  - Proper column structure

### Step 2: Fill Your Data
- Open the downloaded template in Excel
- Fill in your data following the example row
- **Important:** Keep the header row as-is, don't delete it
- Fill data starting from row 2 (row 1 is the header)

### Step 3: Upload File
- Drag and drop your Excel file OR click "Browse Files"
- The system will parse the file and show a preview (first 10 rows)
- Review the preview to ensure data looks correct

### Step 4: Import
- Click "Import" button after reviewing preview
- The system processes each row one by one
- For each row, it:
  1. Validates the data (checks required fields, formats, etc.)
  2. Creates/finds Project, Category, Subcategory if they don't exist
  3. Checks for duplicates
  4. Creates the transaction/loan record

### Step 5: Review Results
- After import, you'll see:
  - **Successful count:** How many rows were imported successfully
  - **Failed count:** How many rows had errors
  - **Error details:** List of failed rows with specific error messages

## Transaction Import Logic

### Required Columns (in order):
1. **Date** - Format: DD-MM-YYYY (e.g., 23-04-2025)
2. **Type** - Must be: `income` or `expense`
3. **Project Name** - Will be created if doesn't exist
4. **Category Name** - Will be created if doesn't exist
5. **Subcategory Name** - Will be created if doesn't exist
6. **Amount** - Numeric value (e.g., 35000)
7. **Phone Number** - Optional, 10 digits (e.g., 9989049323)
8. **Full Name** - Maps to "reference" field (e.g., Pankaj Nemani)
9. **Description** - Optional (e.g., GST Audit)

### Special Logic:
- **For Expense transactions:**
  - `paid_amount` = `amount` (total amount)
  - `balance_amount` = 0 (automatically calculated)
  
- **For Income transactions:**
  - `paid_amount` = 0
  - `balance_amount` = `amount` (automatically calculated)

### Duplicate Detection:
A transaction is considered duplicate if ALL of these match:
- Same date
- Same type (income/expense)
- Same amount
- Same project
- Same category
- Same subcategory

If duplicate found → Row fails with error "Duplicate transaction found"

## Loan Import Logic

### Required Columns (in order):
1. **Customer Name** - Name of the person (e.g., Palaka Sankara Rao)
2. **Loan Type** - Must be: `given` or `received`
3. **Project Name** - Will be created if doesn't exist
4. **Total Amount** - Loan principal amount (e.g., 1200)
5. **Start Date** - Format: DD-MM-YYYY (e.g., 24-03-2025)
6. **Customer Phone** - Optional, 10 digits (e.g., 9701170475)
7. **Description** - Optional (e.g., insurance balance)

### Special Logic:
- **Status Calculation:**
  - If Total Amount = 0 → Status = "completed"
  - If Total Amount > 0 → Status = "active"

### Duplicate Detection:
A loan is considered duplicate if ALL of these match:
- Same customer name
- Same loan type (given/received)
- Same principal amount
- Same start date
- Same project

If duplicate found → Row fails with error "Duplicate loan found"

## Auto-Creation Logic

### Projects:
- If project name doesn't exist → Creates new project
- Auto-assigns a random color
- Sets as active

### Categories:
- If category name doesn't exist → Creates new category
- Uses the transaction type (income/expense) from the row
- Auto-assigns a random color
- Sets as active

### Subcategories:
- If subcategory name doesn't exist → Creates new subcategory
- Links to the category from the same row
- Auto-assigns a random color
- Sets as active

## Error Handling

### Validation Errors:
- Missing required fields
- Invalid date format (must be DD-MM-YYYY)
- Invalid type (must be income/expense for transactions, given/received for loans)
- Invalid phone number (must be exactly 10 digits if provided)
- Invalid amount (must be numeric and >= 0)

### Processing Errors:
- Duplicate records
- Database errors
- Unexpected file format issues

### Error Reporting:
- Each failed row shows:
  - Row number in Excel file
  - The data that was in that row
  - Specific error message(s)
- You can download failed rows as Excel to fix and re-import

## Example Flow

1. **Download Template** → Get `transaction_template.xlsx`
2. **Fill Data:**
   ```
   Row 1: Date | Type | Project Name | Category Name | Subcategory Name | Amount | Phone Number | Full Name | Description
   Row 2: 23-04-2025 | income | Softpro HO | GST | GST Returns | 35000 | | Pankaj Nemani | GST Audit
   Row 3: 22-09-2025 | expense | Softpro HO | GST | GST Returns | 8000 | 9989049323 | Balaga venkata ramana garu | Gst
   ```
3. **Upload** → System shows preview of rows 2-11
4. **Import** → System processes:
   - Row 2: Creates project "Softpro HO" (if new), category "GST" (if new), subcategory "GST Returns" (if new), creates income transaction
   - Row 3: Uses existing project/category/subcategory, creates expense transaction with paid_amount=8000, balance_amount=0
5. **Results:** Shows 2 successful, 0 failed

## Tips

1. **Always use the template** - Don't create your own Excel structure
2. **Keep header row** - Don't delete or modify row 1
3. **Date format is critical** - Must be DD-MM-YYYY (e.g., 23-04-2025)
4. **Type values are case-sensitive** - Use lowercase: `income`, `expense`, `given`, `received`
5. **Check preview** - Always review the preview before importing
6. **Fix errors** - Download failed rows, fix them, and re-import only the fixed rows

