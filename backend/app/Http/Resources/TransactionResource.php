<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
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
            'type' => $this->type,
            'amount' => (float) $this->amount,
            'paid_amount' => $this->paid_amount ? (float) $this->paid_amount : null,
            'balance_amount' => $this->paid_amount ? (float) ($this->amount - $this->paid_amount) : null,
            'date' => optional($this->transaction_date)->toDateString(),
            'transaction_date' => optional($this->transaction_date)->toDateString(), // Keep for backward compat
            'description' => $this->description,
            'reference' => $this->reference,
            'phone_number' => $this->phone_number,
            'meta' => $this->meta ?? new \stdClass(),
            'project_id' => $this->project_id,
            'category_id' => $this->category_id,
            'subcategory_id' => $this->subcategory_id,
            'project' => new ProjectResource($this->whenLoaded('project')),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'subcategory' => new SubcategoryResource($this->whenLoaded('subcategory')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
