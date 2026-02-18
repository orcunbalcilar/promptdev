#!/usr/bin/env bats
# Tests for deploy.sh env-file support

setup() {
  export TEST_DIR="$(mktemp -d)"
  export DEPLOY_SCRIPT="${BATS_TEST_DIRNAME}/../deploy.sh"
}

teardown() {
  rm -rf "$TEST_DIR"
}

@test "deploy.sh --help shows usage" {
  run bash "$DEPLOY_SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" =~ "Usage:" ]]
  [[ "$output" =~ "--env-file" ]]
}

@test "deploy.sh rejects invalid arguments" {
  run bash "$DEPLOY_SCRIPT" --invalid-arg
  [ "$status" -ne 0 ]
  [[ "$output" =~ "Unknown argument" ]]
}

@test "deploy.sh script has required environment variable names" {
  # Check that script mentions required keys
  grep -qE "ENCRYPTION_KEY" "$DEPLOY_SCRIPT"
  grep -qE "AUTH_SECRET" "$DEPLOY_SCRIPT"
  grep -qE "AUTH_GITHUB_ID" "$DEPLOY_SCRIPT"
  grep -qE "AUTH_GITHUB_SECRET" "$DEPLOY_SCRIPT"
  grep -qE "GITHUB_TOKEN" "$DEPLOY_SCRIPT"
}

@test "deploy.sh has env-file argument parsing" {
  # Check that script has argument parsing for env file
  grep -qE "env-file|ENV_FILE" "$DEPLOY_SCRIPT"
}

@test "deploy.sh has functions for env file handling" {
  # Check that script has key functions
  grep -qF "resolve_env_file" "$DEPLOY_SCRIPT"
  grep -qF "load_env_file" "$DEPLOY_SCRIPT"
  grep -qF "generate_secret" "$DEPLOY_SCRIPT"
}

@test "deploy.sh sets env file permissions" {
  # Check that script sets proper permissions
  grep -qE "chmod 600" "$DEPLOY_SCRIPT"
}

@test "deploy.sh uses --env-file with compose" {
  # Check that script uses --env-file flag with docker compose
  grep -qE -- "--env-file" "$DEPLOY_SCRIPT"
}
