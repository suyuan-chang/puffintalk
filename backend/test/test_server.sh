#!/bin/bash

echo "### Test node.js server up and running"
curl http://localhost:3000/api/test
echo "\n"

echo "### Test database server up and running and node.js server can connect to it."
curl http://localhost:3000/api/test/db
echo "\n"
