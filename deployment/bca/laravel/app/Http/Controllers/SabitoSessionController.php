<?php

namespace App\Http\Controllers;

use App\Services\JwtTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

final class SabitoSessionController extends Controller
{
    public function __invoke(Request $request, JwtTokenService $jwt): JsonResponse
    {
        if (!config('sabito.enabled')) {
            return $this->reply(['error' => 'SABITO_DISABLED'], 503);
        }
        $origin = $request->header('Origin');
        if (!$origin || !in_array($origin, config('sabito.origins', []), true)) {
            return $this->reply(['error' => 'ORIGIN_DENIED'], 403);
        }
        // Use BCA's real JWT checks (signature, expiration, active token, blacklist).
        // Never use cookies, request user_id or an unverified decoded JWT.
        try {
            $user = $jwt->userFromBearer($request->header('Authorization'));
        } catch (Throwable) {
            return $this->reply(['error' => 'AUTHENTICATION_REQUIRED'], 401);
        }
        if (!$user) {
            return $this->reply(['error' => 'AUTHENTICATION_REQUIRED'], 401);
        }
        if ($user->is_banned || (!$user->is_active && !$user->is_admin)) {
            return $this->reply(['error' => 'ACCOUNT_UNAVAILABLE'], 403);
        }
        $key = 'sabito-session:'.hash('sha256', (string) $user->getAuthIdentifier());
        if (RateLimiter::tooManyAttempts($key, 30)) {
            return $this->reply(['error' => 'RATE_LIMITED'], 429);
        }
        RateLimiter::hit($key, 60);
        $url = rtrim((string) config('sabito.url'), '/');
        $parts = parse_url($url);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) ||
            !empty($parts['path']) || isset($parts['user']) || isset($parts['pass']) ||
            isset($parts['query']) || isset($parts['fragment']) ||
            !config('sabito.client_id') || !config('sabito.client_secret')) {
            return $this->reply(['error' => 'SABITO_NOT_CONFIGURED'], 503);
        }
        $identity = (string) $user->getAuthIdentifier();
        try {
            $response = Http::withBasicAuth(config('sabito.client_id'), config('sabito.client_secret'))
                ->acceptJson()->asJson()->withoutRedirecting()
                ->connectTimeout(3)->timeout(8)
                ->post($url.'/v1/auth/token', ['external_user_id' => $identity]);
            $data = $response->json('data');
            if (!$response->successful() || $response->json('success') !== true ||
                !is_array($data) || !is_string($data['access_token'] ?? null) ||
                $data['access_token'] === '' || strlen($data['access_token']) > 16384 ||
                !is_int($data['expires_in'] ?? null) ||
                $data['expires_in'] < 1 || $data['expires_in'] > 900 ||
                ($data['external_user_id'] ?? null) !== $identity ||
                ($data['identity_type'] ?? null) !== 'platform_user') {
                return $this->reply(['error' => 'SABITO_INVALID_RESPONSE'], 502);
            }
            return $this->reply([
                'access_token' => $data['access_token'],
                'expires_in' => $data['expires_in'],
                'external_user_id' => $identity,
                'socket_path' => '/socket.io',
            ]);
        } catch (Throwable) {
            // Do not log upstream bodies, Authorization, credentials or exceptions.
            return $this->reply(['error' => 'SABITO_SESSION_UNAVAILABLE'], 503);
        }
    }

    private function reply(array $body, int $status = 200): JsonResponse
    {
        return response()->json($body, $status, [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
        ]);
    }
}
