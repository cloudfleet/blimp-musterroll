#!/bin/bash
authbind node cockpit.js --domain=${CLOUDFLEET_DOMAIN} \
    --secret=${CLOUDFLEET_SECRET} > /opt/cloudfleet/log/musterroll.log 2>&1
