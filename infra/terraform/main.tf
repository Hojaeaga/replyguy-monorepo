# ReplyGuy Infrastructure
# This file contains the Terraform configuration for ReplyGuy services

terraform {
  required_version = ">= 1.0"
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

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

# TODO: Add specific infrastructure resources based on deployment needs
# - ECS/Fargate for containerized services
# - Redis for queue management
# - Load balancers
# - VPC and networking
# - IAM roles and policies 