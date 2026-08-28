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
  description = "Exact origins allowed to POST/GET directly against the bucket via presigned URLs — no port wildcard support despite the syntax being accepted."
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:5180"]
}
