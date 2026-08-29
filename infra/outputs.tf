output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "aws_region" {
  value = var.aws_region
}

# ── Phase 5 ──────────────────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "Backend API entry point - what CORS_ALLOW_ORIGINS/the frontend's API base would point at."
  value       = aws_lb.backend.dns_name
}

output "cloudfront_domain_name" {
  description = "Frontend URL (CloudFront's own *.cloudfront.net domain - no custom domain purchased)."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "ecr_repository_url" {
  description = "Push backend images here (Phase 6 CI/CD builds and pushes to this repo)."
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDS instance address (the ECS task gets the full connection string via Secrets Manager, not this directly)."
  value       = aws_db_instance.main.address
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.backend.name
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}
