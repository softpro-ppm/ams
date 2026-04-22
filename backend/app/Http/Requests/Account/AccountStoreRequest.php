<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

class AccountStoreRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:120', 'unique:accounts,name'],
            'code' => ['nullable', 'string', 'max:32'],
            'type' => ['required', 'in:cash,bank,wallet,other'],
            'owner_scope' => ['required', 'in:company,admin'],
            'is_reconcilable' => ['boolean'],
            'opening_balance' => ['numeric', 'min:0'],
            'opening_balance_date' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }
}
