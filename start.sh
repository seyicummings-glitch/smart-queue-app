#!/bin/sh
set -e
cd /app/backend
python manage.py migrate --noinput
exec gunicorn --bind "0.0.0.0:${PORT:-8080}" --workers 1 --timeout 120 sqms.wsgi
