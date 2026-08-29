# Networking for Phase 5 (ECS Fargate + RDS). Two AZs for the subnets the ALB and RDS's
# subnet group require, but a single shared NAT Gateway rather than one per AZ — halves
# the ~$32/mo-per-NAT cost at the price of the private subnets losing outbound internet
# access if that one AZ has an outage. Acceptable for a portfolio deployment; a real
# multi-AZ-resilient setup would give each private subnet its own NAT in its own AZ.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = "rag-arxiv-qa-${var.environment}"
    Project = "rag-arxiv-qa"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "rag-arxiv-qa-${var.environment}"
  }
}

# Public subnets — ALB and the NAT Gateway live here.
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "rag-arxiv-qa-${var.environment}-public-${count.index}"
    Tier = "public"
  }
}

# Private subnets — RDS and the ECS Fargate tasks live here, never directly reachable
# from the internet; the ALB is the only public entry point into the backend.
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 2)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "rag-arxiv-qa-${var.environment}-private-${count.index}"
    Tier = "private"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags = {
    Name = "rag-arxiv-qa-${var.environment}-nat"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.main]

  tags = {
    Name = "rag-arxiv-qa-${var.environment}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "rag-arxiv-qa-${var.environment}-public"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "rag-arxiv-qa-${var.environment}-private"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
