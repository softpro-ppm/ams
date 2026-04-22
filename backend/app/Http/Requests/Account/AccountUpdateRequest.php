<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AccountUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $id = $this->route('account')?->id ?? $this->route('account');

        return [
            'name' => ['sometimes', 'string', 'max:120', Rule::unique('accounts', 'name')->ignore($id)],
            'code' => ['nullable', 'string', 'max:32'],
            'type' => ['sometimes', 'in:cash,bank,wallet,other'],
            'owner_scope' => ['sometimes', 'in:company,admin'],
            'is_reconcilable' => ['boolean'],
            'opening_balance' => ['sometimes', 'numeric', 'min:0'],
            'opening_balance_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }
}
