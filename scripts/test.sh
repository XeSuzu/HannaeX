#!/bin/bash
set -e
npm run build
HANDLER_TEST_BUILD_DIR="$PWD/dist" node --test tests/unit/*.test.cjs
