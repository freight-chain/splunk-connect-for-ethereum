import { parseSignature, computeSignature } from '../src/abi/signature';
import readline from 'readline';
import { createReadStream } from 'fs-extra';
import { join } from 'path';

test('parseSignature', async () => {
    const rl = readline.createInterface(createReadStream(join(__dirname, '../data/function_signatures.txt')));

    for await (const line of rl) {
        try {
            const parsed = parseSignature(line, 'function');
            expect(computeSignature(parsed)).toEqual(line);
        } catch (e) {
            console.log('Failed to parse', line, e.message);
        }
    }

    // expect(parseSignature('Hello(uint256)', 'function')).toMatchInlineSnapshot(`
    //     Object {
    //       "inputs": Array [
    //         Object {
    //           "components": undefined,
    //           "type": "uint256",
    //         },
    //       ],
    //       "name": "Hello",
    //       "type": "function",
    //     }
    // `);

    // expect(parseSignature('batchCancelOrders(address[5])', 'function')).toMatchInlineSnapshot(`
    //     Object {
    //       "inputs": Array [
    //         Object {
    //           "components": undefined,
    //           "type": "address[5]",
    //         },
    //       ],
    //       "name": "batchCancelOrders",
    //       "type": "function",
    //     }
    // `);
});
