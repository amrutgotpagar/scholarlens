terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Uploaded PDFs. Presigned URLs let the browser upload directly here — raw files never
# route through the backend (see backend/app/routers/documents.py: presign + finalize).
resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name

  tags = {
    Project     = "rag-arxiv-qa"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Disabled" # portfolio scale; no need for the extra storage cost/complexity
  }
}

# Required for direct browser -> S3 upload via presigned URL: without this, the presigned
# upload succeeds at the HTTP level but the browser blocks the response as a CORS failure.
# POST (not PUT): the backend issues a presigned POST specifically so S3 itself enforces the
# content-length-range and Content-Type conditions, not just PUT with a trusted client.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["POST", "GET"]
    allowed_origins = var.allowed_origins
    allowed_headers = ["Content-Type"]
    max_age_seconds = 3000
  }
}

# Auto-delete incomplete multipart uploads and anything left over from failed processing
# attempts after a week, so abandoned uploads don't quietly accumulate storage cost.
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"
    filter {} # applies to every object in the bucket
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
