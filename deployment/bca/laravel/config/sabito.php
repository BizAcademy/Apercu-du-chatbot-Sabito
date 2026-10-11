<?php

return [
    'enabled' => (bool) env('SABITO_ENABLED', false),
    'url' => env('SABITO_URL', 'https://sabito.bizconnectacademy.com'),
    'client_id' => env('SABITO_CLIENT_ID'),
    'client_secret' => env('SABITO_CLIENT_SECRET'),
    // Exact frontend origins, not the API domain. No wildcard.
    'origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('SABITO_FRONTEND_ORIGINS', env('FRONT_URL', '')))
    ))),
];
