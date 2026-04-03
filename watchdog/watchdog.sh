#!/bin/sh
set -e

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

log "Watchdog starting — subscribing to deploy:gateway-self on ${REDIS_HOST}:${REDIS_PORT}"

# redis-cli subscribe outputs triplets of lines (type, channel, payload/count).
# We track which position in the triplet each line falls on using a counter.
redis-cli --tls -h "$REDIS_HOST" -p "$REDIS_PORT" subscribe deploy:gateway-self | {
  n=0
  msg_type=""
  msg_channel=""
  while IFS= read -r line; do
    n=$((n + 1))
    rem=$((n % 3))
    if [ "$rem" -eq 1 ]; then
      msg_type="$line"
    elif [ "$rem" -eq 2 ]; then
      msg_channel="$line"
    else
      msg_payload="$line"
      if [ "$msg_type" = "message" ] && [ "$msg_channel" = "deploy:gateway-self" ]; then
        imageUri=$(printf '%s' "$msg_payload" | jq -r '.imageUri')

        log "Received deploy:gateway-self — imageUri=${imageUri}"
        log "Waiting 3 seconds for HTTP response to complete..."
        sleep 3

        log "Pulling image: ${imageUri}"
        if docker pull "$imageUri"; then
          log "Restarting container: bk-gateway-api"
          if docker restart bk-gateway-api; then
            log "Deploy complete for imageUri=${imageUri}"
          else
            log "ERROR: docker restart bk-gateway-api failed for imageUri=${imageUri}"
          fi
        else
          log "ERROR: docker pull failed for imageUri=${imageUri}"
        fi
      fi
    fi
  done
}
