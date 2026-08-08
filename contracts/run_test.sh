#!/bin/bash
# Corre los 11 tests de integración de los contratos contra un nodo
# Hardhat local (no gasta ETH real ni de testnet). Uso: bash run_test.sh
set -e
cd "$(dirname "$0")"

pkill -9 -f "hardhat node" 2>/dev/null || true

npx hardhat node --port 8700 > /tmp/trustlink_hardhat_node.log 2>&1 &
NODE_PID=$!

for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:8700 -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' > /dev/null 2>&1; then
    echo "Nodo Hardhat listo tras ${i}s"
    break
  fi
  sleep 1
done

EXTERNAL_RPC_PORT=8700 node test_all_in_one.js
RESULT=$?

kill $NODE_PID 2>/dev/null || true
exit $RESULT
