<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
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
            'color' => $this->color,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'income_total' => $this->when(isset($this->income_total), (float) $this->income_total),
            'expense_total' => $this->when(isset($this->expense_total), (float) $this->expense_total),
            'net_balance' => $this->when(
                isset($this->income_total) && isset($this->expense_total),
                (float) $this->income_total - (float) $this->expense_total
            ),
        ];
    }
}
