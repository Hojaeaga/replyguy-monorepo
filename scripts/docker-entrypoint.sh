#!/bin/bash
set -e

# Default to ingestion if no service specified
SERVICE=${1:-ingestion}

case "$SERVICE" in
  "ingestion")
    echo "Starting ingestion service..."
    exec node apps/ingestion/dist/index.js
    ;;
  "worker")
    echo "Starting worker service..."
    exec node apps/worker/dist/index.js
    ;;
  *)
    echo "Unknown service: $SERVICE"
    echo "Available services: ingestion, worker"
    exit 1
    ;;
esac