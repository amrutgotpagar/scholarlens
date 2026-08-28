# Runtime S3 access for the backend app — deliberately separate from and much narrower than
# the rag-arxiv-qa-terraform user this config is applied with (that one needs broad S3 access
# to provision the bucket itself; the app only ever needs to read/write/delete objects in it).
#
# Static access keys are this build's local-dev stand-in. In a real ECS deployment (Phase 5)
# this would be an IAM role attached to the task instead — no long-lived secret to rotate or
# leak at all. Note also that the resulting secret access key is stored in Terraform state;
# for anything beyond local/portfolio use, state should live in an encrypted remote backend
# (S3 + DynamoDB locking), not as a local file.

resource "aws_iam_user" "app" {
  name = "rag-arxiv-qa-app"
  tags = {
    Project     = "rag-arxiv-qa"
    Environment = var.environment
  }
}

resource "aws_iam_user_policy" "app_s3_access" {
  name = "rag-arxiv-qa-s3-access"
  user = aws_iam_user.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/uploads/*"
      },
      {
        Sid      = "BucketLevelRead"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.uploads.arn
      }
    ]
  })
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}

output "app_access_key_id" {
  value = aws_iam_access_key.app.id
}

output "app_secret_access_key" {
  value     = aws_iam_access_key.app.secret
  sensitive = true
}
