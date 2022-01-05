polcaLib = (function () {
    const dict = {
        version: "0.9",

        // imports from Math
        'abs ||' : Math.abs, 'sign ±': Math.sign,
        exp: Math.exp,
        'floor ⌋': Math.floor, 'ceil ⌉': Math.ceil,
        'pow ^': Math.pow,
        'min ⌊': Math.min, 'max ⌈': Math.max,
        rand: Math.random,
        ln: Math.log,
        'pi π': Math.PI, 'tau τ': Math.PI * 2,
        e: Math.E,

        // various mathematical
        'rt': (a, b) => Math.pow(a, 1 / b),

        log: (x, base) => Math.log(x) / Math.log(base),
        l10: x => Math.log(x) / Math.LN10, l2: x => Math.log(x) / Math.LN2,

        'inc ++': x => x + 1, 'dec --': x => x - 1,
        '_': x => -x,
        div: (x, y) => (x - x % y) / y,

        // Forth stack operations
        'drop Đ': a => {}, '2drop 2Đ': (a, b) => {},
        'dup |\\': a => [a, a], '2dup 2|\\': (a, b) => [a, b, a, b],
        'swap ><': (a, b) => [b, a], '2swap >><<': (a,b,c,d) => [c, d, a ,b],
        'rot ><<': (a, b, c) => [b, c, a], '-rot >><': (a, b, c) => [c, a, b],
        'over': (a, b) => [a, b, a], 'tuck': (a, b) => [b, a, b],
        'nip': (a, b) => [b],

        // various stack operations
        'pick @>': function (from) {return this.stack.ary[
            from < 0 ? this.stack.ary.length + from : from
        ];},

        'dropall ;': function () {
            this.stack.dropAll();
        },

        // others
        'exec !'(arg) {
            if (arg.type == 'Function')
                return arg.call(this)
            else if (arg instanceof Polca.SubStack) {
                const param = this.stack.ary.pop ()
                const {ary} = arg
                return ary [param < 0 ? ary.length + param : param]
            } else throw '"!" only works on arrays and functions'
        },

        'typeof': (v) => v.type,

        'set :': function (value, name) {
            this.scope.set(name, value);
        },

        'get .': function (name) {
            return this.scope.get(name);
        },

        info: function (str) {
            this.info.push(str);
        },

        'times ?': function (proc, number) {
            for (; number > 0; number--) {
                proc.call(this);
            }
        },
        
        '?else': function (proc, else_, number) {
            if (number > 0)
                for (; number > 0; number--) {
                    proc.call(this);
                }
            else if (number <= 0)
                for (; number <= 0; number++) {
                    else_.call(this);
                }
        },

        timesI: function (proc, number) {
            for (; number > 0; number--) {
                this.stack.push(number);
                proc.call(this);
            }
        },

        'length #': function (obj) {
            if (obj instanceof String) {
                return obj.length;
            }
            if (obj instanceof Polca.SubStack) {
                return obj.ary.length;
            }
            throw new Error ("length is not implemented for this type");
        },

        forLength: function (proc, rest) {
            while (this.stack.ary.length > rest) {
                proc.call(this);
            }
        },

        number: function (x) {
            return Number(x)
        },

        /* Based on JavaCalc 1.6  ©1996-2000 Ken Kikuchi { */
        factorial: function (n) { /* factorial */
            switch (true) {
                case n < 0:                     /* if negative */
                    return polcaLib.gamma(n + 1);
                case n === 0 || n === 1:
                    return 1;
                case polcaLib.abs(n) - polcaLib.floor(polcaLib.abs(n)) === 0: /* if positive integer */
                    return n * polcaLib.factorial(n - 1);
                default:                      /* if non-integer */
                    return polcaLib.gamma(n + 1);
            }
        },

        'gamma γ': function (x) {
            if (x <= 0) {
                if (polcaLib.abs(x) - polcaLib.floor(polcaLib.abs(x)) === 0)
                    throw "Complex Infinity";
                else return polcaLib.PI /
                    (polcaLib.sin(polcaLib.PI * x) * polcaLib.exp(polcaLib.loggamma(1 - x)));
            }
            else
                return polcaLib.exp(polcaLib.loggamma(x));
        },

        loggamma: function (x) { /* log gamma */
            var v = 1, w;
            while (x < 8) {
                v *= x;
                x++
            }
            w = 1 / (x * x);
            return (((((((
                                            (-3617 / 122400) * w + 7 / 1092
                                        ) * w - 691 / 360360
                                    ) * w + 5 / 5940
                                ) * w - 1 / 1680
                            ) * w + 1 / 1260
                        ) * w - 1 / 360
                    ) * w + 1 / 12
                ) / x + 0.5 * polcaLib.ln(2 * polcaLib.PI) - polcaLib.ln(v) - x + (x - 0.5) * polcaLib.ln(x);
        },
        /* } Based on JavaCalc 1.6  ©1996-2000 Ken Kikuchi */

        'cat , 😺': function (a, b) {
            if (a.type === b.type && a.cat) {
                return a.cat(b);
            }
            else {
                throw new Error("Type Error: can only concatenate two functions or substacks");
            }
        },

        'compare <>': (a, b) => a < b ? -1 : a > b ? 1 : 0,

        // substack operations
        'push |<': function (value, substack) {
            if (!(substack instanceof Polca.SubStack)) throw new Error ("push is not implemented for this type");

            return substack.libPush(value);
        },

        'pop |>': function (substack) {
            if (!(substack instanceof Polca.SubStack)) throw new Error ("pop is not implemented for this type");

            return substack.libPop();
        },
        'unshift >|' (value, substack) {
            if (!(substack instanceof Polca.SubStack)) throw new Error ("push is not implemented for this type");

            return substack.unshift(value);
        },
        'shift <|' (substack) {
            if (!(substack instanceof Polca.SubStack)) throw new Error ("pop is not implemented for this type");

            return substack.shift();
        },

        dissolve: function (substack) {
            if (!(substack instanceof Polca.SubStack)) throw new Error ("dissolve is not implemented for this type");

            return substack.ary;
        },

        /**
         * @param {Polca.Structures.Func} callback
         * @param {Polca.SubStack} substack
         */
        execIn: function (callback, substack) {
            if (!(callback instanceof Polca.Structures.CustomFunc)) throw new Error ("execIn is not implemented for this type");
            if (!(substack instanceof Polca.SubStack)) throw new Error ("execIn is not implemented for this type");

            var execStack = substack.fork();
            callback.call(new Polca.Context (this.scope, execStack, this.info));
            return execStack;
        }
    };

    const polcaLib = {}

    for (const name in dict ) {
        name.split (' ').forEach (symbol => polcaLib[symbol] = dict[name])
    }

    Number.prototype.type = 'number';
    String.prototype.type = 'string';
    Function.prototype.type = 'procedure';

    // Push operator methods to polcaLib module
    ['+', '-', '*', '/', '%', '&', '|'].forEach(function (op) {
        polcaLib[op] = new Function ('a,b', 'return a' + op + 'b');
    });

    // Same for comparisons
    ['<', '<=', '>=', '>', '!='].forEach(function (op) {
        polcaLib[op] = new Function ('a,b', 'return polcaLib.compare(a, b)' + op + '0');
    });
    polcaLib["="] = function (a,b) {
        return Number(polcaLib.compare(a, b) === 0);
    };

    const synonym = (syn, meaning) =>
        [syn].flat ().forEach (
            symbol => polcaLib[symbol] = polcaLib[meaning] || meaning
        )

    // Unicode symbols
    synonym ('≠', '!=');
    synonym ('≤', '<=');
    synonym ('≥', '>=');

    return polcaLib;
}());
