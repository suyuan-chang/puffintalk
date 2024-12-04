## NOTE: Dockerfile build context is /backend
FROM postgres:17

COPY ./data/init_db.sql /docker-entrypoint-initdb.d/init_db.sql

CMD ["docker-entrypoint.sh", "postgres"]
