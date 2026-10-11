<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\JwtTokenService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SabitoSessionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Never run these fixture schema operations against a real database.
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
        config(['sabito.enabled' => true, 'sabito.url' => 'https://sabito.example',
            'sabito.client_id' => 'fixture-client', 'sabito.client_secret' => 'fixture-secret',
            'sabito.origins' => ['https://bca.example']]);
        putenv('JWT_SECRET=fixture-jwt-secret-only-for-tests-123456789');
        $_ENV['JWT_SECRET'] = $_SERVER['JWT_SECRET'] = 'fixture-jwt-secret-only-for-tests-123456789';
        Cache::flush();
        Schema::dropIfExists('users');
        Schema::create('users', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('email');
            $table->string('password')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_admin')->default(false);
            $table->boolean('is_banned')->default(false);
            $table->decimal('balance_main', 16, 2)->default(0);
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('currency')->default('XAF');
            $table->timestamps();
        });
        Http::preventStrayRequests();
    }

    private function user(): User
    {
        // Onboarding hooks are unrelated to JWT/session exchange.
        return User::withoutEvents(fn () => User::forceCreate(['name' => 'Fixture', 'email' => 'fixture@example.test',
            'is_active' => true, 'is_admin' => false, 'is_banned' => false]));
    }

    private function headers(User $user): array
    {
        return ['Origin' => 'https://bca.example',
            'Authorization' => 'Bearer '.app(JwtTokenService::class)->issue($user)['access_token']];
    }

    private function fakeSabito(string $identity): void
    {
        Http::fake(['https://sabito.example/v1/auth/token' => Http::response([
            'success' => true, 'data' => ['access_token' => 'temporary-fixture', 'expires_in' => 900,
                'external_user_id' => $identity, 'identity_type' => 'platform_user',
                'private_field' => 'never-return-this'],
        ])]);
    }

    public function test_real_bca_jwt_controls_identity_and_response_is_minimal(): void
    {
        $user = $this->user();
        $this->fakeSabito((string) $user->id);
        $this->postJson('/api/v2/sabito/session', ['external_user_id' => 'victim'], $this->headers($user))
            ->assertOk()->assertHeader('Cache-Control', 'no-store, private')
            ->assertExactJson(['access_token' => 'temporary-fixture', 'expires_in' => 900,
                'external_user_id' => (string) $user->id, 'socket_path' => '/socket.io']);
        Http::assertSent(fn ($r) => $r['external_user_id'] === (string) $user->id
            && $r->hasHeader('Authorization', 'Basic '.base64_encode('fixture-client:fixture-secret')));
    }

    public function test_missing_jwt_or_wrong_origin_never_calls_sabito(): void
    {
        Http::fake();
        $this->postJson('/api/v2/sabito/session', [], ['Origin' => 'https://bca.example'])->assertUnauthorized();
        $this->postJson('/api/v2/sabito/session', [], ['Origin' => 'https://evil.example'])->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_revoked_bca_jwt_is_rejected(): void
    {
        Http::fake();
        $headers = $this->headers($this->user());
        app(JwtTokenService::class)->invalidate($headers['Authorization']);
        $this->postJson('/api/v2/sabito/session', [], $headers)->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_expired_or_tampered_jwt_and_inactive_account_are_rejected(): void
    {
        Http::fake();
        $user = $this->user();
        $expired = app(JwtTokenService::class)->issue($user, -1)['access_token'];
        $this->postJson('/api/v2/sabito/session', [], ['Origin' => 'https://bca.example',
            'Authorization' => 'Bearer '.$expired])->assertUnauthorized();
        $headers = $this->headers($user);
        $this->postJson('/api/v2/sabito/session', [], array_merge($headers,
            ['Authorization' => $headers['Authorization'].'tampered']))->assertUnauthorized();
        $user->forceFill(['is_active' => false])->saveQuietly();
        $this->postJson('/api/v2/sabito/session', [], $headers)->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_upstream_failure_does_not_disclose_its_body(): void
    {
        Http::fake(['https://sabito.example/v1/auth/token' => Http::response('private upstream detail', 500)]);
        $this->postJson('/api/v2/sabito/session', [], $this->headers($this->user()))
            ->assertStatus(502)->assertExactJson(['error' => 'SABITO_INVALID_RESPONSE']);
    }

    public function test_suspended_user_and_identity_mismatch_are_rejected(): void
    {
        $user = $this->user();
        $headers = $this->headers($user);
        $user->forceFill(['is_banned' => true])->saveQuietly();
        Http::fake();
        $this->postJson('/api/v2/sabito/session', [], $headers)->assertForbidden();
        Http::assertNothingSent();
        $user->forceFill(['is_banned' => false])->saveQuietly();
        $this->fakeSabito('victim');
        $this->postJson('/api/v2/sabito/session', [], $headers)->assertStatus(502)
            ->assertExactJson(['error' => 'SABITO_INVALID_RESPONSE']);
    }
}
