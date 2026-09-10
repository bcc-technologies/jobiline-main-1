#!/usr/bin/env bash
set -e

/opt/wait-for-it.sh -t 0 postgres:5432
/opt/wait-for-it.sh -t 0 maildev:1080
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
