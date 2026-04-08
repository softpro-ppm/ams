<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\SettingRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(Request $request)
    {
        return SettingResource::collection(
            Setting::where('user_id', $request->user()->bookOwnerId())->get()
        );
    }

    public function update(SettingRequest $request)
    {
        $userId = $request->user()->bookOwnerId();

        foreach ($request->validated('settings') as $input) {
            Setting::updateOrCreate(
                ['user_id' => $userId, 'key' => $input['key']],
                [
                    'value' => $input['value'] ?? null,
                    'group' => $input['group'] ?? null,
                ],
            );
        }

        return SettingResource::collection(
            Setting::where('user_id', $userId)->get()
        );
    }

    public function clearAllData(Request $request)
    {
        $userId = $request->user()->bookOwnerId();

        try {
            // Delete all transactions
            \App\Models\Transaction::where('user_id', $userId)->delete();
            
            // Delete all loans (this will cascade delete payments and disbursements)
            \App\Models\Loan::where('user_id', $userId)->delete();

            return response()->json([
                'message' => 'All transactions and loans have been cleared successfully',
                'transactions_deleted' => true,
                'loans_deleted' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to clear data: ' . $e->getMessage(),
            ], 500);
        }
    }
}
