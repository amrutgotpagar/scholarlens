# Public entry point into the backend. HTTP-only by design here: an HTTPS listener needs
# an ACM certificate, which needs a real domain to validate against - out of scope for a
# portfolio deployment with no purchased domain. To add HTTPS later: request/validate an
# ACM cert for your domain, add a port-443 aws_lb_listener using it, and change the
# port-80 listener below to redirect (action.type = "redirect") instead of forwarding.

resource "aws_lb" "backend" {
  name               = "rag-arxiv-qa-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "rag-arxiv-qa-${var.environment}" }
}

resource "aws_lb_target_group" "backend" {
  name        = "rag-arxiv-qa-${var.environment}"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # required for awsvpc-mode Fargate tasks (no static EC2 instance to register)

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = { Name = "rag-arxiv-qa-${var.environment}" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.backend.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}
