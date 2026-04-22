<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanPaymentResource extends JsonResource
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
            'flow' => $this->flow,
            'amount' => (float) $this->amount,
            'paid_on' => optional($this->paid_on)->toDateString(),
            'note' => $this->note,
            'meta' => $this->meta ?? new \stdClass(),
            'created_at' => $this->created_at,
        ];
    }
}
