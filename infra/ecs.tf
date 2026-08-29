resource "aws_ecs_cluster" "main" {
  name = "rag-arxiv-qa-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "disabled" # portfolio: skip the extra CloudWatch metrics cost
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/rag-arxiv-qa-${var.environment}-backend"
  retention_in_days = 14
}

# Lets ECS itself pull the image from ECR and ship container logs to CloudWatch - the
# standard AWS-managed policy, not anything this app needs directly.
resource "aws_iam_role" "ecs_task_execution" {
  name = "rag-arxiv-qa-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The execution role above pulls images/writes logs; it can't read the Secrets Manager
# entries the task definition references unless explicitly granted here too.
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "rag-arxiv-qa-${var.environment}-read-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.openai_api_key.arn,
        aws_secretsmanager_secret.supabase_jwt_secret.arn,
      ]
    }]
  })
}

# The task's OWN runtime permissions - what the app itself does once running, not what
# ECS does to start it. This is the IAM-role equivalent of the static IAM user + access
# keys in iam.tf (that one is the local-dev/docker-compose stand-in the comments there
# already flagged as temporary); same S3 permissions, but as a role a task assumes, with
# no long-lived credential to leak or rotate.
resource "aws_iam_role" "ecs_task" {
  name = "rag-arxiv-qa-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_s3_access" {
  name = "rag-arxiv-qa-${var.environment}-s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ObjectAccess"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
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

resource "aws_ecs_task_definition" "backend" {
  family                   = "rag-arxiv-qa-${var.environment}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  # Smallest Fargate size: this app's own eval results show LLM generation calls taking
  # up to ~80s, which is I/O-bound waiting on the OpenAI API, not CPU/memory-heavy locally.
  cpu                = "512"
  memory             = "1024"
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [
        { name = "SUPABASE_URL", value = var.supabase_url },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.uploads.id },
        { name = "CORS_ALLOW_ORIGINS", value = jsonencode(var.allowed_origins) },
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "OPENAI_API_KEY", valueFrom = aws_secretsmanager_secret.openai_api_key.arn },
        { name = "SUPABASE_JWT_SECRET", valueFrom = aws_secretsmanager_secret.supabase_jwt_secret.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = { Name = "rag-arxiv-qa-${var.environment}-backend" }
}

resource "aws_ecs_service" "backend" {
  name            = "rag-arxiv-qa-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1 # portfolio scale - bump for real redundancy, costs 2x either way
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = false # reaches the internet via the NAT Gateway, not a public IP of its own
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]
}
