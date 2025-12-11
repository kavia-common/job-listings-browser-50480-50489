#!/bin/bash
cd /home/kavia/workspace/code-generation/job-listings-browser-50480-50489/job_board_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

