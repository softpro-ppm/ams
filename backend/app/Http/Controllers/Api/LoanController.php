<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Loan\LoanDisbursementRequest;
use App\Http\Requests\Loan\LoanPaymentRequest;
use App\Http\Requests\Loan\LoanRequest;
use App\Http\Resources\LoanDisbursementResource;
use App\Http\Resources\LoanPaymentResource;
use App\Http\Resources\LoanResource;
use App\Models\Loan;
use App\Models\LoanDisbursement;
use App\Models\LoanPayment;
use App\Models\Project;
use Illuminate\Http\Request;

class LoanController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $perPage = min(100, $request->integer('per_page', 15));

        $query = Loan::where('user_id', $userId)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->with('project', 'payments', 'disbursements')
            ->orderByDesc('created_at');

        return LoanResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(LoanRequest $request)
    {
        $this->validateProjectOwnership($request);

        $loan = Loan::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return new LoanResource($loan->load('project', 'payments', 'disbursements'));
    }

    public function show(Request $request, Loan $loan)
    {
        $this->authorizeLoan($request, $loan);

        return new LoanResource($loan->load([
            'project',
            'payments' => fn ($q) => $q->orderByDesc('paid_on'),
            'disbursements' => fn ($q) => $q->orderByDesc('disbursed_on')
        ]));
    }

    public function update(LoanRequest $request, Loan $loan)
    {
        $this->authorizeLoan($request, $loan);
        $this->validateProjectOwnership($request);

        $loan->update($request->validated());

        return new LoanResource($loan->fresh()->load(['project', 'payments', 'disbursements']));
    }

    public function destroy(Request $request, Loan $loan)
    {
        $this->authorizeLoan($request, $loan);
        $loan->delete();

        return response()->noContent();
    }

    public function storePayment(LoanPaymentRequest $request, Loan $loan)
    {
        $this->authorizeLoan($request, $loan);

        $payment = $loan->payments()->create([
            'user_id' => $request->user()->id,
            'flow' => $loan->type === 'given' ? 'in' : 'out',
            ...$request->validated(),
        ]);

        return new LoanPaymentResource($payment);
    }

    public function updatePayment(LoanPaymentRequest $request, Loan $loan, LoanPayment $payment)
    {
        $this->authorizeLoan($request, $loan);
        abort_unless($payment->loan_id === $loan->id, 422, 'Payment does not belong to this loan');

        $payment->update([
            ...$request->validated(),
            'flow' => $loan->type === 'given' ? 'in' : 'out',
        ]);

        return new LoanPaymentResource($payment->fresh());
    }

    public function destroyPayment(Request $request, Loan $loan, LoanPayment $payment)
    {
        $this->authorizeLoan($request, $loan);
        abort_unless($payment->loan_id === $loan->id, 422, 'Payment does not belong to this loan');

        $payment->delete();

        return response()->noContent();
    }

    public function storeDisbursement(LoanDisbursementRequest $request, Loan $loan)
    {
        $this->authorizeLoan($request, $loan);

        $disbursement = $loan->disbursements()->create([
            'user_id' => $request->user()->id,
            ...$request->validated(),
        ]);

        // Update loan status if needed
        $loan->refresh();
        $balance = $loan->balance;
        $newStatus = $balance <= 0 ? 'completed' : 'active';
        if ($loan->status !== $newStatus) {
            $loan->update(['status' => $newStatus]);
        }

        return new LoanDisbursementResource($disbursement);
    }

    public function updateDisbursement(LoanDisbursementRequest $request, Loan $loan, LoanDisbursement $disbursement)
    {
        $this->authorizeLoan($request, $loan);
        abort_unless($disbursement->loan_id === $loan->id, 422, 'Disbursement does not belong to this loan');

        $disbursement->update($request->validated());

        // Update loan status if needed
        $loan->refresh();
        $balance = $loan->balance;
        $newStatus = $balance <= 0 ? 'completed' : 'active';
        if ($loan->status !== $newStatus) {
            $loan->update(['status' => $newStatus]);
        }

        return new LoanDisbursementResource($disbursement->fresh());
    }

    public function destroyDisbursement(Request $request, Loan $loan, LoanDisbursement $disbursement)
    {
        $this->authorizeLoan($request, $loan);
        abort_unless($disbursement->loan_id === $loan->id, 422, 'Disbursement does not belong to this loan');

        $disbursement->delete();

        // Update loan status if needed
        $loan->refresh();
        $balance = $loan->balance;
        $newStatus = $balance <= 0 ? 'completed' : 'active';
        if ($loan->status !== $newStatus) {
            $loan->update(['status' => $newStatus]);
        }

        return response()->noContent();
    }

    private function authorizeLoan(Request $request, Loan $loan): void
    {
        abort_unless($loan->user_id === $request->user()->id, 403, 'Unauthorized loan access');
    }

    private function validateProjectOwnership(Request $request): void
    {
        if ($request->filled('project_id')) {
            Project::where('id', $request->project_id)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
        }
    }
}
