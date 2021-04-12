{
    // hist is the map of opcodes to counters
    // last one is PUSH1(0)
    hist: Array.apply(null, Array(257)).map(function () { return 0; }),
    lastPush: null,
    err: null,
    // nops counts number of ops
    nops: 0,
    // step is invoked for every opcode that the VM executes.
    step: function(log, db) {
        var pc = log.getPC()
        // Immediately after PUSH1 top of stack
        // contains the push immediate
        if (this.lastPush) {
            if (pc !== this.lastPush + 2) {
                throw new Error("Last push is invalid. Current pc " + pc + " last push " + this.lastPush)
            }
            var immediate = log.stack.peek(0)
            if (immediate == 0) {
                this.hist[256]++
            }
            this.lastPush = null
        }
        if (log.op.toString() === 'PUSH1') {
            this.lastPush = pc
        }
        var op = log.op.toNumber()
        this.hist[op]++
        this.nops++;
    },
    // fault is invoked when the actual execution of an opcode fails.
    fault: function(log, db) {
        this.err = log.getError()
    },

    // result is invoked when all the opcodes have been iterated over and returns
    // the final result of the tracing.
    result: function(ctx) {
        return { block: ctx.block, hist: this.hist, err: this.err, typ: ctx.type };
    },
}
