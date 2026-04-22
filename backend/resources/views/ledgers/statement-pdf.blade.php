<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ledger statement</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; }
        .meta { margin-bottom: 12px; color: #444; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .num { text-align: right; }
        .section { margin-top: 16px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Ledger statement — {{ strtoupper($payload['ledger']) }}</h1>
    <div class="meta">
        Period: {{ $payload['date_from'] }} to {{ $payload['date_to'] }}<br>
        Opening: {{ number_format($payload['opening_balance'], 2) }} &nbsp;|&nbsp;
        Closing: {{ number_format($payload['closing_balance'], 2) }}
    </div>

    <table>
        <thead>
            <tr>
                <th>Sl.</th>
                <th>Date</th>
                <th>Status</th>
                <th class="num">Received</th>
                <th class="num">Paid</th>
                <th>Particulars</th>
                <th>Description</th>
                <th class="num">Balance</th>
                <th>Entered by</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($payload['data'] as $i => $row)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $row['entry_date'] ?? '' }}</td>
                    <td>approved</td>
                    <td class="num">{{ number_format($row['received_amount'] ?? 0, 2) }}</td>
                    <td class="num">{{ number_format($row['paid_amount'] ?? 0, 2) }}</td>
                    <td>{{ $row['particulars'] ?? '' }}</td>
                    <td>{{ $row['note'] ?? '' }}</td>
                    <td class="num">{{ number_format($row['balance_after'] ?? 0, 2) }}</td>
                    <td>{{ $row['entered_by_name'] ?? '' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if (!empty($payload['pending_in_period']))
        <div class="section">Pending in period (excluded from balance)</div>
        <table>
            <thead>
                <tr>
                    <th>Sl.</th>
                    <th>Date</th>
                    <th class="num">Received</th>
                    <th class="num">Paid</th>
                    <th>Particulars</th>
                    <th>Description</th>
                    <th>Entered by</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($payload['pending_in_period'] as $i => $row)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $row['entry_date'] ?? '' }}</td>
                        <td class="num">{{ number_format($row['received_amount'] ?? 0, 2) }}</td>
                        <td class="num">{{ number_format($row['paid_amount'] ?? 0, 2) }}</td>
                        <td>{{ $row['particulars'] ?? '' }}</td>
                        <td>{{ $row['note'] ?? '' }}</td>
                        <td>{{ $row['entered_by_name'] ?? '' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</body>
</html>
