# Postgres for app data (documents, chunks + pgvector embeddings, feedback). pgvector
# ships as a supported extension on RDS Postgres 15.2+ - no custom parameter group or
# shared_preload_libraries needed, just `CREATE EXTENSION vector;` once connected (the
# app's own Alembic migration already does this - see backend/alembic/versions/).

resource "aws_db_subnet_group" "main" {
  name       = "rag-arxiv-qa-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "rag-arxiv-qa-${var.environment}" }
}

resource "aws_db_instance" "main" {
  identifier     = "rag-arxiv-qa-${var.environment}"
  engine         = "postgres"
  engine_version = "16.4"

  # Cost-conscious for portfolio scale: 1,000 req/day (see README's estimate) doesn't
  # come close to needing more than the smallest burstable instance.
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  # No password variable at all - RDS generates and rotates it, stores it as its own
  # Secrets Manager secret (aws_db_instance.main.master_user_secret[0].secret_arn), and
  # the app's DATABASE_URL secret (see secrets.tf) is assembled from that at apply time.
  # Nobody, including this Terraform config's own state, ever holds the password in the
  # clear beyond what RDS itself manages.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                = false # portfolio scale - real HA would flip this on
  backup_retention_period = 1
  deletion_protection     = false # portfolio needs to be torn down cleanly with `terraform destroy`
  skip_final_snapshot     = true

  tags = { Name = "rag-arxiv-qa-${var.environment}" }
}

# The password half of the connection string - RDS's own managed secret only has the
# password, not a ready-to-use DATABASE_URL, so this assembles the real thing.
data "aws_secretsmanager_secret_version" "rds_master_password" {
  secret_id = aws_db_instance.main.master_user_secret[0].secret_arn
}
