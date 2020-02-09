# Data Collection

Splunk Connect for Ethereum (ethlogger) periodically pulls data from a given ethereum node. This document describes the internal architecture to make this happen.

At a high level, there are 2 subsystems in ethlogger that are responsible

## Blockwatcher

Blockwatcher is responsible for retrieving blocks, transactions, receipts and event logs from the ethereum node, parse, enrich and format the contents and forward it to the output destination (Splunk HEC by default).

1. Retrive block - including transaction
2. For each transaction: retrieve the transaction receipt, which includes event logs
3. Enrich transaction info
    - Determine if `to` or `from` addresses are contracts
    - If so, augment contract information
4. If transaction is smart contract function call: attempt to decode function call ABI to retrieve function name and parameter values
5.

### Checkpoints

Blockwatcher stores a record of blocks it has successfully processed in a checkpoint file on disk (`checkpoints.json` by default). This allows it resume where it left off in case ethlogger is restarted

## Node Stats Collection

### Node Metrics

### Node Info

### Pending Transactions
