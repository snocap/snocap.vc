#!/bin/bash

# GitHub Actions Keepalive Script
# Keeps scheduled workflows alive by using the GitHub API to enable them
# when no commits have been made for a specified time period.

set -e

# Configuration
TIME_ELAPSED=${TIME_ELAPSED:-45}
GITHUB_TOKEN=${GITHUB_TOKEN:-}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-}
GITHUB_WORKFLOW_REF=${GITHUB_WORKFLOW_REF:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validate required environment variables
if [[ -z "$GITHUB_TOKEN" ]]; then
    log_error "GITHUB_TOKEN is required"
    exit 1
fi

if [[ -z "$GITHUB_REPOSITORY" ]]; then
    log_error "GITHUB_REPOSITORY is required"
    exit 1
fi

if [[ -z "$GITHUB_WORKFLOW_REF" ]]; then
    log_error "GITHUB_WORKFLOW_REF is required"
    exit 1
fi

# Get days since last commit
DAYS_SINCE_LAST_COMMIT=$(( ($(date +%s) - $(git log -1 --format=%ct)) / 86400 ))

log_info "Days since last commit: $DAYS_SINCE_LAST_COMMIT"
log_info "Time elapsed threshold: $TIME_ELAPSED days"

if [ "$DAYS_SINCE_LAST_COMMIT" -ge "$TIME_ELAPSED" ]; then
    log_warn "Threshold exceeded. Keeping workflow alive using GitHub API..."
    
    # Extract owner and repo from GITHUB_REPOSITORY
    IFS='/' read -r OWNER REPO <<< "$GITHUB_REPOSITORY"
    
    # Extract workflow file from GITHUB_WORKFLOW_REF
    WORKFLOW_FILE=$(echo "$GITHUB_WORKFLOW_REF" | sed -n 's/.*\/\([^\/]*\)@.*/\1/p')
    
    log_info "Repository: $OWNER/$REPO"
    log_info "Workflow file: $WORKFLOW_FILE"
    
    # Use GitHub API to enable the workflow
    RESPONSE=$(curl -s -w "%{http_code}" \
        -X PUT \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$OWNER/$REPO/actions/workflows/$WORKFLOW_FILE/enable")
    
    HTTP_CODE="${RESPONSE: -3}"
    RESPONSE_BODY="${RESPONSE%???}"
    
    log_info "HTTP Status Code: $HTTP_CODE"
    
    if [[ -n "$RESPONSE_BODY" ]]; then
        log_info "Response: $RESPONSE_BODY"
    fi
    
    if [ "$HTTP_CODE" = "204" ]; then
        log_info "Successfully kept repository active using GitHub API"
    elif [ "$HTTP_CODE" = "200" ]; then
        log_info "Workflow was already enabled"
    else
        log_warn "API call completed with status: $HTTP_CODE"
        if [[ -n "$RESPONSE_BODY" ]]; then
            echo "$RESPONSE_BODY"
        fi
    fi
else
    log_info "Repository is active. No action needed (elapsed days: $DAYS_SINCE_LAST_COMMIT)"
fi
