import { AbiInput } from 'web3-utils';

export interface Abi {
    name: string;
    type: 'function' | 'event';
    inputs: AbiInput[];
    contractName?: string;
    fileName?: string;
    contractFingerprint?: string;
    contractAddress?: string;
}

export function isAnonymous(abi: Abi): boolean {
    return abi.contractAddress == null && abi.contractFingerprint == null;
}
