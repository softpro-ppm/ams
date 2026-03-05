<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanDisbursementResource extends JsonResource
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
            'loan_id' => $this->loan_id,
            'amount' => (float) $this->amount,
            'disbursed_on' => optional($this->disbursed_on)->toDateString(),
            'note' => $this->note,
            'meta' => $this->meta ?? new \stdClass(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
