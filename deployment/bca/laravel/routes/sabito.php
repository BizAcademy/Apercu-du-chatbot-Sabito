<?php

use App\Http\Controllers\SabitoSessionController;
use Illuminate\Support\Facades\Route;

// Include from routes/api.php: Laravel already supplies the /api prefix.
Route::post('v2/sabito/session', SabitoSessionController::class)
    ->middleware('throttle:60,1')
    ->name('api.v2.sabito.session');
