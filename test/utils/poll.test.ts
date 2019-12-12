import { sleep } from '../../src/utils/async';
import { poll } from '../../src/utils/poll';
jest.mock('../../src/utils/async');

describe('poll', () => {
    it('completes tasks until aborted', async () => {
        const sleepMock = (sleep as any) as jest.MockInstance<any, any[]>;
        sleepMock.mockReturnValue(Promise.resolve());

        let invoked = 0;
        const p = poll({
            name: 'test',
            interval: 5000,
            waitAfterFailure: 100000,
            task: async () => {
                invoked++;
                return invoked;
            },
        });

        for await (const res of p) {
            expect(res).toBe(invoked);
            if (invoked > 2) {
                p.abort();
            }
        }

        expect(sleepMock.mock.calls.length).toBe(3);
        for (let idx = 0; idx < 3; idx++) {
            expect(sleepMock.mock.calls[idx][0]).toBeGreaterThan(4900);
            expect(sleepMock.mock.calls[idx][0]).toBeLessThanOrEqual(5000);
        }
    });

    it('aborts while executing task', async () => {
        const sleepMock = (sleep as any) as jest.MockInstance<any, any[]>;
        sleepMock.mockReturnValue(Promise.resolve());
        let invoked = 0;
        const p = poll({
            name: 'test',
            interval: 5000,
            waitAfterFailure: 100000,
            task: () => {
                invoked++;
                return invoked < 3
                    ? Promise.resolve(invoked)
                    : new Promise(() => {
                          /* never resolve */
                      });
            },
        });

        const it = p[Symbol.asyncIterator]();
        await expect(it.next()).resolves.toEqual({ done: false, value: 1 });
        await expect(it.next()).resolves.toEqual({ done: false, value: 2 });
        const nextPromise = it.next();
        p.abort();
        await expect(nextPromise).resolves.toEqual({ done: true, value: undefined });
    });
});

// const start = Date.now();
// let last = start;
// let i = 0;
// const poller = poll({
//     name: 'test',
//     interval: 5,
//     task: async () => {
//         const sinceLast = Date.now() - last;
//         expect(sinceLast).toBeGreaterThanOrEqual(5);
//         expect(sinceLast).toBeLessThan(20);
//         last = Date.now();
//         await sleep(3);
//         i++;
//         return i % 2 === 1 ? i : null;
//     },
//     waitAfterFailure: 1,
// });

// const results = [];
// for await (const result of poller) {
//     results.push(result);
//     if (result > 9) {
//         setTimeout(() => poller.abort(), 1);
//     }
// }

// expect(results.slice(0, 5)).toMatchInlineSnapshot(`
//     Array [
//       1,
//       3,
//       5,
//       7,
//       9,
//     ]
// `);

// expect(i).toBeGreaterThanOrEqual(10);
// expect(i).toBeLessThan(30);

// test('poll finite loop', async () => {
//     let i = 0;
//     const p = poll({
//         name: 'test',
//         interval: 1,
//         task: async () => {
//             i++;
//             return i;
//         },
//         waitAfterFailure: 1,
//     });

//     let j = 0;
//     let last = 0;
//     for await (const result of p) {
//         last = result;
//         if (j > 5) {
//             break;
//         }
//         j++;
//     }

//     expect(j).toBe(6);
//     expect(i).toBe(7);
//     expect(last).toBe(7);
// });

// test('poll retry', async () => {
//     const p = poll({
//         interval: 1,
//         waitAfterFailure: 25,
//         name: 'test',
//         task: async () => {},
//     });
// });

// test('pollLatest', async () => {
//     let i = 0;
//     const p = pollLatest({
//         name: 'test',
//         interval: 1,
//         task: async () => {
//             i++;
//             return i;
//         },
//         waitAfterFailure: 1,
//     });

//     expect(p.get()).toBeNull();
//     await sleep(2);
//     const next = p.get();
//     expect(next).toBeGreaterThan(1);

//     await sleep(5);
//     expect(p.get()).toBeGreaterThan(next as number);

//     p.abort();
//     await sleep(1);

//     expect(() => p.get()).toThrowErrorMatchingInlineSnapshot(`undefined`);
// });
