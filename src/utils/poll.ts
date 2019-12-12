import { ABORT, Abortable, AbortManager } from './abort';
import { sleep } from './async';
import { createModuleDebug } from './debug';
import { resolveWaitTime, WaitTime } from './retry';

const { debug, error } = createModuleDebug('poll');

export type PollTask<T> = () => Promise<T | null>;

interface PollConfig<T> {
    name: string;
    task: PollTask<T>;
    interval: number;
    waitAfterFailure: WaitTime;
}

async function* runPoll<T>({
    name,
    task,
    interval,
    waitAfterFailure,
    abort,
}: PollConfig<T> & { abort: AbortManager }): AsyncIterator<T> {
    let fails = 0;
    while (!abort.aborted) {
        const startTime = Date.now();
        try {
            const result = await abort.race(task());
            if (result != null) {
                yield result;
            }
        } catch (e) {
            if (e === ABORT) {
                break;
            }
            fails++;
            const waitBeforeRetry = resolveWaitTime(waitAfterFailure, fails);
            try {
                await abort.race(sleep(waitBeforeRetry));
            } catch (e) {
                if (e === ABORT) {
                    break;
                }
            }
        }
        const waitForNext = Math.max(0, interval - (Date.now() - startTime));

        try {
            await abort.race(sleep(waitForNext));
        } catch (e) {
            if (e === ABORT) {
                break;
            }
            error('Unexpected error waiting for next poll iteration of poll task %s', name, e);
        }
        debug('Poll loop for task %s ended', name);
    }
}

export function poll<T>(config: PollConfig<T>): AsyncIterable<T> & AsyncIterator<T> & Abortable {
    const abortManager = new AbortManager();
    const it = runPoll<T>({ ...config, abort: abortManager });
    return {
        next: it.next,
        [Symbol.asyncIterator]: () => it,
        abort: () => abortManager.abort(),
    };
}

export function pollLatest<T>(config: PollConfig<T>): { get(): T | null } & Abortable {
    let latest: T | null = null;
    let error: Error | null = null;
    let complete = false;
    const it = poll<T>(config);
    (async () => {
        for await (const next of it) {
            if (next != null) {
                latest = next;
            }
        }
        console.log('COMPLETE');
        complete = true;
    })().catch(e => {
        console.error('E', e);
        error = e;
        complete = true;
    });
    return {
        get: () => {
            if (error != null) {
                throw error;
            }
            if (complete) {
                throw ABORT;
            }
            return latest;
        },
        abort: () => it.abort(),
    };
}
