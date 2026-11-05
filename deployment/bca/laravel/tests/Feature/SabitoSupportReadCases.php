<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Sabito\SabitoReadOnlyJobService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait SabitoSupportReadCases
{
    public function test_support_reads_are_owned_bounded_and_never_write(): void
    {
        $owner = User::create(['name'=>'Owner','email'=>'support-owner@fixture.test',
            'password'=>'fixture-only','is_active'=>true,'sponsor_code'=>'OWNER']);
        $other = User::create(['name'=>'Other','email'=>'support-other@fixture.test',
            'password'=>'fixture-only','is_active'=>true,'sponsor_code'=>'OTHER']);
        Schema::table('digital_products', fn (Blueprint $t) => $t->text('rejection_reason')->nullable());
        foreach ([
            'affiliate_commissions'=>['sponsor_id','level','amount','status','paid_at'],
            'bca_ads_publisher_profiles'=>['user_id','status','test_campaign_validated','blocked_reason'],
            'ebooks'=>['title','is_active'],
        ] as $table=>$columns) {
            Schema::create($table, function (Blueprint $t) use ($columns): void {
                $t->id();
                foreach ($columns as $column) $t->string($column)->nullable();
            });
        }
        DB::table('digital_products')->insert([
            ['id'=>1,'user_id'=>$owner->id,'title'=>'Owned product','status'=>'pending','rejection_reason'=>null],
            ['id'=>2,'user_id'=>$other->id,'title'=>'OTHER PRIVATE PRODUCT','status'=>'rejected','rejection_reason'=>'OTHER PRIVATE REASON'],
            ['id'=>3,'user_id'=>$owner->id,'title'=>'Owned rejected','status'=>'rejected','rejection_reason'=>'Lien inaccessible'],
            ['id'=>4,'user_id'=>$owner->id,'title'=>'Missing reason','status'=>'rejected','rejection_reason'=>null],
        ]);
        DB::table('affiliate_commissions')->insert([
            ['sponsor_id'=>$owner->id,'level'=>1,'amount'=>23,'status'=>'paid'],
            ['sponsor_id'=>$other->id,'level'=>2,'amount'=>999,'status'=>'SECRET_OTHER_COMMISSION'],
        ]);
        DB::table('bca_ads_publisher_profiles')->insert([
            'user_id'=>$owner->id,'status'=>'active','test_campaign_validated'=>1,
        ]);
        DB::table('settings')->insert(['key'=>'bca_ads_publisher_rate_per_view','value'=>'0.6']);
        DB::table('formations')->insert(['title'=>'Public course']);
        DB::table('ebooks')->insert([['title'=>'Public ebook','is_active'=>1],['title'=>'HIDDEN EBOOK','is_active'=>0]]);
        $service = new SabitoReadOnlyJobService;
        $read = fn ($op, $fields = [], $member = null) => $service->handle([
            'operation'=>$op,'external_user_id'=>(string)($member ?? $owner->id),'fields'=>$fields,
            'expires_at'=>now()->addMinute()->toIso8601String(),
        ]);
        $writes = [];
        DB::listen(function ($query) use (&$writes): void {
            if (preg_match('/^\s*(insert|update|delete|replace|alter|drop|create)\b/i', $query->sql)) $writes[] = $query->sql;
        });
        $this->assertSame('pending', $read('digital_product_review',['product_reference'=>'1'])['data']['statut']);
        $this->assertSame('Lien inaccessible', $read('digital_product_review',['product_reference'=>'3'])['data']['motif']);
        $this->assertNull($read('digital_product_review',['product_reference'=>'4'])['data']['motif']);
        $foreign = $read('digital_product_review',['product_reference'=>'2']);
        $this->assertSame('not_found', $foreign['status']);
        $this->assertArrayNotHasKey('data', $foreign);
        $this->assertSame('invalid_input', $read('digital_product_review',['product_reference'=>'bad'])['status']);
        $this->assertSame('invalid_input', $read('digital_product_review',['product_reference'=>'1','user_id'=>(string)$other->id])['status']);
        $commissions = $read('referral_commissions_recent');
        $this->assertSame(1, $commissions['data']['nombre']);
        $this->assertStringNotContainsString('SECRET_OTHER', json_encode($commissions));
        $this->assertSame('forbidden', $read('referral_commissions_recent', [], 999999)['status']);
        $this->assertTrue($read('ads_publisher_status')['data']['test_valide']);
        $this->assertSame(0.6, $read('ads_publisher_status')['data']['taux_configure']);
        $this->assertSame('not_found', $read('ads_publisher_status', [], $other->id)['status']);
        $catalogue = $read('bca_catalogue_current');
        $this->assertStringContainsString('Public course', $catalogue['data']['catalogue']);
        $this->assertStringContainsString('Public ebook', $catalogue['data']['catalogue']);
        $this->assertStringNotContainsString('HIDDEN', $catalogue['data']['catalogue']);
        $this->assertStringNotContainsString('PRIVATE', $catalogue['data']['catalogue']);
        foreach (['digital_product_review','referral_commissions_recent','ads_publisher_status','bca_catalogue_current'] as $operation) {
            $this->assertSame('forbidden', $read($operation, [], 999999)['status']);
            $this->assertSame('invalid_input', $read($operation, ['user_id'=>(string)$other->id])['status']);
        }
        $this->assertSame([], $writes);
        // Simulated unavailable storage must not become a successful empty result.
        Schema::drop('affiliate_commissions');
        $this->assertSame('error', $read('referral_commissions_recent')['status']);
    }
}
