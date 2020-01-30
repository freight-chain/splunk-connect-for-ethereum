import { readdir, readFile, stat } from 'fs-extra';
import { basename, join as joinPath } from 'path';
import { AbiItem } from 'web3-utils';
import { AbiRepositoryConfig } from '../config';
import { createModuleDebug } from '../utils/debug';
import { Abi } from './abi';
import { computeContractFingerprint } from './contract';
import { computeSignature } from './signature';
import { Address } from '../msgs';

const { debug, info, warn, trace } = createModuleDebug('abi:files');

interface TruffleBuild {
    contractName: string;
    abi: AbiItem[];
    networks?: {
        [id: string]: {
            address: string;
        };
    };
}

export interface SignatureFileContents {
    type: 'function' | 'event';
    entries: Array<[string, ...Abi[]]>;
}

export function isAbiArray(obj: any): obj is AbiItem[] {
    return Array.isArray(obj);
}

export function isTruffleBuildFile(obj: any): obj is TruffleBuild {
    return typeof obj === 'object' && typeof obj.contractName === 'string' && Array.isArray(obj.abi);
}

export function extractDeployedContractAddresses(truffleBuild: TruffleBuild): Address[] | undefined {
    if (truffleBuild.networks) {
        return Object.values(truffleBuild.networks)
            .filter(({ address }) => address != null)
            .map(({ address }) => address.toLowerCase() as Address);
    }
}

export async function* searchAbiFiles(dir: string, config: AbiRepositoryConfig): AsyncIterable<string> {
    debug('Searching for ABI files in %s', dir);
    const dirContents = await readdir(dir).catch(e =>
        Promise.reject(new Error(`Failed to load ABIs from directory ${dir}: ${e}`))
    );
    const subdirs = [];
    for (const f of dirContents) {
        const full = joinPath(dir, f);
        const s = await stat(full);
        if (s.isDirectory() && (config.searchRecursive ?? true)) {
            subdirs.push(joinPath(dir, f));
        } else if (s.isFile() && f.endsWith(config.abiFileExtension ?? '.json')) {
            yield full;
        }
    }
    for (const sub of subdirs) {
        yield* searchAbiFiles(sub, config);
    }
}

export interface AbiFileContents {
    contractName: string;
    contractAddress?: string;
    contractFingerprint?: string;
    items: Abi[];
}

export function parseAbiFileContents(
    abiData: any,
    { computeFingerprint, fileName }: { computeFingerprint: boolean; fileName: string }
): AbiFileContents {
    let abis: AbiItem[];
    let contractName: string;
    let contractAddress: string | undefined;
    if (isTruffleBuildFile(abiData)) {
        abis = abiData.abi;
        contractName =
            abiData.contractName ||
            // Fall back to file name without file extension
            basename(fileName).split('.', 1)[0];
        const addresses = extractDeployedContractAddresses(abiData);
        if (addresses != null) {
            if (addresses.length > 0) {
                warn(
                    'Found contract %s deployed to multiple (%d) networks, using address %s of first network',
                    contractName,
                    addresses.length,
                    addresses[0]
                );
                contractAddress = addresses[0];
            }
        }
    } else if (isAbiArray(abiData)) {
        abis = abiData;
        contractName = basename(fileName).split('.', 1)[0];
    } else {
        throw new Error(`Invalid contents of ABI file ${fileName}`);
    }

    const items = abis
        .filter(abi => (abi.type === 'function' || abi.type === 'event') && abi.name != null)
        .map(item => ({
            item,
            sig: computeSignature({ name: item.name!, inputs: item.inputs ?? [], type: 'function' }),
        }));

    let contractFingerprint: string | undefined;
    if (computeFingerprint) {
        const functions = items
            .filter(i => i.item.type === 'function')
            .map(i => i.sig)
            .sort();
        const events = items
            .filter(i => i.item.type === 'event')
            .map(i => i.sig)
            .sort();

        contractFingerprint = computeContractFingerprint({ functions, events });
        debug('Computed contract fingerprint %s for contract signature %s', contractFingerprint, contractName);
    }

    return {
        contractName,
        contractAddress,
        contractFingerprint: contractFingerprint,
        items: abis.map(item => ({
            name: item.name!,
            type: item.type as 'function' | 'event',
            inputs: item.inputs ?? [],
            contractName,
            contractFingerprint,
            contractAddress,
            fileName,
        })),
    };
}

export async function loadAbiFile(path: string, config: AbiRepositoryConfig): Promise<AbiFileContents> {
    const contents = await readFile(path, { encoding: 'utf-8' });
    const data = JSON.parse(contents);
    return await parseAbiFileContents(data, { fileName: path, computeFingerprint: config.fingerprintContracts });
}
