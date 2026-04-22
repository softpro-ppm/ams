<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\User;
use Illuminate\Support\Facades\Hash;
$user = User::where('email','admin@softpromis.com')->first();
if(!$user){ echo "user not found\n"; exit; }
$ok = Hash::check('password', $user->password);
echo "Hash check: ".($ok?'OK':'FAIL')."\n";
echo "Password length: ".strlen($user->password)."\n";
