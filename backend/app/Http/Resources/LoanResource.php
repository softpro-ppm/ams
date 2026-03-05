<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone_number' => $this->phone_number,
            'type' => $this->type,
            'principal' => (float) $this->principal,
            'interest_rate' => (float) $this->interest_rate,
            'status' => $this->status,
            'start_date' => optional($this->start_date)->toDateString(),
            'due_date' => optional($this->due_date)->toDateString(),
            'description' => $this->description,
            'meta' => $this->meta ?? new \stdClass(),
            'project_id' => $this->project_id,
            'project' => new ProjectResource($this->whenLoaded('project')),
            'payments' => LoanPaymentResource::collection($this->whenLoaded('payments')),
            'disbursements' => LoanDisbursementResource::collection($this->whenLoaded('disbursements')),
            'paid_total' => (float) $this->paid_total,
            'total_disbursed' => (float) $this->total_disbursed,
            'balance' => (float) $this->balance,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
