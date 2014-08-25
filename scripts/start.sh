#!/bin/bash
authbind node cockpit.js --domain=${BLIMP_DOMAIN} \
    --secret=${BLIMP_SECRET} > /opt/cloudfleet/log/musterroll.log 2>&1
