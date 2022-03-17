const { Keyring } = require('@polkadot/keyring');
const { u8aToHex } = require('@polkadot/util');

/**
 * Send tx to Crust Network
 * @param {SubmittableExtrinsic} tx substrate-style tx
 * @param {string} seeds tx already been sent
 */
async function sendTx(tx, seeds) {
    console.log('⛓  Send tx to chain...');
    const krp = loadKeyringPair(seeds);

    return new Promise((resolve, reject) => {
        tx.signAndSend(krp, ({events = [], status}) => {
            console.log(
                `  ↪ 💸  Transaction status: ${status.type}, nonce: ${tx.nonce}`
            );

            if (
                status.isInvalid ||
                status.isDropped ||
                status.isUsurped ||
                status.isRetracted
            ) {
                reject(new Error('Invalid transaction'));
            } else {
                // Pass it
            }

            if (status.isInBlock) {
                events.forEach(({event: {method, section}}) => {
                if (section === 'system' && method === 'ExtrinsicFailed') {
                    // Error with no detail, just return error
                    console.error(`  ↪ ❌  Send transaction(${tx.type}) failed.`);
                    resolve(false);
                } else if (method === 'ExtrinsicSuccess') {
                    console.log(`  ↪ ✅  Send transaction(${tx.type}) success.`);
                    resolve(true);
                }
                });
            } else {
                // Pass it
            }
        }).catch(e => {
            reject(e);
        });
    });
}

/**
 * Load keyring pair with seeds
 * @param {string} seeds 
 */
function loadKeyringPair(seeds) {
    const kr = new Keyring({
        type: 'sr25519',
    });

    const krp = kr.addFromUri(seeds);
    return krp;
}

function loadAuth(seeds) {
    // 1. Construct auth header
    const keyring = new Keyring();
    const pair = keyring.addFromUri(seeds);

    // 2 get the signature of the addr
    const sigRaw = pair.sign(pair.address);
    const sig = u8aToHex(sigRaw);

    // 3 compile the sig to autHeader
    const authHeaderRaw = `sub-${pair.address}:${sig}`;
    return Buffer.from(authHeaderRaw).toString('base64');
}

module.exports = {
    sendTx,
    loadAuth
}