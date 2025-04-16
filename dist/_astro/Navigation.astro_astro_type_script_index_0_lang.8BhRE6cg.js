function Se(B) {
  return B && B.__esModule && Object.prototype.hasOwnProperty.call(B, "default")
    ? B.default
    : B;
}
var pe = { exports: {} },
  me = { exports: {} },
  H = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ge;
function xe() {
  if (ge) return H;
  ge = 1;
  var B = Symbol.for("react.element"),
    $ = Symbol.for("react.portal"),
    Y = Symbol.for("react.fragment"),
    q = Symbol.for("react.strict_mode"),
    U = Symbol.for("react.profiler"),
    V = Symbol.for("react.provider"),
    z = Symbol.for("react.context"),
    t = Symbol.for("react.forward_ref"),
    s = Symbol.for("react.suspense"),
    e = Symbol.for("react.memo"),
    r = Symbol.for("react.lazy"),
    l = Symbol.iterator;
  function c(a) {
    return a === null || typeof a != "object"
      ? null
      : ((a = (l && a[l]) || a["@@iterator"]),
        typeof a == "function" ? a : null);
  }
  var n = {
      isMounted: function () {
        return !1;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    },
    p = Object.assign,
    f = {};
  function v(a, i, E) {
    (this.props = a),
      (this.context = i),
      (this.refs = f),
      (this.updater = E || n);
  }
  (v.prototype.isReactComponent = {}),
    (v.prototype.setState = function (a, i) {
      if (typeof a != "object" && typeof a != "function" && a != null)
        throw Error(
          "setState(...): takes an object of state variables to update or a function which returns an object of state variables.",
        );
      this.updater.enqueueSetState(this, a, i, "setState");
    }),
    (v.prototype.forceUpdate = function (a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    });
  function g() {}
  g.prototype = v.prototype;
  function m(a, i, E) {
    (this.props = a),
      (this.context = i),
      (this.refs = f),
      (this.updater = E || n);
  }
  var y = (m.prototype = new g());
  (y.constructor = m), p(y, v.prototype), (y.isPureReactComponent = !0);
  var w = Array.isArray,
    T = Object.prototype.hasOwnProperty,
    S = { current: null },
    A = { key: !0, ref: !0, __self: !0, __source: !0 };
  function L(a, i, E) {
    var u,
      P = {},
      d = null,
      j = null;
    if (i != null)
      for (u in (i.ref !== void 0 && (j = i.ref),
      i.key !== void 0 && (d = "" + i.key),
      i))
        T.call(i, u) && !A.hasOwnProperty(u) && (P[u] = i[u]);
    var R = arguments.length - 2;
    if (R === 1) P.children = E;
    else if (1 < R) {
      for (var D = Array(R), F = 0; F < R; F++) D[F] = arguments[F + 2];
      P.children = D;
    }
    if (a && a.defaultProps)
      for (u in ((R = a.defaultProps), R)) P[u] === void 0 && (P[u] = R[u]);
    return {
      $$typeof: B,
      type: a,
      key: d,
      ref: j,
      props: P,
      _owner: S.current,
    };
  }
  function k(a, i) {
    return {
      $$typeof: B,
      type: a.type,
      key: i,
      ref: a.ref,
      props: a.props,
      _owner: a._owner,
    };
  }
  function M(a) {
    return typeof a == "object" && a !== null && a.$$typeof === B;
  }
  function O(a) {
    var i = { "=": "=0", ":": "=2" };
    return (
      "$" +
      a.replace(/[=:]/g, function (E) {
        return i[E];
      })
    );
  }
  var b = /\/+/g;
  function I(a, i) {
    return typeof a == "object" && a !== null && a.key != null
      ? O("" + a.key)
      : i.toString(36);
  }
  function Q(a, i, E, u, P) {
    var d = typeof a;
    (d === "undefined" || d === "boolean") && (a = null);
    var j = !1;
    if (a === null) j = !0;
    else
      switch (d) {
        case "string":
        case "number":
          j = !0;
          break;
        case "object":
          switch (a.$$typeof) {
            case B:
            case $:
              j = !0;
          }
      }
    if (j)
      return (
        (j = a),
        (P = P(j)),
        (a = u === "" ? "." + I(j, 0) : u),
        w(P)
          ? ((E = ""),
            a != null && (E = a.replace(b, "$&/") + "/"),
            Q(P, i, E, "", function (F) {
              return F;
            }))
          : P != null &&
            (M(P) &&
              (P = k(
                P,
                E +
                  (!P.key || (j && j.key === P.key)
                    ? ""
                    : ("" + P.key).replace(b, "$&/") + "/") +
                  a,
              )),
            i.push(P)),
        1
      );
    if (((j = 0), (u = u === "" ? "." : u + ":"), w(a)))
      for (var R = 0; R < a.length; R++) {
        d = a[R];
        var D = u + I(d, R);
        j += Q(d, i, E, D, P);
      }
    else if (((D = c(a)), typeof D == "function"))
      for (a = D.call(a), R = 0; !(d = a.next()).done; )
        (d = d.value), (D = u + I(d, R++)), (j += Q(d, i, E, D, P));
    else if (d === "object")
      throw (
        ((i = String(a)),
        Error(
          "Objects are not valid as a React child (found: " +
            (i === "[object Object]"
              ? "object with keys {" + Object.keys(a).join(", ") + "}"
              : i) +
            "). If you meant to render a collection of children, use an array instead.",
        ))
      );
    return j;
  }
  function _(a, i, E) {
    if (a == null) return a;
    var u = [],
      P = 0;
    return (
      Q(a, u, "", "", function (d) {
        return i.call(E, d, P++);
      }),
      u
    );
  }
  function h(a) {
    if (a._status === -1) {
      var i = a._result;
      (i = i()),
        i.then(
          function (E) {
            (a._status === 0 || a._status === -1) &&
              ((a._status = 1), (a._result = E));
          },
          function (E) {
            (a._status === 0 || a._status === -1) &&
              ((a._status = 2), (a._result = E));
          },
        ),
        a._status === -1 && ((a._status = 0), (a._result = i));
    }
    if (a._status === 1) return a._result.default;
    throw a._result;
  }
  var x = { current: null },
    N = { transition: null },
    C = {
      ReactCurrentDispatcher: x,
      ReactCurrentBatchConfig: N,
      ReactCurrentOwner: S,
    };
  function o() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return (
    (H.Children = {
      map: _,
      forEach: function (a, i, E) {
        _(
          a,
          function () {
            i.apply(this, arguments);
          },
          E,
        );
      },
      count: function (a) {
        var i = 0;
        return (
          _(a, function () {
            i++;
          }),
          i
        );
      },
      toArray: function (a) {
        return (
          _(a, function (i) {
            return i;
          }) || []
        );
      },
      only: function (a) {
        if (!M(a))
          throw Error(
            "React.Children.only expected to receive a single React element child.",
          );
        return a;
      },
    }),
    (H.Component = v),
    (H.Fragment = Y),
    (H.Profiler = U),
    (H.PureComponent = m),
    (H.StrictMode = q),
    (H.Suspense = s),
    (H.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = C),
    (H.act = o),
    (H.cloneElement = function (a, i, E) {
      if (a == null)
        throw Error(
          "React.cloneElement(...): The argument must be a React element, but you passed " +
            a +
            ".",
        );
      var u = p({}, a.props),
        P = a.key,
        d = a.ref,
        j = a._owner;
      if (i != null) {
        if (
          (i.ref !== void 0 && ((d = i.ref), (j = S.current)),
          i.key !== void 0 && (P = "" + i.key),
          a.type && a.type.defaultProps)
        )
          var R = a.type.defaultProps;
        for (D in i)
          T.call(i, D) &&
            !A.hasOwnProperty(D) &&
            (u[D] = i[D] === void 0 && R !== void 0 ? R[D] : i[D]);
      }
      var D = arguments.length - 2;
      if (D === 1) u.children = E;
      else if (1 < D) {
        R = Array(D);
        for (var F = 0; F < D; F++) R[F] = arguments[F + 2];
        u.children = R;
      }
      return { $$typeof: B, type: a.type, key: P, ref: d, props: u, _owner: j };
    }),
    (H.createContext = function (a) {
      return (
        (a = {
          $$typeof: z,
          _currentValue: a,
          _currentValue2: a,
          _threadCount: 0,
          Provider: null,
          Consumer: null,
          _defaultValue: null,
          _globalName: null,
        }),
        (a.Provider = { $$typeof: V, _context: a }),
        (a.Consumer = a)
      );
    }),
    (H.createElement = L),
    (H.createFactory = function (a) {
      var i = L.bind(null, a);
      return (i.type = a), i;
    }),
    (H.createRef = function () {
      return { current: null };
    }),
    (H.forwardRef = function (a) {
      return { $$typeof: t, render: a };
    }),
    (H.isValidElement = M),
    (H.lazy = function (a) {
      return { $$typeof: r, _payload: { _status: -1, _result: a }, _init: h };
    }),
    (H.memo = function (a, i) {
      return { $$typeof: e, type: a, compare: i === void 0 ? null : i };
    }),
    (H.startTransition = function (a) {
      var i = N.transition;
      N.transition = {};
      try {
        a();
      } finally {
        N.transition = i;
      }
    }),
    (H.unstable_act = o),
    (H.useCallback = function (a, i) {
      return x.current.useCallback(a, i);
    }),
    (H.useContext = function (a) {
      return x.current.useContext(a);
    }),
    (H.useDebugValue = function () {}),
    (H.useDeferredValue = function (a) {
      return x.current.useDeferredValue(a);
    }),
    (H.useEffect = function (a, i) {
      return x.current.useEffect(a, i);
    }),
    (H.useId = function () {
      return x.current.useId();
    }),
    (H.useImperativeHandle = function (a, i, E) {
      return x.current.useImperativeHandle(a, i, E);
    }),
    (H.useInsertionEffect = function (a, i) {
      return x.current.useInsertionEffect(a, i);
    }),
    (H.useLayoutEffect = function (a, i) {
      return x.current.useLayoutEffect(a, i);
    }),
    (H.useMemo = function (a, i) {
      return x.current.useMemo(a, i);
    }),
    (H.useReducer = function (a, i, E) {
      return x.current.useReducer(a, i, E);
    }),
    (H.useRef = function (a) {
      return x.current.useRef(a);
    }),
    (H.useState = function (a) {
      return x.current.useState(a);
    }),
    (H.useSyncExternalStore = function (a, i, E) {
      return x.current.useSyncExternalStore(a, i, E);
    }),
    (H.useTransition = function () {
      return x.current.useTransition();
    }),
    (H.version = "18.3.1"),
    H
  );
}
var be;
function Oe() {
  return be || ((be = 1), (me.exports = xe())), me.exports;
}
var je = pe.exports,
  we;
function Ae() {
  return (
    we ||
      ((we = 1),
      (function (B, $) {
        (function (Y, q) {
          B.exports = q(Oe());
        })(typeof self < "u" ? self : je, (Y) =>
          (() => {
            var q = {
                7403: (t, s, e) => {
                  e.d(s, { default: () => N });
                  var r = e(4087),
                    l = e.n(r);
                  const c = function (C) {
                      return new RegExp(/<[a-z][\s\S]*>/i).test(C);
                    },
                    n = function (C, o) {
                      return Math.floor(Math.random() * (o - C + 1)) + C;
                    };
                  var p = "TYPE_CHARACTER",
                    f = "REMOVE_CHARACTER",
                    v = "REMOVE_ALL",
                    g = "REMOVE_LAST_VISIBLE_NODE",
                    m = "PAUSE_FOR",
                    y = "CALL_FUNCTION",
                    w = "ADD_HTML_TAG_ELEMENT",
                    T = "CHANGE_DELETE_SPEED",
                    S = "CHANGE_DELAY",
                    A = "CHANGE_CURSOR",
                    L = "PASTE_STRING",
                    k = "HTML_TAG";
                  function M(C) {
                    return (
                      (M =
                        typeof Symbol == "function" &&
                        typeof Symbol.iterator == "symbol"
                          ? function (o) {
                              return typeof o;
                            }
                          : function (o) {
                              return o &&
                                typeof Symbol == "function" &&
                                o.constructor === Symbol &&
                                o !== Symbol.prototype
                                ? "symbol"
                                : typeof o;
                            }),
                      M(C)
                    );
                  }
                  function O(C, o) {
                    var a = Object.keys(C);
                    if (Object.getOwnPropertySymbols) {
                      var i = Object.getOwnPropertySymbols(C);
                      o &&
                        (i = i.filter(function (E) {
                          return Object.getOwnPropertyDescriptor(C, E)
                            .enumerable;
                        })),
                        a.push.apply(a, i);
                    }
                    return a;
                  }
                  function b(C) {
                    for (var o = 1; o < arguments.length; o++) {
                      var a = arguments[o] != null ? arguments[o] : {};
                      o % 2
                        ? O(Object(a), !0).forEach(function (i) {
                            h(C, i, a[i]);
                          })
                        : Object.getOwnPropertyDescriptors
                          ? Object.defineProperties(
                              C,
                              Object.getOwnPropertyDescriptors(a),
                            )
                          : O(Object(a)).forEach(function (i) {
                              Object.defineProperty(
                                C,
                                i,
                                Object.getOwnPropertyDescriptor(a, i),
                              );
                            });
                    }
                    return C;
                  }
                  function I(C) {
                    return (
                      (function (o) {
                        if (Array.isArray(o)) return Q(o);
                      })(C) ||
                      (function (o) {
                        if (
                          (typeof Symbol < "u" && o[Symbol.iterator] != null) ||
                          o["@@iterator"] != null
                        )
                          return Array.from(o);
                      })(C) ||
                      (function (o, a) {
                        if (o) {
                          if (typeof o == "string") return Q(o, a);
                          var i = Object.prototype.toString
                            .call(o)
                            .slice(8, -1);
                          return (
                            i === "Object" &&
                              o.constructor &&
                              (i = o.constructor.name),
                            i === "Map" || i === "Set"
                              ? Array.from(o)
                              : i === "Arguments" ||
                                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(
                                    i,
                                  )
                                ? Q(o, a)
                                : void 0
                          );
                        }
                      })(C) ||
                      (function () {
                        throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
                      })()
                    );
                  }
                  function Q(C, o) {
                    (o == null || o > C.length) && (o = C.length);
                    for (var a = 0, i = new Array(o); a < o; a++) i[a] = C[a];
                    return i;
                  }
                  function _(C, o) {
                    for (var a = 0; a < o.length; a++) {
                      var i = o[a];
                      (i.enumerable = i.enumerable || !1),
                        (i.configurable = !0),
                        "value" in i && (i.writable = !0),
                        Object.defineProperty(C, x(i.key), i);
                    }
                  }
                  function h(C, o, a) {
                    return (
                      (o = x(o)) in C
                        ? Object.defineProperty(C, o, {
                            value: a,
                            enumerable: !0,
                            configurable: !0,
                            writable: !0,
                          })
                        : (C[o] = a),
                      C
                    );
                  }
                  function x(C) {
                    var o = (function (a, i) {
                      if (M(a) !== "object" || a === null) return a;
                      var E = a[Symbol.toPrimitive];
                      if (E !== void 0) {
                        var u = E.call(a, "string");
                        if (M(u) !== "object") return u;
                        throw new TypeError(
                          "@@toPrimitive must return a primitive value.",
                        );
                      }
                      return String(a);
                    })(C);
                    return M(o) === "symbol" ? o : String(o);
                  }
                  const N = (function () {
                    function C(i, E) {
                      var u = this;
                      if (
                        ((function (d, j) {
                          if (!(d instanceof j))
                            throw new TypeError(
                              "Cannot call a class as a function",
                            );
                        })(this, C),
                        h(this, "state", {
                          cursorAnimation: null,
                          lastFrameTime: null,
                          pauseUntil: null,
                          eventQueue: [],
                          eventLoop: null,
                          eventLoopPaused: !1,
                          reverseCalledEvents: [],
                          calledEvents: [],
                          visibleNodes: [],
                          initialOptions: null,
                          elements: {
                            container: null,
                            wrapper: document.createElement("span"),
                            cursor: document.createElement("span"),
                          },
                        }),
                        h(this, "options", {
                          strings: null,
                          cursor: "|",
                          delay: "natural",
                          pauseFor: 1500,
                          deleteSpeed: "natural",
                          loop: !1,
                          autoStart: !1,
                          devMode: !1,
                          skipAddStyles: !1,
                          wrapperClassName: "Typewriter__wrapper",
                          cursorClassName: "Typewriter__cursor",
                          stringSplitter: null,
                          onCreateTextNode: null,
                          onRemoveNode: null,
                        }),
                        h(this, "setupWrapperElement", function () {
                          u.state.elements.container &&
                            ((u.state.elements.wrapper.className =
                              u.options.wrapperClassName),
                            (u.state.elements.cursor.className =
                              u.options.cursorClassName),
                            (u.state.elements.cursor.innerHTML =
                              u.options.cursor),
                            (u.state.elements.container.innerHTML = ""),
                            u.state.elements.container.appendChild(
                              u.state.elements.wrapper,
                            ),
                            u.state.elements.container.appendChild(
                              u.state.elements.cursor,
                            ));
                        }),
                        h(this, "start", function () {
                          return (
                            (u.state.eventLoopPaused = !1), u.runEventLoop(), u
                          );
                        }),
                        h(this, "pause", function () {
                          return (u.state.eventLoopPaused = !0), u;
                        }),
                        h(this, "stop", function () {
                          return (
                            u.state.eventLoop &&
                              ((0, r.cancel)(u.state.eventLoop),
                              (u.state.eventLoop = null)),
                            u
                          );
                        }),
                        h(this, "pauseFor", function (d) {
                          return u.addEventToQueue(m, { ms: d }), u;
                        }),
                        h(this, "typeOutAllStrings", function () {
                          return typeof u.options.strings == "string"
                            ? (u
                                .typeString(u.options.strings)
                                .pauseFor(u.options.pauseFor),
                              u)
                            : (u.options.strings.forEach(function (d) {
                                u.typeString(d)
                                  .pauseFor(u.options.pauseFor)
                                  .deleteAll(u.options.deleteSpeed);
                              }),
                              u);
                        }),
                        h(this, "typeString", function (d) {
                          var j =
                            arguments.length > 1 && arguments[1] !== void 0
                              ? arguments[1]
                              : null;
                          if (c(d)) return u.typeOutHTMLString(d, j);
                          if (d) {
                            var R = (u.options || {}).stringSplitter,
                              D = typeof R == "function" ? R(d) : d.split("");
                            u.typeCharacters(D, j);
                          }
                          return u;
                        }),
                        h(this, "pasteString", function (d) {
                          var j =
                            arguments.length > 1 && arguments[1] !== void 0
                              ? arguments[1]
                              : null;
                          return c(d)
                            ? u.typeOutHTMLString(d, j, !0)
                            : (d &&
                                u.addEventToQueue(L, { character: d, node: j }),
                              u);
                        }),
                        h(this, "typeOutHTMLString", function (d) {
                          var j =
                              arguments.length > 1 && arguments[1] !== void 0
                                ? arguments[1]
                                : null,
                            R = arguments.length > 2 ? arguments[2] : void 0,
                            D = (function (Z) {
                              var J = document.createElement("div");
                              return (J.innerHTML = Z), J.childNodes;
                            })(d);
                          if (D.length > 0)
                            for (var F = 0; F < D.length; F++) {
                              var W = D[F],
                                G = W.innerHTML;
                              W && W.nodeType !== 3
                                ? ((W.innerHTML = ""),
                                  u.addEventToQueue(w, {
                                    node: W,
                                    parentNode: j,
                                  }),
                                  R ? u.pasteString(G, W) : u.typeString(G, W))
                                : W.textContent &&
                                  (R
                                    ? u.pasteString(W.textContent, j)
                                    : u.typeString(W.textContent, j));
                            }
                          return u;
                        }),
                        h(this, "deleteAll", function () {
                          var d =
                            arguments.length > 0 && arguments[0] !== void 0
                              ? arguments[0]
                              : "natural";
                          return u.addEventToQueue(v, { speed: d }), u;
                        }),
                        h(this, "changeDeleteSpeed", function (d) {
                          if (!d)
                            throw new Error("Must provide new delete speed");
                          return u.addEventToQueue(T, { speed: d }), u;
                        }),
                        h(this, "changeDelay", function (d) {
                          if (!d) throw new Error("Must provide new delay");
                          return u.addEventToQueue(S, { delay: d }), u;
                        }),
                        h(this, "changeCursor", function (d) {
                          if (!d) throw new Error("Must provide new cursor");
                          return u.addEventToQueue(A, { cursor: d }), u;
                        }),
                        h(this, "deleteChars", function (d) {
                          if (!d)
                            throw new Error(
                              "Must provide amount of characters to delete",
                            );
                          for (var j = 0; j < d; j++) u.addEventToQueue(f);
                          return u;
                        }),
                        h(this, "callFunction", function (d, j) {
                          if (!d || typeof d != "function")
                            throw new Error("Callback must be a function");
                          return u.addEventToQueue(y, { cb: d, thisArg: j }), u;
                        }),
                        h(this, "typeCharacters", function (d) {
                          var j =
                            arguments.length > 1 && arguments[1] !== void 0
                              ? arguments[1]
                              : null;
                          if (!d || !Array.isArray(d))
                            throw new Error("Characters must be an array");
                          return (
                            d.forEach(function (R) {
                              u.addEventToQueue(p, { character: R, node: j });
                            }),
                            u
                          );
                        }),
                        h(this, "removeCharacters", function (d) {
                          if (!d || !Array.isArray(d))
                            throw new Error("Characters must be an array");
                          return (
                            d.forEach(function () {
                              u.addEventToQueue(f);
                            }),
                            u
                          );
                        }),
                        h(this, "addEventToQueue", function (d, j) {
                          var R =
                            arguments.length > 2 &&
                            arguments[2] !== void 0 &&
                            arguments[2];
                          return u.addEventToStateProperty(
                            d,
                            j,
                            R,
                            "eventQueue",
                          );
                        }),
                        h(this, "addReverseCalledEvent", function (d, j) {
                          var R =
                            arguments.length > 2 &&
                            arguments[2] !== void 0 &&
                            arguments[2];
                          return u.options.loop
                            ? u.addEventToStateProperty(
                                d,
                                j,
                                R,
                                "reverseCalledEvents",
                              )
                            : u;
                        }),
                        h(this, "addEventToStateProperty", function (d, j) {
                          var R =
                              arguments.length > 2 &&
                              arguments[2] !== void 0 &&
                              arguments[2],
                            D = arguments.length > 3 ? arguments[3] : void 0,
                            F = { eventName: d, eventArgs: j || {} };
                          return (
                            (u.state[D] = R
                              ? [F].concat(I(u.state[D]))
                              : [].concat(I(u.state[D]), [F])),
                            u
                          );
                        }),
                        h(this, "runEventLoop", function () {
                          u.state.lastFrameTime ||
                            (u.state.lastFrameTime = Date.now());
                          var d = Date.now(),
                            j = d - u.state.lastFrameTime;
                          if (!u.state.eventQueue.length) {
                            if (!u.options.loop) return;
                            (u.state.eventQueue = I(u.state.calledEvents)),
                              (u.state.calledEvents = []),
                              (u.options = b({}, u.state.initialOptions));
                          }
                          if (
                            ((u.state.eventLoop = l()(u.runEventLoop)),
                            !u.state.eventLoopPaused)
                          ) {
                            if (u.state.pauseUntil) {
                              if (d < u.state.pauseUntil) return;
                              u.state.pauseUntil = null;
                            }
                            var R,
                              D = I(u.state.eventQueue),
                              F = D.shift();
                            if (
                              !(
                                j <=
                                (R =
                                  F.eventName === g || F.eventName === f
                                    ? u.options.deleteSpeed === "natural"
                                      ? n(40, 80)
                                      : u.options.deleteSpeed
                                    : u.options.delay === "natural"
                                      ? n(120, 160)
                                      : u.options.delay)
                              )
                            ) {
                              var W = F.eventName,
                                G = F.eventArgs;
                              switch (
                                (u.logInDevMode({
                                  currentEvent: F,
                                  state: u.state,
                                  delay: R,
                                }),
                                W)
                              ) {
                                case L:
                                case p:
                                  var Z = G.character,
                                    J = G.node,
                                    ie = document.createTextNode(Z),
                                    ee = ie;
                                  u.options.onCreateTextNode &&
                                    typeof u.options.onCreateTextNode ==
                                      "function" &&
                                    (ee = u.options.onCreateTextNode(Z, ie)),
                                    ee &&
                                      (J
                                        ? J.appendChild(ee)
                                        : u.state.elements.wrapper.appendChild(
                                            ee,
                                          )),
                                    (u.state.visibleNodes = [].concat(
                                      I(u.state.visibleNodes),
                                      [
                                        {
                                          type: "TEXT_NODE",
                                          character: Z,
                                          node: ee,
                                        },
                                      ],
                                    ));
                                  break;
                                case f:
                                  D.unshift({
                                    eventName: g,
                                    eventArgs: { removingCharacterNode: !0 },
                                  });
                                  break;
                                case m:
                                  var ue = F.eventArgs.ms;
                                  u.state.pauseUntil =
                                    Date.now() + parseInt(ue);
                                  break;
                                case y:
                                  var te = F.eventArgs,
                                    ae = te.cb,
                                    de = te.thisArg;
                                  ae.call(de, { elements: u.state.elements });
                                  break;
                                case w:
                                  var re = F.eventArgs,
                                    X = re.node,
                                    ne = re.parentNode;
                                  ne
                                    ? ne.appendChild(X)
                                    : u.state.elements.wrapper.appendChild(X),
                                    (u.state.visibleNodes = [].concat(
                                      I(u.state.visibleNodes),
                                      [
                                        {
                                          type: k,
                                          node: X,
                                          parentNode:
                                            ne || u.state.elements.wrapper,
                                        },
                                      ],
                                    ));
                                  break;
                                case v:
                                  var ve = u.state.visibleNodes,
                                    se = G.speed,
                                    K = [];
                                  se &&
                                    K.push({
                                      eventName: T,
                                      eventArgs: { speed: se, temp: !0 },
                                    });
                                  for (
                                    var ce = 0, oe = ve.length;
                                    ce < oe;
                                    ce++
                                  )
                                    K.push({
                                      eventName: g,
                                      eventArgs: { removingCharacterNode: !1 },
                                    });
                                  se &&
                                    K.push({
                                      eventName: T,
                                      eventArgs: {
                                        speed: u.options.deleteSpeed,
                                        temp: !0,
                                      },
                                    }),
                                    D.unshift.apply(D, K);
                                  break;
                                case g:
                                  var he = F.eventArgs.removingCharacterNode;
                                  if (u.state.visibleNodes.length) {
                                    var ye = u.state.visibleNodes.pop(),
                                      Ee = ye.type,
                                      le = ye.node,
                                      Te = ye.character;
                                    u.options.onRemoveNode &&
                                      typeof u.options.onRemoveNode ==
                                        "function" &&
                                      u.options.onRemoveNode({
                                        node: le,
                                        character: Te,
                                      }),
                                      le && le.parentNode.removeChild(le),
                                      Ee === k &&
                                        he &&
                                        D.unshift({
                                          eventName: g,
                                          eventArgs: {},
                                        });
                                  }
                                  break;
                                case T:
                                  u.options.deleteSpeed = F.eventArgs.speed;
                                  break;
                                case S:
                                  u.options.delay = F.eventArgs.delay;
                                  break;
                                case A:
                                  (u.options.cursor = F.eventArgs.cursor),
                                    (u.state.elements.cursor.innerHTML =
                                      F.eventArgs.cursor);
                              }
                              u.options.loop &&
                                (F.eventName === g ||
                                  (F.eventArgs && F.eventArgs.temp) ||
                                  (u.state.calledEvents = [].concat(
                                    I(u.state.calledEvents),
                                    [F],
                                  ))),
                                (u.state.eventQueue = D),
                                (u.state.lastFrameTime = d);
                            }
                          }
                        }),
                        i)
                      )
                        if (typeof i == "string") {
                          var P = document.querySelector(i);
                          if (!P)
                            throw new Error("Could not find container element");
                          this.state.elements.container = P;
                        } else this.state.elements.container = i;
                      E && (this.options = b(b({}, this.options), E)),
                        (this.state.initialOptions = b({}, this.options)),
                        this.init();
                    }
                    var o, a;
                    return (
                      (o = C),
                      (a = [
                        {
                          key: "init",
                          value: function () {
                            var i, E;
                            this.setupWrapperElement(),
                              this.addEventToQueue(
                                A,
                                { cursor: this.options.cursor },
                                !0,
                              ),
                              this.addEventToQueue(v, null, !0),
                              !window ||
                                window.___TYPEWRITER_JS_STYLES_ADDED___ ||
                                this.options.skipAddStyles ||
                                ((i =
                                  ".Typewriter__cursor{-webkit-animation:Typewriter-cursor 1s infinite;animation:Typewriter-cursor 1s infinite;margin-left:1px}@-webkit-keyframes Typewriter-cursor{0%{opacity:0}50%{opacity:1}100%{opacity:0}}@keyframes Typewriter-cursor{0%{opacity:0}50%{opacity:1}100%{opacity:0}}"),
                                (E =
                                  document.createElement("style")).appendChild(
                                  document.createTextNode(i),
                                ),
                                document.head.appendChild(E),
                                (window.___TYPEWRITER_JS_STYLES_ADDED___ = !0)),
                              this.options.autoStart === !0 &&
                                this.options.strings &&
                                this.typeOutAllStrings().start();
                          },
                        },
                        {
                          key: "logInDevMode",
                          value: function (i) {
                            this.options.devMode && console.log(i);
                          },
                        },
                      ]) && _(o.prototype, a),
                      Object.defineProperty(o, "prototype", { writable: !1 }),
                      C
                    );
                  })();
                },
                8552: (t, s, e) => {
                  var r = e(852)(e(5639), "DataView");
                  t.exports = r;
                },
                1989: (t, s, e) => {
                  var r = e(1789),
                    l = e(401),
                    c = e(7667),
                    n = e(1327),
                    p = e(1866);
                  function f(v) {
                    var g = -1,
                      m = v == null ? 0 : v.length;
                    for (this.clear(); ++g < m; ) {
                      var y = v[g];
                      this.set(y[0], y[1]);
                    }
                  }
                  (f.prototype.clear = r),
                    (f.prototype.delete = l),
                    (f.prototype.get = c),
                    (f.prototype.has = n),
                    (f.prototype.set = p),
                    (t.exports = f);
                },
                8407: (t, s, e) => {
                  var r = e(7040),
                    l = e(4125),
                    c = e(2117),
                    n = e(7518),
                    p = e(4705);
                  function f(v) {
                    var g = -1,
                      m = v == null ? 0 : v.length;
                    for (this.clear(); ++g < m; ) {
                      var y = v[g];
                      this.set(y[0], y[1]);
                    }
                  }
                  (f.prototype.clear = r),
                    (f.prototype.delete = l),
                    (f.prototype.get = c),
                    (f.prototype.has = n),
                    (f.prototype.set = p),
                    (t.exports = f);
                },
                7071: (t, s, e) => {
                  var r = e(852)(e(5639), "Map");
                  t.exports = r;
                },
                3369: (t, s, e) => {
                  var r = e(4785),
                    l = e(1285),
                    c = e(6e3),
                    n = e(9916),
                    p = e(5265);
                  function f(v) {
                    var g = -1,
                      m = v == null ? 0 : v.length;
                    for (this.clear(); ++g < m; ) {
                      var y = v[g];
                      this.set(y[0], y[1]);
                    }
                  }
                  (f.prototype.clear = r),
                    (f.prototype.delete = l),
                    (f.prototype.get = c),
                    (f.prototype.has = n),
                    (f.prototype.set = p),
                    (t.exports = f);
                },
                3818: (t, s, e) => {
                  var r = e(852)(e(5639), "Promise");
                  t.exports = r;
                },
                8525: (t, s, e) => {
                  var r = e(852)(e(5639), "Set");
                  t.exports = r;
                },
                8668: (t, s, e) => {
                  var r = e(3369),
                    l = e(619),
                    c = e(2385);
                  function n(p) {
                    var f = -1,
                      v = p == null ? 0 : p.length;
                    for (this.__data__ = new r(); ++f < v; ) this.add(p[f]);
                  }
                  (n.prototype.add = n.prototype.push = l),
                    (n.prototype.has = c),
                    (t.exports = n);
                },
                6384: (t, s, e) => {
                  var r = e(8407),
                    l = e(7465),
                    c = e(3779),
                    n = e(7599),
                    p = e(4758),
                    f = e(4309);
                  function v(g) {
                    var m = (this.__data__ = new r(g));
                    this.size = m.size;
                  }
                  (v.prototype.clear = l),
                    (v.prototype.delete = c),
                    (v.prototype.get = n),
                    (v.prototype.has = p),
                    (v.prototype.set = f),
                    (t.exports = v);
                },
                2705: (t, s, e) => {
                  var r = e(5639).Symbol;
                  t.exports = r;
                },
                1149: (t, s, e) => {
                  var r = e(5639).Uint8Array;
                  t.exports = r;
                },
                577: (t, s, e) => {
                  var r = e(852)(e(5639), "WeakMap");
                  t.exports = r;
                },
                4963: (t) => {
                  t.exports = function (s, e) {
                    for (
                      var r = -1, l = s == null ? 0 : s.length, c = 0, n = [];
                      ++r < l;

                    ) {
                      var p = s[r];
                      e(p, r, s) && (n[c++] = p);
                    }
                    return n;
                  };
                },
                4636: (t, s, e) => {
                  var r = e(2545),
                    l = e(5694),
                    c = e(1469),
                    n = e(4144),
                    p = e(5776),
                    f = e(6719),
                    v = Object.prototype.hasOwnProperty;
                  t.exports = function (g, m) {
                    var y = c(g),
                      w = !y && l(g),
                      T = !y && !w && n(g),
                      S = !y && !w && !T && f(g),
                      A = y || w || T || S,
                      L = A ? r(g.length, String) : [],
                      k = L.length;
                    for (var M in g)
                      (!m && !v.call(g, M)) ||
                        (A &&
                          (M == "length" ||
                            (T && (M == "offset" || M == "parent")) ||
                            (S &&
                              (M == "buffer" ||
                                M == "byteLength" ||
                                M == "byteOffset")) ||
                            p(M, k))) ||
                        L.push(M);
                    return L;
                  };
                },
                2488: (t) => {
                  t.exports = function (s, e) {
                    for (var r = -1, l = e.length, c = s.length; ++r < l; )
                      s[c + r] = e[r];
                    return s;
                  };
                },
                2908: (t) => {
                  t.exports = function (s, e) {
                    for (var r = -1, l = s == null ? 0 : s.length; ++r < l; )
                      if (e(s[r], r, s)) return !0;
                    return !1;
                  };
                },
                8470: (t, s, e) => {
                  var r = e(7813);
                  t.exports = function (l, c) {
                    for (var n = l.length; n--; ) if (r(l[n][0], c)) return n;
                    return -1;
                  };
                },
                8866: (t, s, e) => {
                  var r = e(2488),
                    l = e(1469);
                  t.exports = function (c, n, p) {
                    var f = n(c);
                    return l(c) ? f : r(f, p(c));
                  };
                },
                4239: (t, s, e) => {
                  var r = e(2705),
                    l = e(9607),
                    c = e(2333),
                    n = r ? r.toStringTag : void 0;
                  t.exports = function (p) {
                    return p == null
                      ? p === void 0
                        ? "[object Undefined]"
                        : "[object Null]"
                      : n && n in Object(p)
                        ? l(p)
                        : c(p);
                  };
                },
                9454: (t, s, e) => {
                  var r = e(4239),
                    l = e(7005);
                  t.exports = function (c) {
                    return l(c) && r(c) == "[object Arguments]";
                  };
                },
                939: (t, s, e) => {
                  var r = e(2492),
                    l = e(7005);
                  t.exports = function c(n, p, f, v, g) {
                    return (
                      n === p ||
                      (n == null || p == null || (!l(n) && !l(p))
                        ? n != n && p != p
                        : r(n, p, f, v, c, g))
                    );
                  };
                },
                2492: (t, s, e) => {
                  var r = e(6384),
                    l = e(7114),
                    c = e(8351),
                    n = e(6096),
                    p = e(4160),
                    f = e(1469),
                    v = e(4144),
                    g = e(6719),
                    m = "[object Arguments]",
                    y = "[object Array]",
                    w = "[object Object]",
                    T = Object.prototype.hasOwnProperty;
                  t.exports = function (S, A, L, k, M, O) {
                    var b = f(S),
                      I = f(A),
                      Q = b ? y : p(S),
                      _ = I ? y : p(A),
                      h = (Q = Q == m ? w : Q) == w,
                      x = (_ = _ == m ? w : _) == w,
                      N = Q == _;
                    if (N && v(S)) {
                      if (!v(A)) return !1;
                      (b = !0), (h = !1);
                    }
                    if (N && !h)
                      return (
                        O || (O = new r()),
                        b || g(S) ? l(S, A, L, k, M, O) : c(S, A, Q, L, k, M, O)
                      );
                    if (!(1 & L)) {
                      var C = h && T.call(S, "__wrapped__"),
                        o = x && T.call(A, "__wrapped__");
                      if (C || o) {
                        var a = C ? S.value() : S,
                          i = o ? A.value() : A;
                        return O || (O = new r()), M(a, i, L, k, O);
                      }
                    }
                    return !!N && (O || (O = new r()), n(S, A, L, k, M, O));
                  };
                },
                8458: (t, s, e) => {
                  var r = e(3560),
                    l = e(5346),
                    c = e(3218),
                    n = e(346),
                    p = /^\[object .+?Constructor\]$/,
                    f = Function.prototype,
                    v = Object.prototype,
                    g = f.toString,
                    m = v.hasOwnProperty,
                    y = RegExp(
                      "^" +
                        g
                          .call(m)
                          .replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
                          .replace(
                            /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
                            "$1.*?",
                          ) +
                        "$",
                    );
                  t.exports = function (w) {
                    return !(!c(w) || l(w)) && (r(w) ? y : p).test(n(w));
                  };
                },
                8749: (t, s, e) => {
                  var r = e(4239),
                    l = e(1780),
                    c = e(7005),
                    n = {};
                  (n["[object Float32Array]"] =
                    n["[object Float64Array]"] =
                    n["[object Int8Array]"] =
                    n["[object Int16Array]"] =
                    n["[object Int32Array]"] =
                    n["[object Uint8Array]"] =
                    n["[object Uint8ClampedArray]"] =
                    n["[object Uint16Array]"] =
                    n["[object Uint32Array]"] =
                      !0),
                    (n["[object Arguments]"] =
                      n["[object Array]"] =
                      n["[object ArrayBuffer]"] =
                      n["[object Boolean]"] =
                      n["[object DataView]"] =
                      n["[object Date]"] =
                      n["[object Error]"] =
                      n["[object Function]"] =
                      n["[object Map]"] =
                      n["[object Number]"] =
                      n["[object Object]"] =
                      n["[object RegExp]"] =
                      n["[object Set]"] =
                      n["[object String]"] =
                      n["[object WeakMap]"] =
                        !1),
                    (t.exports = function (p) {
                      return c(p) && l(p.length) && !!n[r(p)];
                    });
                },
                280: (t, s, e) => {
                  var r = e(5726),
                    l = e(6916),
                    c = Object.prototype.hasOwnProperty;
                  t.exports = function (n) {
                    if (!r(n)) return l(n);
                    var p = [];
                    for (var f in Object(n))
                      c.call(n, f) && f != "constructor" && p.push(f);
                    return p;
                  };
                },
                2545: (t) => {
                  t.exports = function (s, e) {
                    for (var r = -1, l = Array(s); ++r < s; ) l[r] = e(r);
                    return l;
                  };
                },
                1717: (t) => {
                  t.exports = function (s) {
                    return function (e) {
                      return s(e);
                    };
                  };
                },
                4757: (t) => {
                  t.exports = function (s, e) {
                    return s.has(e);
                  };
                },
                4429: (t, s, e) => {
                  var r = e(5639)["__core-js_shared__"];
                  t.exports = r;
                },
                7114: (t, s, e) => {
                  var r = e(8668),
                    l = e(2908),
                    c = e(4757);
                  t.exports = function (n, p, f, v, g, m) {
                    var y = 1 & f,
                      w = n.length,
                      T = p.length;
                    if (w != T && !(y && T > w)) return !1;
                    var S = m.get(n),
                      A = m.get(p);
                    if (S && A) return S == p && A == n;
                    var L = -1,
                      k = !0,
                      M = 2 & f ? new r() : void 0;
                    for (m.set(n, p), m.set(p, n); ++L < w; ) {
                      var O = n[L],
                        b = p[L];
                      if (v)
                        var I = y ? v(b, O, L, p, n, m) : v(O, b, L, n, p, m);
                      if (I !== void 0) {
                        if (I) continue;
                        k = !1;
                        break;
                      }
                      if (M) {
                        if (
                          !l(p, function (Q, _) {
                            if (!c(M, _) && (O === Q || g(O, Q, f, v, m)))
                              return M.push(_);
                          })
                        ) {
                          k = !1;
                          break;
                        }
                      } else if (O !== b && !g(O, b, f, v, m)) {
                        k = !1;
                        break;
                      }
                    }
                    return m.delete(n), m.delete(p), k;
                  };
                },
                8351: (t, s, e) => {
                  var r = e(2705),
                    l = e(1149),
                    c = e(7813),
                    n = e(7114),
                    p = e(8776),
                    f = e(1814),
                    v = r ? r.prototype : void 0,
                    g = v ? v.valueOf : void 0;
                  t.exports = function (m, y, w, T, S, A, L) {
                    switch (w) {
                      case "[object DataView]":
                        if (
                          m.byteLength != y.byteLength ||
                          m.byteOffset != y.byteOffset
                        )
                          return !1;
                        (m = m.buffer), (y = y.buffer);
                      case "[object ArrayBuffer]":
                        return !(
                          m.byteLength != y.byteLength || !A(new l(m), new l(y))
                        );
                      case "[object Boolean]":
                      case "[object Date]":
                      case "[object Number]":
                        return c(+m, +y);
                      case "[object Error]":
                        return m.name == y.name && m.message == y.message;
                      case "[object RegExp]":
                      case "[object String]":
                        return m == y + "";
                      case "[object Map]":
                        var k = p;
                      case "[object Set]":
                        var M = 1 & T;
                        if ((k || (k = f), m.size != y.size && !M)) return !1;
                        var O = L.get(m);
                        if (O) return O == y;
                        (T |= 2), L.set(m, y);
                        var b = n(k(m), k(y), T, S, A, L);
                        return L.delete(m), b;
                      case "[object Symbol]":
                        if (g) return g.call(m) == g.call(y);
                    }
                    return !1;
                  };
                },
                6096: (t, s, e) => {
                  var r = e(8234),
                    l = Object.prototype.hasOwnProperty;
                  t.exports = function (c, n, p, f, v, g) {
                    var m = 1 & p,
                      y = r(c),
                      w = y.length;
                    if (w != r(n).length && !m) return !1;
                    for (var T = w; T--; ) {
                      var S = y[T];
                      if (!(m ? S in n : l.call(n, S))) return !1;
                    }
                    var A = g.get(c),
                      L = g.get(n);
                    if (A && L) return A == n && L == c;
                    var k = !0;
                    g.set(c, n), g.set(n, c);
                    for (var M = m; ++T < w; ) {
                      var O = c[(S = y[T])],
                        b = n[S];
                      if (f)
                        var I = m ? f(b, O, S, n, c, g) : f(O, b, S, c, n, g);
                      if (!(I === void 0 ? O === b || v(O, b, p, f, g) : I)) {
                        k = !1;
                        break;
                      }
                      M || (M = S == "constructor");
                    }
                    if (k && !M) {
                      var Q = c.constructor,
                        _ = n.constructor;
                      Q == _ ||
                        !("constructor" in c) ||
                        !("constructor" in n) ||
                        (typeof Q == "function" &&
                          Q instanceof Q &&
                          typeof _ == "function" &&
                          _ instanceof _) ||
                        (k = !1);
                    }
                    return g.delete(c), g.delete(n), k;
                  };
                },
                1957: (t, s, e) => {
                  var r =
                    typeof e.g == "object" &&
                    e.g &&
                    e.g.Object === Object &&
                    e.g;
                  t.exports = r;
                },
                8234: (t, s, e) => {
                  var r = e(8866),
                    l = e(9551),
                    c = e(3674);
                  t.exports = function (n) {
                    return r(n, c, l);
                  };
                },
                5050: (t, s, e) => {
                  var r = e(7019);
                  t.exports = function (l, c) {
                    var n = l.__data__;
                    return r(c)
                      ? n[typeof c == "string" ? "string" : "hash"]
                      : n.map;
                  };
                },
                852: (t, s, e) => {
                  var r = e(8458),
                    l = e(7801);
                  t.exports = function (c, n) {
                    var p = l(c, n);
                    return r(p) ? p : void 0;
                  };
                },
                9607: (t, s, e) => {
                  var r = e(2705),
                    l = Object.prototype,
                    c = l.hasOwnProperty,
                    n = l.toString,
                    p = r ? r.toStringTag : void 0;
                  t.exports = function (f) {
                    var v = c.call(f, p),
                      g = f[p];
                    try {
                      f[p] = void 0;
                      var m = !0;
                    } catch {}
                    var y = n.call(f);
                    return m && (v ? (f[p] = g) : delete f[p]), y;
                  };
                },
                9551: (t, s, e) => {
                  var r = e(4963),
                    l = e(479),
                    c = Object.prototype.propertyIsEnumerable,
                    n = Object.getOwnPropertySymbols,
                    p = n
                      ? function (f) {
                          return f == null
                            ? []
                            : ((f = Object(f)),
                              r(n(f), function (v) {
                                return c.call(f, v);
                              }));
                        }
                      : l;
                  t.exports = p;
                },
                4160: (t, s, e) => {
                  var r = e(8552),
                    l = e(7071),
                    c = e(3818),
                    n = e(8525),
                    p = e(577),
                    f = e(4239),
                    v = e(346),
                    g = "[object Map]",
                    m = "[object Promise]",
                    y = "[object Set]",
                    w = "[object WeakMap]",
                    T = "[object DataView]",
                    S = v(r),
                    A = v(l),
                    L = v(c),
                    k = v(n),
                    M = v(p),
                    O = f;
                  ((r && O(new r(new ArrayBuffer(1))) != T) ||
                    (l && O(new l()) != g) ||
                    (c && O(c.resolve()) != m) ||
                    (n && O(new n()) != y) ||
                    (p && O(new p()) != w)) &&
                    (O = function (b) {
                      var I = f(b),
                        Q = I == "[object Object]" ? b.constructor : void 0,
                        _ = Q ? v(Q) : "";
                      if (_)
                        switch (_) {
                          case S:
                            return T;
                          case A:
                            return g;
                          case L:
                            return m;
                          case k:
                            return y;
                          case M:
                            return w;
                        }
                      return I;
                    }),
                    (t.exports = O);
                },
                7801: (t) => {
                  t.exports = function (s, e) {
                    return s?.[e];
                  };
                },
                1789: (t, s, e) => {
                  var r = e(4536);
                  t.exports = function () {
                    (this.__data__ = r ? r(null) : {}), (this.size = 0);
                  };
                },
                401: (t) => {
                  t.exports = function (s) {
                    var e = this.has(s) && delete this.__data__[s];
                    return (this.size -= e ? 1 : 0), e;
                  };
                },
                7667: (t, s, e) => {
                  var r = e(4536),
                    l = Object.prototype.hasOwnProperty;
                  t.exports = function (c) {
                    var n = this.__data__;
                    if (r) {
                      var p = n[c];
                      return p === "__lodash_hash_undefined__" ? void 0 : p;
                    }
                    return l.call(n, c) ? n[c] : void 0;
                  };
                },
                1327: (t, s, e) => {
                  var r = e(4536),
                    l = Object.prototype.hasOwnProperty;
                  t.exports = function (c) {
                    var n = this.__data__;
                    return r ? n[c] !== void 0 : l.call(n, c);
                  };
                },
                1866: (t, s, e) => {
                  var r = e(4536);
                  t.exports = function (l, c) {
                    var n = this.__data__;
                    return (
                      (this.size += this.has(l) ? 0 : 1),
                      (n[l] =
                        r && c === void 0 ? "__lodash_hash_undefined__" : c),
                      this
                    );
                  };
                },
                5776: (t) => {
                  var s = /^(?:0|[1-9]\d*)$/;
                  t.exports = function (e, r) {
                    var l = typeof e;
                    return (
                      !!(r = r ?? 9007199254740991) &&
                      (l == "number" || (l != "symbol" && s.test(e))) &&
                      e > -1 &&
                      e % 1 == 0 &&
                      e < r
                    );
                  };
                },
                7019: (t) => {
                  t.exports = function (s) {
                    var e = typeof s;
                    return e == "string" ||
                      e == "number" ||
                      e == "symbol" ||
                      e == "boolean"
                      ? s !== "__proto__"
                      : s === null;
                  };
                },
                5346: (t, s, e) => {
                  var r,
                    l = e(4429),
                    c = (r = /[^.]+$/.exec(
                      (l && l.keys && l.keys.IE_PROTO) || "",
                    ))
                      ? "Symbol(src)_1." + r
                      : "";
                  t.exports = function (n) {
                    return !!c && c in n;
                  };
                },
                5726: (t) => {
                  var s = Object.prototype;
                  t.exports = function (e) {
                    var r = e && e.constructor;
                    return e === ((typeof r == "function" && r.prototype) || s);
                  };
                },
                7040: (t) => {
                  t.exports = function () {
                    (this.__data__ = []), (this.size = 0);
                  };
                },
                4125: (t, s, e) => {
                  var r = e(8470),
                    l = Array.prototype.splice;
                  t.exports = function (c) {
                    var n = this.__data__,
                      p = r(n, c);
                    return !(
                      p < 0 ||
                      (p == n.length - 1 ? n.pop() : l.call(n, p, 1),
                      --this.size,
                      0)
                    );
                  };
                },
                2117: (t, s, e) => {
                  var r = e(8470);
                  t.exports = function (l) {
                    var c = this.__data__,
                      n = r(c, l);
                    return n < 0 ? void 0 : c[n][1];
                  };
                },
                7518: (t, s, e) => {
                  var r = e(8470);
                  t.exports = function (l) {
                    return r(this.__data__, l) > -1;
                  };
                },
                4705: (t, s, e) => {
                  var r = e(8470);
                  t.exports = function (l, c) {
                    var n = this.__data__,
                      p = r(n, l);
                    return (
                      p < 0 ? (++this.size, n.push([l, c])) : (n[p][1] = c),
                      this
                    );
                  };
                },
                4785: (t, s, e) => {
                  var r = e(1989),
                    l = e(8407),
                    c = e(7071);
                  t.exports = function () {
                    (this.size = 0),
                      (this.__data__ = {
                        hash: new r(),
                        map: new (c || l)(),
                        string: new r(),
                      });
                  };
                },
                1285: (t, s, e) => {
                  var r = e(5050);
                  t.exports = function (l) {
                    var c = r(this, l).delete(l);
                    return (this.size -= c ? 1 : 0), c;
                  };
                },
                6e3: (t, s, e) => {
                  var r = e(5050);
                  t.exports = function (l) {
                    return r(this, l).get(l);
                  };
                },
                9916: (t, s, e) => {
                  var r = e(5050);
                  t.exports = function (l) {
                    return r(this, l).has(l);
                  };
                },
                5265: (t, s, e) => {
                  var r = e(5050);
                  t.exports = function (l, c) {
                    var n = r(this, l),
                      p = n.size;
                    return (
                      n.set(l, c), (this.size += n.size == p ? 0 : 1), this
                    );
                  };
                },
                8776: (t) => {
                  t.exports = function (s) {
                    var e = -1,
                      r = Array(s.size);
                    return (
                      s.forEach(function (l, c) {
                        r[++e] = [c, l];
                      }),
                      r
                    );
                  };
                },
                4536: (t, s, e) => {
                  var r = e(852)(Object, "create");
                  t.exports = r;
                },
                6916: (t, s, e) => {
                  var r = e(5569)(Object.keys, Object);
                  t.exports = r;
                },
                1167: (t, s, e) => {
                  t = e.nmd(t);
                  var r = e(1957),
                    l = s && !s.nodeType && s,
                    c = l && t && !t.nodeType && t,
                    n = c && c.exports === l && r.process,
                    p = (function () {
                      try {
                        return (
                          (c && c.require && c.require("util").types) ||
                          (n && n.binding && n.binding("util"))
                        );
                      } catch {}
                    })();
                  t.exports = p;
                },
                2333: (t) => {
                  var s = Object.prototype.toString;
                  t.exports = function (e) {
                    return s.call(e);
                  };
                },
                5569: (t) => {
                  t.exports = function (s, e) {
                    return function (r) {
                      return s(e(r));
                    };
                  };
                },
                5639: (t, s, e) => {
                  var r = e(1957),
                    l =
                      typeof self == "object" &&
                      self &&
                      self.Object === Object &&
                      self,
                    c = r || l || Function("return this")();
                  t.exports = c;
                },
                619: (t) => {
                  t.exports = function (s) {
                    return (
                      this.__data__.set(s, "__lodash_hash_undefined__"), this
                    );
                  };
                },
                2385: (t) => {
                  t.exports = function (s) {
                    return this.__data__.has(s);
                  };
                },
                1814: (t) => {
                  t.exports = function (s) {
                    var e = -1,
                      r = Array(s.size);
                    return (
                      s.forEach(function (l) {
                        r[++e] = l;
                      }),
                      r
                    );
                  };
                },
                7465: (t, s, e) => {
                  var r = e(8407);
                  t.exports = function () {
                    (this.__data__ = new r()), (this.size = 0);
                  };
                },
                3779: (t) => {
                  t.exports = function (s) {
                    var e = this.__data__,
                      r = e.delete(s);
                    return (this.size = e.size), r;
                  };
                },
                7599: (t) => {
                  t.exports = function (s) {
                    return this.__data__.get(s);
                  };
                },
                4758: (t) => {
                  t.exports = function (s) {
                    return this.__data__.has(s);
                  };
                },
                4309: (t, s, e) => {
                  var r = e(8407),
                    l = e(7071),
                    c = e(3369);
                  t.exports = function (n, p) {
                    var f = this.__data__;
                    if (f instanceof r) {
                      var v = f.__data__;
                      if (!l || v.length < 199)
                        return v.push([n, p]), (this.size = ++f.size), this;
                      f = this.__data__ = new c(v);
                    }
                    return f.set(n, p), (this.size = f.size), this;
                  };
                },
                346: (t) => {
                  var s = Function.prototype.toString;
                  t.exports = function (e) {
                    if (e != null) {
                      try {
                        return s.call(e);
                      } catch {}
                      try {
                        return e + "";
                      } catch {}
                    }
                    return "";
                  };
                },
                7813: (t) => {
                  t.exports = function (s, e) {
                    return s === e || (s != s && e != e);
                  };
                },
                5694: (t, s, e) => {
                  var r = e(9454),
                    l = e(7005),
                    c = Object.prototype,
                    n = c.hasOwnProperty,
                    p = c.propertyIsEnumerable,
                    f = r(
                      (function () {
                        return arguments;
                      })(),
                    )
                      ? r
                      : function (v) {
                          return (
                            l(v) && n.call(v, "callee") && !p.call(v, "callee")
                          );
                        };
                  t.exports = f;
                },
                1469: (t) => {
                  var s = Array.isArray;
                  t.exports = s;
                },
                8612: (t, s, e) => {
                  var r = e(3560),
                    l = e(1780);
                  t.exports = function (c) {
                    return c != null && l(c.length) && !r(c);
                  };
                },
                4144: (t, s, e) => {
                  t = e.nmd(t);
                  var r = e(5639),
                    l = e(5062),
                    c = s && !s.nodeType && s,
                    n = c && t && !t.nodeType && t,
                    p = n && n.exports === c ? r.Buffer : void 0,
                    f = (p ? p.isBuffer : void 0) || l;
                  t.exports = f;
                },
                8446: (t, s, e) => {
                  var r = e(939);
                  t.exports = function (l, c) {
                    return r(l, c);
                  };
                },
                3560: (t, s, e) => {
                  var r = e(4239),
                    l = e(3218);
                  t.exports = function (c) {
                    if (!l(c)) return !1;
                    var n = r(c);
                    return (
                      n == "[object Function]" ||
                      n == "[object GeneratorFunction]" ||
                      n == "[object AsyncFunction]" ||
                      n == "[object Proxy]"
                    );
                  };
                },
                1780: (t) => {
                  t.exports = function (s) {
                    return (
                      typeof s == "number" &&
                      s > -1 &&
                      s % 1 == 0 &&
                      s <= 9007199254740991
                    );
                  };
                },
                3218: (t) => {
                  t.exports = function (s) {
                    var e = typeof s;
                    return s != null && (e == "object" || e == "function");
                  };
                },
                7005: (t) => {
                  t.exports = function (s) {
                    return s != null && typeof s == "object";
                  };
                },
                6719: (t, s, e) => {
                  var r = e(8749),
                    l = e(1717),
                    c = e(1167),
                    n = c && c.isTypedArray,
                    p = n ? l(n) : r;
                  t.exports = p;
                },
                3674: (t, s, e) => {
                  var r = e(4636),
                    l = e(280),
                    c = e(8612);
                  t.exports = function (n) {
                    return c(n) ? r(n) : l(n);
                  };
                },
                479: (t) => {
                  t.exports = function () {
                    return [];
                  };
                },
                5062: (t) => {
                  t.exports = function () {
                    return !1;
                  };
                },
                75: function (t) {
                  (function () {
                    var s, e, r, l, c, n;
                    typeof performance < "u" &&
                    performance !== null &&
                    performance.now
                      ? (t.exports = function () {
                          return performance.now();
                        })
                      : typeof process < "u" &&
                          process !== null &&
                          process.hrtime
                        ? ((t.exports = function () {
                            return (s() - c) / 1e6;
                          }),
                          (e = process.hrtime),
                          (l = (s = function () {
                            var p;
                            return 1e9 * (p = e())[0] + p[1];
                          })()),
                          (n = 1e9 * process.uptime()),
                          (c = l - n))
                        : Date.now
                          ? ((t.exports = function () {
                              return Date.now() - r;
                            }),
                            (r = Date.now()))
                          : ((t.exports = function () {
                              return new Date().getTime() - r;
                            }),
                            (r = new Date().getTime()));
                  }).call(this);
                },
                4087: (t, s, e) => {
                  for (
                    var r = e(75),
                      l = typeof window > "u" ? e.g : window,
                      c = ["moz", "webkit"],
                      n = "AnimationFrame",
                      p = l["request" + n],
                      f = l["cancel" + n] || l["cancelRequest" + n],
                      v = 0;
                    !p && v < c.length;
                    v++
                  )
                    (p = l[c[v] + "Request" + n]),
                      (f =
                        l[c[v] + "Cancel" + n] ||
                        l[c[v] + "CancelRequest" + n]);
                  if (!p || !f) {
                    var g = 0,
                      m = 0,
                      y = [];
                    (p = function (w) {
                      if (y.length === 0) {
                        var T = r(),
                          S = Math.max(0, 16.666666666666668 - (T - g));
                        (g = S + T),
                          setTimeout(function () {
                            var A = y.slice(0);
                            y.length = 0;
                            for (var L = 0; L < A.length; L++)
                              if (!A[L].cancelled)
                                try {
                                  A[L].callback(g);
                                } catch (k) {
                                  setTimeout(function () {
                                    throw k;
                                  }, 0);
                                }
                          }, Math.round(S));
                      }
                      return (
                        y.push({ handle: ++m, callback: w, cancelled: !1 }), m
                      );
                    }),
                      (f = function (w) {
                        for (var T = 0; T < y.length; T++)
                          y[T].handle === w && (y[T].cancelled = !0);
                      });
                  }
                  (t.exports = function (w) {
                    return p.call(l, w);
                  }),
                    (t.exports.cancel = function () {
                      f.apply(l, arguments);
                    }),
                    (t.exports.polyfill = function (w) {
                      w || (w = l),
                        (w.requestAnimationFrame = p),
                        (w.cancelAnimationFrame = f);
                    });
                },
                8156: (t) => {
                  t.exports = Y;
                },
              },
              U = {};
            function V(t) {
              var s = U[t];
              if (s !== void 0) return s.exports;
              var e = (U[t] = { id: t, loaded: !1, exports: {} });
              return (
                q[t].call(e.exports, e, e.exports, V),
                (e.loaded = !0),
                e.exports
              );
            }
            (V.n = (t) => {
              var s = t && t.__esModule ? () => t.default : () => t;
              return V.d(s, { a: s }), s;
            }),
              (V.d = (t, s) => {
                for (var e in s)
                  V.o(s, e) &&
                    !V.o(t, e) &&
                    Object.defineProperty(t, e, { enumerable: !0, get: s[e] });
              }),
              (V.g = (function () {
                if (typeof globalThis == "object") return globalThis;
                try {
                  return this || new Function("return this")();
                } catch {
                  if (typeof window == "object") return window;
                }
              })()),
              (V.o = (t, s) => Object.prototype.hasOwnProperty.call(t, s)),
              (V.nmd = (t) => (
                (t.paths = []), t.children || (t.children = []), t
              ));
            var z = {};
            return (
              (() => {
                V.d(z, { default: () => y });
                var t = V(8156),
                  s = V.n(t),
                  e = V(7403),
                  r = V(8446),
                  l = V.n(r);
                function c(w) {
                  return (
                    (c =
                      typeof Symbol == "function" &&
                      typeof Symbol.iterator == "symbol"
                        ? function (T) {
                            return typeof T;
                          }
                        : function (T) {
                            return T &&
                              typeof Symbol == "function" &&
                              T.constructor === Symbol &&
                              T !== Symbol.prototype
                              ? "symbol"
                              : typeof T;
                          }),
                    c(w)
                  );
                }
                function n(w, T) {
                  for (var S = 0; S < T.length; S++) {
                    var A = T[S];
                    (A.enumerable = A.enumerable || !1),
                      (A.configurable = !0),
                      "value" in A && (A.writable = !0),
                      Object.defineProperty(w, g(A.key), A);
                  }
                }
                function p(w, T) {
                  return (
                    (p = Object.setPrototypeOf
                      ? Object.setPrototypeOf.bind()
                      : function (S, A) {
                          return (S.__proto__ = A), S;
                        }),
                    p(w, T)
                  );
                }
                function f(w) {
                  if (w === void 0)
                    throw new ReferenceError(
                      "this hasn't been initialised - super() hasn't been called",
                    );
                  return w;
                }
                function v(w) {
                  return (
                    (v = Object.setPrototypeOf
                      ? Object.getPrototypeOf.bind()
                      : function (T) {
                          return T.__proto__ || Object.getPrototypeOf(T);
                        }),
                    v(w)
                  );
                }
                function g(w) {
                  var T = (function (S, A) {
                    if (c(S) !== "object" || S === null) return S;
                    var L = S[Symbol.toPrimitive];
                    if (L !== void 0) {
                      var k = L.call(S, "string");
                      if (c(k) !== "object") return k;
                      throw new TypeError(
                        "@@toPrimitive must return a primitive value.",
                      );
                    }
                    return String(S);
                  })(w);
                  return c(T) === "symbol" ? T : String(T);
                }
                var m = (function (w) {
                  (function (O, b) {
                    if (typeof b != "function" && b !== null)
                      throw new TypeError(
                        "Super expression must either be null or a function",
                      );
                    (O.prototype = Object.create(b && b.prototype, {
                      constructor: { value: O, writable: !0, configurable: !0 },
                    })),
                      Object.defineProperty(O, "prototype", { writable: !1 }),
                      b && p(O, b);
                  })(M, w);
                  var T,
                    S,
                    A,
                    L,
                    k =
                      ((A = M),
                      (L = (function () {
                        if (
                          typeof Reflect > "u" ||
                          !Reflect.construct ||
                          Reflect.construct.sham
                        )
                          return !1;
                        if (typeof Proxy == "function") return !0;
                        try {
                          return (
                            Boolean.prototype.valueOf.call(
                              Reflect.construct(Boolean, [], function () {}),
                            ),
                            !0
                          );
                        } catch {
                          return !1;
                        }
                      })()),
                      function () {
                        var O,
                          b = v(A);
                        if (L) {
                          var I = v(this).constructor;
                          O = Reflect.construct(b, arguments, I);
                        } else O = b.apply(this, arguments);
                        return (function (Q, _) {
                          if (
                            _ &&
                            (c(_) === "object" || typeof _ == "function")
                          )
                            return _;
                          if (_ !== void 0)
                            throw new TypeError(
                              "Derived constructors may only return object or undefined",
                            );
                          return f(Q);
                        })(this, O);
                      });
                  function M() {
                    var O, b, I, Q;
                    (function (N, C) {
                      if (!(N instanceof C))
                        throw new TypeError(
                          "Cannot call a class as a function",
                        );
                    })(this, M);
                    for (
                      var _ = arguments.length, h = new Array(_), x = 0;
                      x < _;
                      x++
                    )
                      h[x] = arguments[x];
                    return (
                      (b = f((O = k.call.apply(k, [this].concat(h))))),
                      (Q = { instance: null }),
                      (I = g((I = "state"))) in b
                        ? Object.defineProperty(b, I, {
                            value: Q,
                            enumerable: !0,
                            configurable: !0,
                            writable: !0,
                          })
                        : (b[I] = Q),
                      O
                    );
                  }
                  return (
                    (T = M),
                    (S = [
                      {
                        key: "componentDidMount",
                        value: function () {
                          var O = this,
                            b = new e.default(
                              this.typewriter,
                              this.props.options,
                            );
                          this.setState({ instance: b }, function () {
                            var I = O.props.onInit;
                            I && I(b);
                          });
                        },
                      },
                      {
                        key: "componentDidUpdate",
                        value: function (O) {
                          l()(this.props.options, O.options) ||
                            this.setState({
                              instance: new e.default(
                                this.typewriter,
                                this.props.options,
                              ),
                            });
                        },
                      },
                      {
                        key: "componentWillUnmount",
                        value: function () {
                          this.state.instance && this.state.instance.stop();
                        },
                      },
                      {
                        key: "render",
                        value: function () {
                          var O = this,
                            b = this.props.component;
                          return s().createElement(b, {
                            ref: function (I) {
                              return (O.typewriter = I);
                            },
                            className: "Typewriter",
                            "data-testid": "typewriter-wrapper",
                          });
                        },
                      },
                    ]) && n(T.prototype, S),
                    Object.defineProperty(T, "prototype", { writable: !1 }),
                    M
                  );
                })(t.Component);
                m.defaultProps = { component: "div" };
                const y = m;
              })(),
              z.default
            );
          })(),
        );
      })(pe)),
    pe.exports
  );
}
Ae();
var fe = { exports: {} },
  Ce = fe.exports,
  _e;
function Ne() {
  return (
    _e ||
      ((_e = 1),
      (function (B, $) {
        (function (Y, q) {
          B.exports = q();
        })(typeof self < "u" ? self : Ce, () =>
          (() => {
            var Y = {
                75: function (z) {
                  (function () {
                    var t, s, e, r, l, c;
                    typeof performance < "u" &&
                    performance !== null &&
                    performance.now
                      ? (z.exports = function () {
                          return performance.now();
                        })
                      : typeof process < "u" &&
                          process !== null &&
                          process.hrtime
                        ? ((z.exports = function () {
                            return (t() - l) / 1e6;
                          }),
                          (s = process.hrtime),
                          (r = (t = function () {
                            var n;
                            return 1e9 * (n = s())[0] + n[1];
                          })()),
                          (c = 1e9 * process.uptime()),
                          (l = r - c))
                        : Date.now
                          ? ((z.exports = function () {
                              return Date.now() - e;
                            }),
                            (e = Date.now()))
                          : ((z.exports = function () {
                              return new Date().getTime() - e;
                            }),
                            (e = new Date().getTime()));
                  }).call(this);
                },
                4087: (z, t, s) => {
                  for (
                    var e = s(75),
                      r = typeof window > "u" ? s.g : window,
                      l = ["moz", "webkit"],
                      c = "AnimationFrame",
                      n = r["request" + c],
                      p = r["cancel" + c] || r["cancelRequest" + c],
                      f = 0;
                    !n && f < l.length;
                    f++
                  )
                    (n = r[l[f] + "Request" + c]),
                      (p =
                        r[l[f] + "Cancel" + c] ||
                        r[l[f] + "CancelRequest" + c]);
                  if (!n || !p) {
                    var v = 0,
                      g = 0,
                      m = [];
                    (n = function (y) {
                      if (m.length === 0) {
                        var w = e(),
                          T = Math.max(0, 16.666666666666668 - (w - v));
                        (v = T + w),
                          setTimeout(function () {
                            var S = m.slice(0);
                            m.length = 0;
                            for (var A = 0; A < S.length; A++)
                              if (!S[A].cancelled)
                                try {
                                  S[A].callback(v);
                                } catch (L) {
                                  setTimeout(function () {
                                    throw L;
                                  }, 0);
                                }
                          }, Math.round(T));
                      }
                      return (
                        m.push({ handle: ++g, callback: y, cancelled: !1 }), g
                      );
                    }),
                      (p = function (y) {
                        for (var w = 0; w < m.length; w++)
                          m[w].handle === y && (m[w].cancelled = !0);
                      });
                  }
                  (z.exports = function (y) {
                    return n.call(r, y);
                  }),
                    (z.exports.cancel = function () {
                      p.apply(r, arguments);
                    }),
                    (z.exports.polyfill = function (y) {
                      y || (y = r),
                        (y.requestAnimationFrame = n),
                        (y.cancelAnimationFrame = p);
                    });
                },
              },
              q = {};
            function U(z) {
              var t = q[z];
              if (t !== void 0) return t.exports;
              var s = (q[z] = { exports: {} });
              return Y[z].call(s.exports, s, s.exports, U), s.exports;
            }
            (U.n = (z) => {
              var t = z && z.__esModule ? () => z.default : () => z;
              return U.d(t, { a: t }), t;
            }),
              (U.d = (z, t) => {
                for (var s in t)
                  U.o(t, s) &&
                    !U.o(z, s) &&
                    Object.defineProperty(z, s, { enumerable: !0, get: t[s] });
              }),
              (U.g = (function () {
                if (typeof globalThis == "object") return globalThis;
                try {
                  return this || new Function("return this")();
                } catch {
                  if (typeof window == "object") return window;
                }
              })()),
              (U.o = (z, t) => Object.prototype.hasOwnProperty.call(z, t));
            var V = {};
            return (
              (() => {
                U.d(V, { default: () => Q });
                var z = U(4087),
                  t = U.n(z);
                const s = function (_) {
                    return new RegExp(/<[a-z][\s\S]*>/i).test(_);
                  },
                  e = function (_, h) {
                    return Math.floor(Math.random() * (h - _ + 1)) + _;
                  };
                var r = "TYPE_CHARACTER",
                  l = "REMOVE_CHARACTER",
                  c = "REMOVE_ALL",
                  n = "REMOVE_LAST_VISIBLE_NODE",
                  p = "PAUSE_FOR",
                  f = "CALL_FUNCTION",
                  v = "ADD_HTML_TAG_ELEMENT",
                  g = "CHANGE_DELETE_SPEED",
                  m = "CHANGE_DELAY",
                  y = "CHANGE_CURSOR",
                  w = "PASTE_STRING",
                  T = "HTML_TAG";
                function S(_) {
                  return (
                    (S =
                      typeof Symbol == "function" &&
                      typeof Symbol.iterator == "symbol"
                        ? function (h) {
                            return typeof h;
                          }
                        : function (h) {
                            return h &&
                              typeof Symbol == "function" &&
                              h.constructor === Symbol &&
                              h !== Symbol.prototype
                              ? "symbol"
                              : typeof h;
                          }),
                    S(_)
                  );
                }
                function A(_, h) {
                  var x = Object.keys(_);
                  if (Object.getOwnPropertySymbols) {
                    var N = Object.getOwnPropertySymbols(_);
                    h &&
                      (N = N.filter(function (C) {
                        return Object.getOwnPropertyDescriptor(_, C).enumerable;
                      })),
                      x.push.apply(x, N);
                  }
                  return x;
                }
                function L(_) {
                  for (var h = 1; h < arguments.length; h++) {
                    var x = arguments[h] != null ? arguments[h] : {};
                    h % 2
                      ? A(Object(x), !0).forEach(function (N) {
                          b(_, N, x[N]);
                        })
                      : Object.getOwnPropertyDescriptors
                        ? Object.defineProperties(
                            _,
                            Object.getOwnPropertyDescriptors(x),
                          )
                        : A(Object(x)).forEach(function (N) {
                            Object.defineProperty(
                              _,
                              N,
                              Object.getOwnPropertyDescriptor(x, N),
                            );
                          });
                  }
                  return _;
                }
                function k(_) {
                  return (
                    (function (h) {
                      if (Array.isArray(h)) return M(h);
                    })(_) ||
                    (function (h) {
                      if (
                        (typeof Symbol < "u" && h[Symbol.iterator] != null) ||
                        h["@@iterator"] != null
                      )
                        return Array.from(h);
                    })(_) ||
                    (function (h, x) {
                      if (h) {
                        if (typeof h == "string") return M(h, x);
                        var N = Object.prototype.toString.call(h).slice(8, -1);
                        return (
                          N === "Object" &&
                            h.constructor &&
                            (N = h.constructor.name),
                          N === "Map" || N === "Set"
                            ? Array.from(h)
                            : N === "Arguments" ||
                                /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(
                                  N,
                                )
                              ? M(h, x)
                              : void 0
                        );
                      }
                    })(_) ||
                    (function () {
                      throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
                    })()
                  );
                }
                function M(_, h) {
                  (h == null || h > _.length) && (h = _.length);
                  for (var x = 0, N = new Array(h); x < h; x++) N[x] = _[x];
                  return N;
                }
                function O(_, h) {
                  for (var x = 0; x < h.length; x++) {
                    var N = h[x];
                    (N.enumerable = N.enumerable || !1),
                      (N.configurable = !0),
                      "value" in N && (N.writable = !0),
                      Object.defineProperty(_, I(N.key), N);
                  }
                }
                function b(_, h, x) {
                  return (
                    (h = I(h)) in _
                      ? Object.defineProperty(_, h, {
                          value: x,
                          enumerable: !0,
                          configurable: !0,
                          writable: !0,
                        })
                      : (_[h] = x),
                    _
                  );
                }
                function I(_) {
                  var h = (function (x, N) {
                    if (S(x) !== "object" || x === null) return x;
                    var C = x[Symbol.toPrimitive];
                    if (C !== void 0) {
                      var o = C.call(x, "string");
                      if (S(o) !== "object") return o;
                      throw new TypeError(
                        "@@toPrimitive must return a primitive value.",
                      );
                    }
                    return String(x);
                  })(_);
                  return S(h) === "symbol" ? h : String(h);
                }
                const Q = (function () {
                  function _(N, C) {
                    var o = this;
                    if (
                      ((function (i, E) {
                        if (!(i instanceof E))
                          throw new TypeError(
                            "Cannot call a class as a function",
                          );
                      })(this, _),
                      b(this, "state", {
                        cursorAnimation: null,
                        lastFrameTime: null,
                        pauseUntil: null,
                        eventQueue: [],
                        eventLoop: null,
                        eventLoopPaused: !1,
                        reverseCalledEvents: [],
                        calledEvents: [],
                        visibleNodes: [],
                        initialOptions: null,
                        elements: {
                          container: null,
                          wrapper: document.createElement("span"),
                          cursor: document.createElement("span"),
                        },
                      }),
                      b(this, "options", {
                        strings: null,
                        cursor: "|",
                        delay: "natural",
                        pauseFor: 1500,
                        deleteSpeed: "natural",
                        loop: !1,
                        autoStart: !1,
                        devMode: !1,
                        skipAddStyles: !1,
                        wrapperClassName: "Typewriter__wrapper",
                        cursorClassName: "Typewriter__cursor",
                        stringSplitter: null,
                        onCreateTextNode: null,
                        onRemoveNode: null,
                      }),
                      b(this, "setupWrapperElement", function () {
                        o.state.elements.container &&
                          ((o.state.elements.wrapper.className =
                            o.options.wrapperClassName),
                          (o.state.elements.cursor.className =
                            o.options.cursorClassName),
                          (o.state.elements.cursor.innerHTML =
                            o.options.cursor),
                          (o.state.elements.container.innerHTML = ""),
                          o.state.elements.container.appendChild(
                            o.state.elements.wrapper,
                          ),
                          o.state.elements.container.appendChild(
                            o.state.elements.cursor,
                          ));
                      }),
                      b(this, "start", function () {
                        return (
                          (o.state.eventLoopPaused = !1), o.runEventLoop(), o
                        );
                      }),
                      b(this, "pause", function () {
                        return (o.state.eventLoopPaused = !0), o;
                      }),
                      b(this, "stop", function () {
                        return (
                          o.state.eventLoop &&
                            ((0, z.cancel)(o.state.eventLoop),
                            (o.state.eventLoop = null)),
                          o
                        );
                      }),
                      b(this, "pauseFor", function (i) {
                        return o.addEventToQueue(p, { ms: i }), o;
                      }),
                      b(this, "typeOutAllStrings", function () {
                        return typeof o.options.strings == "string"
                          ? (o
                              .typeString(o.options.strings)
                              .pauseFor(o.options.pauseFor),
                            o)
                          : (o.options.strings.forEach(function (i) {
                              o.typeString(i)
                                .pauseFor(o.options.pauseFor)
                                .deleteAll(o.options.deleteSpeed);
                            }),
                            o);
                      }),
                      b(this, "typeString", function (i) {
                        var E =
                          arguments.length > 1 && arguments[1] !== void 0
                            ? arguments[1]
                            : null;
                        if (s(i)) return o.typeOutHTMLString(i, E);
                        if (i) {
                          var u = (o.options || {}).stringSplitter,
                            P = typeof u == "function" ? u(i) : i.split("");
                          o.typeCharacters(P, E);
                        }
                        return o;
                      }),
                      b(this, "pasteString", function (i) {
                        var E =
                          arguments.length > 1 && arguments[1] !== void 0
                            ? arguments[1]
                            : null;
                        return s(i)
                          ? o.typeOutHTMLString(i, E, !0)
                          : (i &&
                              o.addEventToQueue(w, { character: i, node: E }),
                            o);
                      }),
                      b(this, "typeOutHTMLString", function (i) {
                        var E =
                            arguments.length > 1 && arguments[1] !== void 0
                              ? arguments[1]
                              : null,
                          u = arguments.length > 2 ? arguments[2] : void 0,
                          P = (function (D) {
                            var F = document.createElement("div");
                            return (F.innerHTML = D), F.childNodes;
                          })(i);
                        if (P.length > 0)
                          for (var d = 0; d < P.length; d++) {
                            var j = P[d],
                              R = j.innerHTML;
                            j && j.nodeType !== 3
                              ? ((j.innerHTML = ""),
                                o.addEventToQueue(v, {
                                  node: j,
                                  parentNode: E,
                                }),
                                u ? o.pasteString(R, j) : o.typeString(R, j))
                              : j.textContent &&
                                (u
                                  ? o.pasteString(j.textContent, E)
                                  : o.typeString(j.textContent, E));
                          }
                        return o;
                      }),
                      b(this, "deleteAll", function () {
                        var i =
                          arguments.length > 0 && arguments[0] !== void 0
                            ? arguments[0]
                            : "natural";
                        return o.addEventToQueue(c, { speed: i }), o;
                      }),
                      b(this, "changeDeleteSpeed", function (i) {
                        if (!i)
                          throw new Error("Must provide new delete speed");
                        return o.addEventToQueue(g, { speed: i }), o;
                      }),
                      b(this, "changeDelay", function (i) {
                        if (!i) throw new Error("Must provide new delay");
                        return o.addEventToQueue(m, { delay: i }), o;
                      }),
                      b(this, "changeCursor", function (i) {
                        if (!i) throw new Error("Must provide new cursor");
                        return o.addEventToQueue(y, { cursor: i }), o;
                      }),
                      b(this, "deleteChars", function (i) {
                        if (!i)
                          throw new Error(
                            "Must provide amount of characters to delete",
                          );
                        for (var E = 0; E < i; E++) o.addEventToQueue(l);
                        return o;
                      }),
                      b(this, "callFunction", function (i, E) {
                        if (!i || typeof i != "function")
                          throw new Error("Callback must be a function");
                        return o.addEventToQueue(f, { cb: i, thisArg: E }), o;
                      }),
                      b(this, "typeCharacters", function (i) {
                        var E =
                          arguments.length > 1 && arguments[1] !== void 0
                            ? arguments[1]
                            : null;
                        if (!i || !Array.isArray(i))
                          throw new Error("Characters must be an array");
                        return (
                          i.forEach(function (u) {
                            o.addEventToQueue(r, { character: u, node: E });
                          }),
                          o
                        );
                      }),
                      b(this, "removeCharacters", function (i) {
                        if (!i || !Array.isArray(i))
                          throw new Error("Characters must be an array");
                        return (
                          i.forEach(function () {
                            o.addEventToQueue(l);
                          }),
                          o
                        );
                      }),
                      b(this, "addEventToQueue", function (i, E) {
                        var u =
                          arguments.length > 2 &&
                          arguments[2] !== void 0 &&
                          arguments[2];
                        return o.addEventToStateProperty(i, E, u, "eventQueue");
                      }),
                      b(this, "addReverseCalledEvent", function (i, E) {
                        var u =
                          arguments.length > 2 &&
                          arguments[2] !== void 0 &&
                          arguments[2];
                        return o.options.loop
                          ? o.addEventToStateProperty(
                              i,
                              E,
                              u,
                              "reverseCalledEvents",
                            )
                          : o;
                      }),
                      b(this, "addEventToStateProperty", function (i, E) {
                        var u =
                            arguments.length > 2 &&
                            arguments[2] !== void 0 &&
                            arguments[2],
                          P = arguments.length > 3 ? arguments[3] : void 0,
                          d = { eventName: i, eventArgs: E || {} };
                        return (
                          (o.state[P] = u
                            ? [d].concat(k(o.state[P]))
                            : [].concat(k(o.state[P]), [d])),
                          o
                        );
                      }),
                      b(this, "runEventLoop", function () {
                        o.state.lastFrameTime ||
                          (o.state.lastFrameTime = Date.now());
                        var i = Date.now(),
                          E = i - o.state.lastFrameTime;
                        if (!o.state.eventQueue.length) {
                          if (!o.options.loop) return;
                          (o.state.eventQueue = k(o.state.calledEvents)),
                            (o.state.calledEvents = []),
                            (o.options = L({}, o.state.initialOptions));
                        }
                        if (
                          ((o.state.eventLoop = t()(o.runEventLoop)),
                          !o.state.eventLoopPaused)
                        ) {
                          if (o.state.pauseUntil) {
                            if (i < o.state.pauseUntil) return;
                            o.state.pauseUntil = null;
                          }
                          var u,
                            P = k(o.state.eventQueue),
                            d = P.shift();
                          if (
                            !(
                              E <=
                              (u =
                                d.eventName === n || d.eventName === l
                                  ? o.options.deleteSpeed === "natural"
                                    ? e(40, 80)
                                    : o.options.deleteSpeed
                                  : o.options.delay === "natural"
                                    ? e(120, 160)
                                    : o.options.delay)
                            )
                          ) {
                            var j = d.eventName,
                              R = d.eventArgs;
                            switch (
                              (o.logInDevMode({
                                currentEvent: d,
                                state: o.state,
                                delay: u,
                              }),
                              j)
                            ) {
                              case w:
                              case r:
                                var D = R.character,
                                  F = R.node,
                                  W = document.createTextNode(D),
                                  G = W;
                                o.options.onCreateTextNode &&
                                  typeof o.options.onCreateTextNode ==
                                    "function" &&
                                  (G = o.options.onCreateTextNode(D, W)),
                                  G &&
                                    (F
                                      ? F.appendChild(G)
                                      : o.state.elements.wrapper.appendChild(
                                          G,
                                        )),
                                  (o.state.visibleNodes = [].concat(
                                    k(o.state.visibleNodes),
                                    [
                                      {
                                        type: "TEXT_NODE",
                                        character: D,
                                        node: G,
                                      },
                                    ],
                                  ));
                                break;
                              case l:
                                P.unshift({
                                  eventName: n,
                                  eventArgs: { removingCharacterNode: !0 },
                                });
                                break;
                              case p:
                                var Z = d.eventArgs.ms;
                                o.state.pauseUntil = Date.now() + parseInt(Z);
                                break;
                              case f:
                                var J = d.eventArgs,
                                  ie = J.cb,
                                  ee = J.thisArg;
                                ie.call(ee, { elements: o.state.elements });
                                break;
                              case v:
                                var ue = d.eventArgs,
                                  te = ue.node,
                                  ae = ue.parentNode;
                                ae
                                  ? ae.appendChild(te)
                                  : o.state.elements.wrapper.appendChild(te),
                                  (o.state.visibleNodes = [].concat(
                                    k(o.state.visibleNodes),
                                    [
                                      {
                                        type: T,
                                        node: te,
                                        parentNode:
                                          ae || o.state.elements.wrapper,
                                      },
                                    ],
                                  ));
                                break;
                              case c:
                                var de = o.state.visibleNodes,
                                  re = R.speed,
                                  X = [];
                                re &&
                                  X.push({
                                    eventName: g,
                                    eventArgs: { speed: re, temp: !0 },
                                  });
                                for (var ne = 0, ve = de.length; ne < ve; ne++)
                                  X.push({
                                    eventName: n,
                                    eventArgs: { removingCharacterNode: !1 },
                                  });
                                re &&
                                  X.push({
                                    eventName: g,
                                    eventArgs: {
                                      speed: o.options.deleteSpeed,
                                      temp: !0,
                                    },
                                  }),
                                  P.unshift.apply(P, X);
                                break;
                              case n:
                                var se = d.eventArgs.removingCharacterNode;
                                if (o.state.visibleNodes.length) {
                                  var K = o.state.visibleNodes.pop(),
                                    ce = K.type,
                                    oe = K.node,
                                    he = K.character;
                                  o.options.onRemoveNode &&
                                    typeof o.options.onRemoveNode ==
                                      "function" &&
                                    o.options.onRemoveNode({
                                      node: oe,
                                      character: he,
                                    }),
                                    oe && oe.parentNode.removeChild(oe),
                                    ce === T &&
                                      se &&
                                      P.unshift({
                                        eventName: n,
                                        eventArgs: {},
                                      });
                                }
                                break;
                              case g:
                                o.options.deleteSpeed = d.eventArgs.speed;
                                break;
                              case m:
                                o.options.delay = d.eventArgs.delay;
                                break;
                              case y:
                                (o.options.cursor = d.eventArgs.cursor),
                                  (o.state.elements.cursor.innerHTML =
                                    d.eventArgs.cursor);
                            }
                            o.options.loop &&
                              (d.eventName === n ||
                                (d.eventArgs && d.eventArgs.temp) ||
                                (o.state.calledEvents = [].concat(
                                  k(o.state.calledEvents),
                                  [d],
                                ))),
                              (o.state.eventQueue = P),
                              (o.state.lastFrameTime = i);
                          }
                        }
                      }),
                      N)
                    )
                      if (typeof N == "string") {
                        var a = document.querySelector(N);
                        if (!a)
                          throw new Error("Could not find container element");
                        this.state.elements.container = a;
                      } else this.state.elements.container = N;
                    C && (this.options = L(L({}, this.options), C)),
                      (this.state.initialOptions = L({}, this.options)),
                      this.init();
                  }
                  var h, x;
                  return (
                    (h = _),
                    (x = [
                      {
                        key: "init",
                        value: function () {
                          var N, C;
                          this.setupWrapperElement(),
                            this.addEventToQueue(
                              y,
                              { cursor: this.options.cursor },
                              !0,
                            ),
                            this.addEventToQueue(c, null, !0),
                            !window ||
                              window.___TYPEWRITER_JS_STYLES_ADDED___ ||
                              this.options.skipAddStyles ||
                              ((N =
                                ".Typewriter__cursor{-webkit-animation:Typewriter-cursor 1s infinite;animation:Typewriter-cursor 1s infinite;margin-left:1px}@-webkit-keyframes Typewriter-cursor{0%{opacity:0}50%{opacity:1}100%{opacity:0}}@keyframes Typewriter-cursor{0%{opacity:0}50%{opacity:1}100%{opacity:0}}"),
                              (C = document.createElement("style")).appendChild(
                                document.createTextNode(N),
                              ),
                              document.head.appendChild(C),
                              (window.___TYPEWRITER_JS_STYLES_ADDED___ = !0)),
                            this.options.autoStart === !0 &&
                              this.options.strings &&
                              this.typeOutAllStrings().start();
                        },
                      },
                      {
                        key: "logInDevMode",
                        value: function (N) {
                          this.options.devMode && console.log(N);
                        },
                      },
                    ]) && O(h.prototype, x),
                    Object.defineProperty(h, "prototype", { writable: !1 }),
                    _
                  );
                })();
              })(),
              V.default
            );
          })(),
        );
      })(fe)),
    fe.exports
  );
}
var Le = Ne();
const Me = Se(Le),
  Pe = document.querySelectorAll("section");
class ke extends HTMLElement {
  isDragging;
  startY;
  startMarginTop;
  links = document.querySelectorAll("nav-collabsible a.nav-link");
  subtitle = document.querySelector("nav-collabsible h3");
  typewriter;
  lastLink;
  debounceTimeout;
  constructor() {
    super(),
      (this.isDragging = !1),
      (this.startY = 0),
      (this.startMarginTop = 0),
      (this.typewriter = new Me(this.subtitle, { delay: 60 })),
      this.determineSelectedSection();
  }
  connectedCallback() {
    this.addListeners();
  }
  disconnectedCallback() {
    this.removeListeners();
  }
  addListeners() {
    this.parentElement?.addEventListener("click", this.handleClick),
      window.addEventListener("mousedown", this.onMouseDown),
      window.addEventListener("wheel", this.onScroll),
      window.addEventListener("mouseup", this.onMouseUp),
      window.addEventListener("mousemove", this.onMouseMove),
      window.addEventListener("touchstart", this.onTouchStart, { passive: !1 }),
      window.addEventListener("touchmove", this.onTouchMove, { passive: !1 }),
      window.addEventListener("touchend", this.onTouchEnd),
      window.addEventListener("resize", this.onResize),
      window.addEventListener("hashchange", this.onHashChange),
      window.addEventListener("scroll", this.determineSelectedSection);
  }
  removeListeners() {
    this.parentElement?.removeEventListener("click", this.handleClick),
      window.removeEventListener("mousedown", this.onMouseDown),
      window.removeEventListener("wheel", this.onScroll),
      window.removeEventListener("mouseup", this.onMouseUp),
      window.removeEventListener("mousemove", this.onMouseMove),
      window.removeEventListener("touchstart", this.onTouchStart),
      window.removeEventListener("touchmove", this.onTouchMove),
      window.removeEventListener("touchend", this.onTouchEnd),
      window.removeEventListener("resize", this.onResize),
      window.removeEventListener("hashchange", this.onHashChange),
      window.removeEventListener("scroll", this.determineSelectedSection);
  }
  isMobile = () => getComputedStyle(this.subtitle).display === "none";
  handleClick = ($) => {
    const Y = $.target;
    this.classList.toggle("open", Y.classList.contains("opener"));
  };
  updateSubtitle($) {
    if ($ === this.lastLink || this.isMobile()) return;
    const Y = $ ? $.title : this.subtitle.title;
    this.typewriter.stop().deleteAll("natural").typeString(Y).start(),
      (this.lastLink = $);
  }
  debouncedUpdateSubtitle = ($) => {
    this.debounceTimeout && clearTimeout(this.debounceTimeout),
      (this.debounceTimeout = setTimeout(() => this.updateSubtitle($), 350));
  };
  determineSelectedSection = () => {
    let $ = null;
    for (const q of Pe) {
      const U = q.getBoundingClientRect();
      if (
        (U.top >= 0 && U.top <= window.innerHeight / 2) ||
        (U.bottom >= window.innerHeight / 2 &&
          U.bottom <= window.innerHeight) ||
        (U.top < 0 && U.bottom > window.innerHeight)
      ) {
        $ = q;
        break;
      }
    }
    if (!$) return;
    let Y = !0;
    this.links.forEach((q) => {
      const U = this.classList.contains("selected"),
        V = q.getAttribute("href") === `#${$.id}`;
      q.classList.toggle("selected", V),
        V && !U && (this.debouncedUpdateSubtitle(q), (Y = !1));
    }),
      Y && this.debouncedUpdateSubtitle(null);
  };
  onHashChange = () => {
    this.reactQuicklyToChanges();
  };
  onResize = () => {
    this.reactQuicklyToChanges();
  };
  onMouseDown = ($) => {
    (this.isDragging = !0),
      (this.startY = $.clientY),
      (this.startMarginTop = parseFloat(this.style.marginTop) || 0);
  };
  onMouseUp = () => {
    this.isDragging = !1;
  };
  onMouseMove = ($) => {
    if (!this.isDragging) return;
    const Y = $.clientY - this.startY;
    this.updateMarginTop(this.startMarginTop + Y);
  };
  onScroll = ($) => {
    const Y = $.deltaY,
      q = parseFloat(this.style.marginTop) || 0;
    this.updateMarginTop(q - Y);
  };
  onTouchStart = ($) => {
    (this.isDragging = !0),
      (this.startY = $.touches[0].clientY),
      (this.startMarginTop = parseFloat(this.style.marginTop) || 0);
  };
  onTouchMove = ($) => {
    if (!this.isDragging) return;
    $.preventDefault();
    const Y = $.touches[0].clientY - this.startY;
    this.updateMarginTop(this.startMarginTop + Y);
  };
  onTouchEnd = () => {
    this.isDragging = !1;
  };
  updateMarginTop($) {
    if (!this.isMobile()) {
      const Y = this.offsetHeight,
        q = Math.max(-Y, Math.min(0, $));
      this.style.marginTop = `${q}px`;
    }
    this.updateBorderOpacity();
  }
  updateBorderOpacity() {
    const $ = window.scrollY,
      Y = 0.2,
      q = Math.max(this.offsetHeight, 10),
      U = Math.min(Y, $ / q);
    this.parentElement?.parentElement &&
      (this.parentElement.parentElement.style.borderBottom = `solid 1px rgba(0, 0, 0, ${U})`);
  }
  reactQuicklyToChanges() {
    this.updateMarginTop(-window.scrollY), this.updateBorderOpacity();
  }
}
customElements.define("nav-collabsible", ke);
