<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SoftPro Finance Report</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; margin: 24px; }
        h1 { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
        th { background: #f8fafc; text-align: left; }
        .kpi { display: inline-block; margin-right: 12px; }
    </style>
</head>
<body>
    <h1>SoftPro Finance Report</h1>
    <p>
        Period:
        @if($filters['from']) {{ $filters['from'] }} @else Start @endif
        —
        @if($filters['to']) {{ $filters['to'] }} @else Today @endif
    </p>
    <div>
        <span class="kpi"><strong>Income:</strong> ₹ {{ number_format($income, 2) }}</span>
        <span class="kpi"><strong>Expense:</strong> ₹ {{ number_format($expense, 2) }}</span>
        <span class="kpi"><strong>Net:</strong> ₹ {{ number_format($net, 2) }}</span>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Project</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Description</th>
                <th>Reference</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transactions as $transaction)
                <tr>
                    <td>{{ $transaction->transaction_date }}</td>
                    <td>{{ ucfirst($transaction->type) }}</td>
                    <td>₹ {{ number_format($transaction->amount, 2) }}</td>
                    <td>{{ $transaction->project->name ?? '-' }}</td>
                    <td>{{ $transaction->category->name ?? '-' }}</td>
                    <td>{{ $transaction->subcategory->name ?? '-' }}</td>
                    <td>{{ $transaction->description }}</td>
                    <td>{{ $transaction->reference }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>

