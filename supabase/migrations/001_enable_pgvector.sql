-- Migration 001: Enable pgvector extension
-- Must run before any migration that uses the vector type

CREATE EXTENSION IF NOT EXISTS vector;
