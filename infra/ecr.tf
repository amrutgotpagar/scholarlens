# Image repo for the backend (backend/Dockerfile). Phase 6's CI/CD workflow builds and
# pushes here, then updates the ECS task definition with the new tag.

resource "aws_ecr_repository" "backend" {
  name                 = "rag-arxiv-qa-backend"
  image_tag_mutability = "IMMUTABLE" # a given tag (e.g. a commit SHA) can't be silently overwritten

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Project = "rag-arxiv-qa" }
}

# Untagged images (superseded by a later push under the same CI-generated tag scheme,
# or leftover from a failed build) pile up storage cost with no way to reference them -
# expire anything untagged after 7 days rather than let them accumulate indefinitely.
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
