# ABI Decoding

Splunk Connect for Ethereum features ABI decoding of function calls and event logs in Ethereum transactions

## Supplying ABI definitions

You can

### File formats

```json

```

## Contract Fingerprinting

One challenge that can occur when decoding ABI information is overlapping signatures. Imagine 2 smart contracts both expose a function with the signature `approve(address,uint256)`
..

## Anonymous ABI decoding

For cases where function call

Ethlogger ships with a standard set of function and event signatures that are compliled from from external sources:

-   https://github.com/MrLuit/evm
-   https://4byte.directory

### Supplying additional signatures
