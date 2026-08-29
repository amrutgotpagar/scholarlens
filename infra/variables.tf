variable "aws_region" {
  description = "AWS region for the S3 bucket."
  type        = string
  default     = "eu-north-1"
}

variable "bucket_name" {
  description = "S3 bucket name for uploaded PDFs. Must be globally unique across all AWS accounts."
  type        = string
}

variable "environment" {
  description = "Environment tag (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "allowed_origins" {
  # "http://localhost:*" looks like it should work (AWS accepts it without complaint at
  # apply time) but does NOT actually match arbitrary ports at request time — verified live:
  # S3 returned 403 AccessForbidden on a real preflight from http://localhost:5180 with this
  # value set. List every concrete dev-server port you actually use; there's no working
  # port-wildcard shortcut here, confirmed the hard way.
  #
  # The real bucket's CORS was hand-edited in the AWS Console mid-incident to add the
  # production origin (see the deploy debugging session) - kept in sync here too, or a
  # future `terraform apply` would silently revert that fix back to localhost-only.
  description = "Exact origins allowed to POST/GET directly against the bucket via presigned URLs — no port wildcard support despite the syntax being accepted."
  type        = list(string)
  default = [
    "http://localhost:5173",
    "http://localhost:5180",
    "https://scholarlens-murex.vercel.app",
  ]
}

# ── Phase 5: VPC + RDS + ECS Fargate + ALB + CloudFront ──────────────────────────────
# Portfolio-only Terraform - demonstrates the AWS deployment path from the original
# project spec. Not applied: the real, live deployment runs on Supabase + Render +
# Vercel, decided mid-project once the LLM generation latency (up to ~80s per the eval
# results) turned out to exceed Vercel's serverless function limits more cheaply solved
# by a long-running host than by this full VPC/RDS/ECS stack.

variable "vpc_cidr" {
  description = "CIDR block for the Phase 5 VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "container_port" {
  description = "Port the backend container listens on inside the ECS task."
  type        = number
  default     = 8000
}

variable "backend_image_tag" {
  description = "Tag of the backend image in ECR that the ECS task definition should run."
  type        = string
  default     = "latest"
}

variable "db_name" {
  description = "Name of the Postgres database created on the RDS instance."
  type        = string
  default     = "rag"
}

variable "db_username" {
  description = "Master username for the RDS instance. The password is managed natively by RDS in Secrets Manager (manage_master_user_password) - never set or stored here."
  type        = string
  default     = "rag_app"
}

variable "openai_api_key" {
  description = "OpenAI API key, stored in Secrets Manager and injected into the ECS task - never given a default, never committed."
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL - auth stays on Supabase even in this AWS deployment, since that's what the backend code actually verifies JWTs against (see backend/app/auth.py)."
  type        = string
}

variable "supabase_jwt_secret" {
  description = "Supabase JWT secret (HS256 fallback path) - stored in Secrets Manager, never committed."
  type        = string
  sensitive   = true
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for the frontend's static build, served through CloudFront. Must be globally unique."
  type        = string
}
