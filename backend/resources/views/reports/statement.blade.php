<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOFTPRO Finance Report</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, Arial, sans-serif; color: #1e293b; margin: 20px; font-size: 10px; }
        .header { background: #0f172a; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
        .header .period { opacity: 0.9; font-size: 11px; }
        .kpi-row { width: 100%; }
        .kpi-income { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .kpi-expense { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .kpi-net { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
        .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
        .kpi-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 9px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; }
        th { background: #0f172a; color: white; font-weight: 600; text-align: left; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .amount { text-align: right; font-family: DejaVu Sans Mono, monospace; }
        .type-income { color: #166534; font-weight: 600; }
        .type-expense { color: #991b1b; font-weight: 600; }
        .sn { text-align: center; width: 32px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SOFTPRO Finance Report</h1>
        <p class="period">
            Period: @if($filters['from']) {{ $filters['from'] }} @else Start @endif — @if($filters['to']) {{ $filters['to'] }} @else Today @endif
        </p>
        <table class="kpi-row" style="width:100%; margin-top:12px;">
            <tr>
                <td class="kpi kpi-income" style="width:33%; padding:12px; text-align:center;">
                    <div class="kpi-label">Income</div>
                    <div class="kpi-value">{{ number_format($income, 2, '.', '') }}</div>
                </td>
                <td class="kpi kpi-expense" style="width:33%; padding:12px; text-align:center;">
                    <div class="kpi-label">Expense</div>
                    <div class="kpi-value">{{ number_format($expense, 2, '.', '') }}</div>
                </td>
                <td class="kpi kpi-net" style="width:33%; padding:12px; text-align:center;">
                    <div class="kpi-label">Net</div>
                    <div class="kpi-value">{{ number_format($net, 2, '.', '') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <table>
        <thead>
            <tr>
                <th class="sn">#</th>
                <th>Date</th>
                <th>Type</th>
                <th class="amount">Amount</th>
                <th>Project</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Reference</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transactions as $index => $transaction)
                <tr>
                    <td class="sn">{{ $index + 1 }}</td>
                    <td>{{ $transaction->transaction_date ? \Carbon\Carbon::parse($transaction->transaction_date)->format('Y-m-d') : '-' }}</td>
                    <td class="type-{{ $transaction->type }}">{{ ucfirst($transaction->type) }}</td>
                    <td class="amount">{{ number_format($transaction->amount, 2, '.', '') }}</td>
                    <td>{{ $transaction->project->name ?? '-' }}</td>
                    <td>{{ $transaction->category->name ?? '-' }}</td>
                    <td>{{ $transaction->subcategory->name ?? '-' }}</td>
                    <td>{{ $transaction->reference ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
