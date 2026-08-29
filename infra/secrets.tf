# Everything the backend's app/config.py (Settings) needs at runtime that's actually
# sensitive - OPENAI_API_KEY, SUPABASE_JWT_SECRET, and the full DATABASE_URL connection
# string (RDS manages the password half; this assembles the real thing from it). The ECS
# task definition (ecs.tf) pulls each of these in via a `secrets` block, not a plain
# `environment` entry - never lands in the task definition's own visible JSON, only
# resolved inside the running container.

locals {
  rds_credentials = jsondecode(data.aws_secretsmanager_secret_version.rds_master_password.secret_string)
  database_url    = "postgresql+psycopg://${var.db_username}:${urlencode(local.rds_credentials.password)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "rag-arxiv-qa/${var.environment}/database-url"
  recovery_window_in_days = 0 # portfolio: allow immediate deletion on `terraform destroy`, no 7-30 day hold
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name                    = "rag-arxiv-qa/${var.environment}/openai-api-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "supabase_jwt_secret" {
  name                    = "rag-arxiv-qa/${var.environment}/supabase-jwt-secret"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "supabase_jwt_secret" {
  secret_id     = aws_secretsmanager_secret.supabase_jwt_secret.id
  secret_string = var.supabase_jwt_secret
}
