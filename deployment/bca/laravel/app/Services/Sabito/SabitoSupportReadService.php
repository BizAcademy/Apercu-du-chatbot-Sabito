<?php

namespace App\Services\Sabito;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Called only after SabitoReadOnlyJobService verifies identity, expiry and
 * the explicit field contract. All queries are bounded and read-only. */
final class SabitoSupportReadService
{
    public function handle(User $user, string $operation, array $fields): array
    {
        return match ($operation) {
            'digital_product_review' => $this->product($user, $fields),
            'referral_commissions_recent' => $this->commissions($user),
            'ads_publisher_status' => $this->publisher($user),
            'bca_catalogue_current' => $this->catalogue(),
            default => ['status' => 'forbidden'],
        };
    }

    private function text(mixed $value, int $length = 160): string
    {
        return mb_substr(trim(preg_replace('/[\x00-\x1f\x7f]+/u', ' ', (string) $value)), 0, $length);
    }

    private function product(User $user, array $fields): array
    {
        $product = DB::table('digital_products')->where('user_id', $user->id)
            ->where('id', $fields['product_id'])->first(['id', 'title', 'status', 'rejection_reason']);
        if (! $product) {
            return ['status' => 'not_found'];
        }
        if (! in_array($product->status, ['pending', 'approved', 'rejected'], true)) {
            return ['status' => 'error'];
        }
        return ['status' => $product->status === 'pending' ? 'pending' : 'ok', 'data' => [
            'statut' => $product->status, 'reference' => (string) $product->id,
            'produit' => $this->text($product->title),
            'motif' => $product->status === 'rejected' && $product->rejection_reason !== null ?
                $this->text($product->rejection_reason, 1000) : null,
        ]];
    }

    private function commissions(User $user): array
    {
        $rows = DB::table('affiliate_commissions')->where('sponsor_id', $user->id)
            ->orderByDesc('id')->limit(6)->get(['id', 'level', 'amount', 'status', 'paid_at']);
        if ($rows->isEmpty()) {
            return ['status' => 'not_found'];
        }
        $lines = $rows->take(5)->map(fn ($row) => 'Commission '.$row->id.' — niveau '.
            $this->text($row->level, 8).' — montant enregistré '.$this->text($row->amount, 30).
            ' — statut '.$this->text($row->status, 40).
            ($row->paid_at ? ' — date enregistrée '.$this->text($row->paid_at, 40) : ''))->implode("\n");
        return ['status' => 'ok', 'data' => [
            'statut' => 'consultation effectuée', 'nombre' => min(5, $rows->count()),
            'commissions' => $lines, 'liste_limitee' => $rows->count() > 5,
        ]];
    }

    private function publisher(User $user): array
    {
        $profile = DB::table('bca_ads_publisher_profiles')->where('user_id', $user->id)
            ->first(['status', 'test_campaign_validated', 'blocked_reason']);
        if (! $profile) {
            return ['status' => 'not_found'];
        }
        // Do not substitute the archived application's default tariff for an
        // actual setting. A missing setting remains explicitly unavailable.
        $rate = DB::table('settings')->where('key', 'bca_ads_publisher_rate_per_view')->value('value');
        $rate = is_numeric($rate) && is_finite((float) $rate) && (float) $rate >= 0 ? (float) $rate : null;
        return ['status' => 'ok', 'data' => [
            'statut' => $this->text($profile->status, 40),
            'test_valide' => (bool) $profile->test_campaign_validated,
            'motif_blocage' => $profile->status === 'blocked' ? $this->text($profile->blocked_reason, 800) : null,
            'taux_configure' => $rate,
            'precision_tarif' => $rate === null ? 'Paramètre absent : aucun taux actuel confirmé.' :
                'Paramètre global enregistré ; consulter aussi les conditions de la campagne courante.',
        ]];
    }

    private function catalogue(): array
    {
        $groups = [
            'Formations' => DB::table('formations')->where('is_active', true),
            'Ebooks' => DB::table('ebooks')->where('is_active', true),
            'Digital Store' => DB::table('digital_products')->where('is_active', true)->where('status', 'approved'),
        ];
        $lines = [];
        $limited = false;
        foreach ($groups as $label => $query) {
            $rows = $query->orderBy('id')->limit(6)->get(['title']);
            $limited = $limited || $rows->count() > 5;
            $lines[] = $label.' : '.($rows->isEmpty() ? 'aucune offre publiée renvoyée' :
                $rows->take(5)->map(fn ($row) => $this->text($row->title, 90))->implode(' ; '));
        }
        return ['status' => 'ok', 'data' => [
            'statut' => 'consultation effectuée', 'catalogue' => implode("\n", $lines),
            'liste_limitee' => $limited,
        ]];
    }
}
