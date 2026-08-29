# Three tiers, each only reachable from the one in front of it — internet can reach the
# ALB, the ALB can reach the ECS tasks, the ECS tasks can reach RDS. Nothing skips a tier.

resource "aws_security_group" "alb" {
  name        = "rag-arxiv-qa-${var.environment}-alb"
  description = "Internet-facing ALB - allows inbound HTTP from anywhere"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "rag-arxiv-qa-${var.environment}-alb" }
}

resource "aws_security_group" "ecs_service" {
  name        = "rag-arxiv-qa-${var.environment}-ecs"
  description = "Backend Fargate tasks - only reachable from the ALB, not the internet directly"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from ALB only"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    # Needs open egress: pulls the image from ECR, calls the OpenAI API, talks to RDS -
    # all over the NAT Gateway/VPC endpoints, not just to one fixed destination.
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "rag-arxiv-qa-${var.environment}-ecs" }
}

resource "aws_security_group" "rds" {
  name        = "rag-arxiv-qa-${var.environment}-rds"
  description = "Postgres - only reachable from the ECS service, never public"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from ECS tasks only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "rag-arxiv-qa-${var.environment}-rds" }
}
