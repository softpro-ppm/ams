<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $builder = $this->baseQuery($request);

        $income = (float) $builder->clone()->where('type', 'income')->sum('amount');
        $expense = (float) $builder->clone()->where('type', 'expense')->sum('amount');
        $net = $income - $expense;

        $transactions = TransactionResource::collection(
            $builder->clone()->orderByDesc('transaction_date')->limit(200)->get()
        );

        return response()->json([
            'kpis' => [
                'income' => $income,
                'expense' => $expense,
                'net' => $net,
                'count' => $builder->count(),
            ],
            'filters' => $this->filters($request),
            'transactions' => $transactions,
        ]);
    }

    public function exportCsv(Request $request)
    {
        $builder = $this->baseQuery($request)->orderByDesc('transaction_date');

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="softpro-report.csv"',
        ];

        $callback = function () use ($builder) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['#', 'Date', 'Type', 'Amount', 'Project', 'Category', 'Subcategory', 'Reference']);

            $sn = 0;
            $builder->chunk(500, function ($rows) use ($handle, &$sn) {
                foreach ($rows as $row) {
                    $sn++;
                    $date = $row->transaction_date ? Carbon::parse($row->transaction_date)->format('Y-m-d') : '';
                    fputcsv($handle, [
                        $sn,
                        $date,
                        Str::ucfirst($row->type),
                        number_format((float) $row->amount, 2, '.', ''),
                        $row->project?->name ?? '',
                        $row->category?->name ?? '',
                        $row->subcategory?->name ?? '',
                        $row->reference ?? '',
                    ]);
                }
            });
            fclose($handle);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function exportPdf(Request $request)
    {
        $builder = $this->baseQuery($request)->orderByDesc('transaction_date');
        $transactions = $builder->get();

        $data = [
            'filters' => $this->filters($request),
            'income' => (float) $builder->clone()->where('type', 'income')->sum('amount'),
            'expense' => (float) $builder->clone()->where('type', 'expense')->sum('amount'),
            'net' => 0,
            'transactions' => $transactions,
        ];
        $data['net'] = $data['income'] - $data['expense'];

        $pdf = Pdf::loadView('reports.statement', $data)->setPaper('a4', 'landscape');

        return $pdf->download('softpro-report.pdf');
    }

    private function baseQuery(Request $request)
    {
        $userId = $request->user()->bookOwnerId();

        return Transaction::with(['project', 'category', 'subcategory'])
            ->where('user_id', $userId)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('from') && $request->input('from') !== '', fn ($q) => $q->whereDate('transaction_date', '>=', Carbon::parse($request->input('from'))))
            ->when($request->filled('to') && $request->input('to') !== '', fn ($q) => $q->whereDate('transaction_date', '<=', Carbon::parse($request->input('to'))));
    }

    private function filters(Request $request): array
    {
        return [
            'type' => $request->input('type'),
            'project_id' => $request->input('project_id'),
            'category_id' => $request->input('category_id'),
            'from' => $request->input('from'),
            'to' => $request->input('to'),
        ];
    }
}
