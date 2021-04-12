const fs = require('fs')
const WebSocket = require('ws')
const tracer = fs.readFileSync('./unigram-tracer-lastpush.js', { encoding: 'utf8' })

var data = []

function parseHex(h) {
    return parseInt(Number(h), 10)
}

async function main() {
    const blocks = {}
    const file = fs.createWriteStream('histogram.csv')
    const ws = new WebSocket('ws://127.0.0.1:9546', { maxPayload: 1000 * 1024 * 1024 })
    var subId
    ws.on('message', (ev) => {
        const msg = JSON.parse(ev)
        if (msg.id == 63) {
            console.log('subscribed', msg.result)
            subId = msg.result
        } else if (msg.method === 'eth_subscription' && msg.params.subscription === subId) {
            const block = msg.params.result
            blocks[parseHex(block.number)] = { gasUsed: parseHex(block.gasUsed) }
            //console.log('new block', block.hash)
            const payload = JSON.stringify({
                method: 'debug_traceBlockByNumber',
                params: [block.number, { tracer: tracer }],
                id: 67,
                jsonrpc: '2.0',
            })
            ws.send(payload)
        } else if (msg.id === 67) {
            var txId = 0
            var block = 0
            var blockData = Array.apply(null, Array(259)).map(function () { return 0 })
            //const block = msg.params.result
            for (const res of msg.result) {
                if (res.result === undefined) { console.log(res); continue }
                if (blockData[0] === 0 && res.result.block !== undefined) {
                    console.log('processing block', res.result.block)
                    blockData[0] = res.result.block
                    if (!blocks[blockData[0]]) {
                        throw new Error("Block info not found")
                    }
                    blockData[1] = blocks[blockData[0]].gasUsed
                }
                for (var i = 0; i < 257; i++) {
                    blockData[i+2] += res.result.hist[i]
                }
                txId++
            }
            file.write(blockData.join(',') + '\n')
        }
    })
    ws.on('error', (err) => {
        console.log('ws.error', err)
    })

    await new Promise(resolve => ws.once('open', resolve));

    const payload = JSON.stringify({
        method: 'eth_subscribe',
        params: ['newHeads'],
        id: 63,
        jsonrpc: '2.0',
    })
    ws.send(payload)
}

main().then().catch((err) => { throw err })
