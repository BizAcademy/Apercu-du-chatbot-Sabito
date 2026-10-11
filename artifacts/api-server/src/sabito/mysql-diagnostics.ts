export interface MysqlDiagnostic {
  code: string;
  reason: string;
  nextStep: string;
  missingVariables?: string[];
}

// Only trusted descriptions are logged. Never log driver messages, SQL,
// connection options, usernames, passwords, URLs or arbitrary error codes.
const driverFailures = new Map<string, [string, string]>([
  ["ECONNREFUSED", ["Connexion MySQL refusée.", "Vérifier le service MariaDB et l'adresse/port utilisés par l'application."]],
  ["ETIMEDOUT", ["Délai de connexion MySQL dépassé.", "Vérifier l'accès réseau au serveur MariaDB et son pare-feu."]],
  ["ENOTFOUND", ["Adresse du serveur MySQL introuvable.", "Vérifier la résolution de l'adresse configurée dans MYSQL_HOST."]],
  ["EAI_AGAIN", ["Résolution de l'adresse MySQL temporairement indisponible.", "Vérifier le DNS du serveur puis réessayer."]],
  ["EHOSTUNREACH", ["Serveur MySQL inaccessible.", "Vérifier le routage réseau et le pare-feu."]],
  ["ENETUNREACH", ["Réseau MySQL inaccessible.", "Vérifier le routage réseau et le pare-feu."]],
  ["ECONNRESET", ["Connexion MySQL interrompue.", "Vérifier le service MariaDB puis réessayer."]],
  ["PROTOCOL_CONNECTION_LOST", ["Connexion MySQL perdue.", "Vérifier les journaux et la disponibilité de MariaDB."]],
  ["ER_ACCESS_DENIED_ERROR", ["Authentification MySQL refusée.", "Vérifier la correspondance de l'utilisateur et du mot de passe entre MariaDB et la configuration Plesk."]],
  ["ER_DBACCESS_DENIED_ERROR", ["Accès à la base MySQL refusé.", "Vérifier que l'utilisateur MariaDB est autorisé sur la base configurée."]],
  ["ER_BAD_DB_ERROR", ["Base MySQL introuvable.", "Vérifier que MYSQL_DATABASE désigne une base existante sur le serveur configuré."]],
  ["ER_HOST_NOT_PRIVILEGED", ["Hôte de connexion MySQL non autorisé.", "Vérifier les restrictions d'accès de l'utilisateur MariaDB."]],
  ["ER_TABLEACCESS_DENIED_ERROR", ["Droits MySQL insuffisants sur les tables.", "Vérifier les droits de l'utilisateur sur les tables de Sabito."]],
  ["ER_SPECIFIC_ACCESS_DENIED_ERROR", ["Droits MySQL insuffisants pour cette opération.", "Vérifier les droits de l'utilisateur MariaDB avant de continuer."]],
  ["ER_CON_COUNT_ERROR", ["Limite de connexions MySQL atteinte.", "Vérifier la limite de connexions du serveur MariaDB."]],
  ["ER_TOO_MANY_USER_CONNECTIONS", ["Limite de connexions de l'utilisateur MySQL atteinte.", "Vérifier la limite de connexions attribuée à cet utilisateur."]],
  ["ER_NOT_SUPPORTED_AUTH_MODE", ["Mode d'authentification MySQL incompatible.", "Vérifier le mode d'authentification de l'utilisateur MariaDB."]],
  ["ER_NO_SUCH_TABLE", ["Table MySQL requise introuvable.", "Consulter migrate:status puis migrate:plan ; ne pas appliquer sans revue."]],
  ["ER_BAD_FIELD_ERROR", ["Schéma MySQL incompatible avec cette version.", "Vérifier les migrations et la version déployée avant de modifier la base."]],
  ["ER_PARSE_ERROR", ["Instruction de migration incompatible avec MariaDB.", "Revoir le SQL de la migration ; ne pas relancer son application aveuglément."]],
]);

const applicationFailures = new Map<string, [string, string, string]>([
  ["MYSQL_PORT must be an integer between 1 and 65535.", ["MYSQL_CONFIG_INVALID_PORT", "Port MySQL invalide.", "Configurer MYSQL_PORT avec un entier entre 1 et 65535."]],
  ["MySQL migration files are missing.", ["MYSQL_MIGRATION_FILES_MISSING", "Fichiers de migration absents.", "Vérifier que le paquet compilé contient migrations/mysql."]],
  ["No numbered MySQL migration files found.", ["MYSQL_MIGRATION_FILES_MISSING", "Aucune migration numérotée disponible.", "Vérifier l'intégrité du paquet compilé."]],
  ["Duplicate MySQL migration numbers.", ["MYSQL_MIGRATION_NUMBERS_DUPLICATED", "Numéros de migration en double.", "Corriger les fichiers de migration avant de déployer."]],
  ["Migration history contains files missing from this release. Review before continuing.", ["MYSQL_MIGRATION_HISTORY_MISMATCH", "Historique des migrations incompatible avec cette version.", "Comparer l'historique et le paquet déployé ; ne pas supprimer l'historique."]],
  ["Migration history contains files missing from this release.", ["MYSQL_MIGRATION_HISTORY_MISMATCH", "Historique des migrations incompatible avec cette version.", "Comparer l'historique et le paquet déployé ; ne pas supprimer l'historique."]],
  ["Pending MySQL migrations: review and apply them explicitly before production startup.", ["MYSQL_MIGRATIONS_PENDING", "Migrations en attente : démarrage de production bloqué.", "Consulter migrate:plan et valider le SQL avant toute application."]],
  ["Production migrations require explicit review.", ["MYSQL_MIGRATION_REVIEW_REQUIRED", "Revue explicite des migrations requise.", "Lire le plan de migration avant de valider son application."]],
  ["Review the migration plan before explicitly approving application.", ["MYSQL_MIGRATION_REVIEW_REQUIRED", "Revue explicite des migrations requise.", "Lire le plan de migration avant de valider son application."]],
  ["Could not acquire Sabito migration lock.", ["MYSQL_MIGRATION_LOCK_UNAVAILABLE", "Verrou de migration indisponible.", "Vérifier qu'aucune autre migration ne tourne puis réessayer."]],
  ["A migration requires explicit destructive-change approval.", ["MYSQL_DESTRUCTIVE_REVIEW_REQUIRED", "Une migration demande une validation destructive explicite.", "Vérifier son impact et une sauvegarde avant toute validation."]],
]);

export function describeMysqlFailure(error: unknown, depth = 0): MysqlDiagnostic {
  if (depth < 3 && error !== null && typeof error === "object") {
    const candidate = error as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
    if (typeof candidate.code === "string") {
      const description = driverFailures.get(candidate.code);
      if (description) return { code: candidate.code, reason: description[0], nextStep: description[1] };
    }
    if (typeof candidate.message === "string") {
      const description = applicationFailures.get(candidate.message);
      if (description) return { code: description[0], reason: description[1], nextStep: description[2] };
      const missing = candidate.message.match(/^Missing MySQL configuration: (MYSQL_(?:HOST|DATABASE|USER|PASSWORD)(?:, MYSQL_(?:HOST|DATABASE|USER|PASSWORD))*)\.$/);
      if (missing) return {
        code: "MYSQL_CONFIG_MISSING",
        reason: "Variables MySQL requises absentes du processus.",
        nextStep: "Vérifier les variables personnalisées de l'application Node.js dans Plesk.",
        missingVariables: missing[1].split(", "),
      };
    }
    const nested = [candidate.cause, ...(Array.isArray(candidate.errors) ? candidate.errors.slice(0, 8) : [])];
    for (const child of nested) {
      const diagnostic = describeMysqlFailure(child, depth + 1);
      if (diagnostic.code !== "MYSQL_DIAGNOSTIC_UNKNOWN") return diagnostic;
    }
  }
  return {
    code: "MYSQL_DIAGNOSTIC_UNKNOWN",
    reason: "Échec MySQL non identifié par le diagnostic sécurisé.",
    nextStep: "Vérifier la version déployée et les journaux serveur sans partager de valeurs privées.",
  };
}
