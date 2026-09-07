DELETE FROM "auth_tokens" WHERE "kind" = 'REFRESH';
--> statement-breakpoint
ALTER TYPE "auth_token_kind" RENAME TO "auth_token_kind_old";
--> statement-breakpoint
CREATE TYPE "auth_token_kind" AS ENUM('EMAIL_VERIFY', 'PASSWORD_RESET');
--> statement-breakpoint
ALTER TABLE "auth_tokens" ALTER COLUMN "kind" TYPE "auth_token_kind" USING "kind"::text::"auth_token_kind";
--> statement-breakpoint
DROP TYPE "auth_token_kind_old";
