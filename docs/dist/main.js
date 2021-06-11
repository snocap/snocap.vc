function ue() {}
function se(n, e) {
	for (let t in e) n[t] = e[t]
	return n
}
function rt(n) {
	return n()
}
function it() {
	return Object.create(null)
}
function Se(n) {
	n.forEach(rt)
}
function yt(n) {
	return typeof n == 'function'
}
function G(n, e) {
	return n != n ? e == e : n !== e || (n && typeof n == 'object') || typeof n == 'function'
}
function xt(n) {
	return Object.keys(n).length === 0
}
function kt(n, ...e) {
	if (n == null) return ue
	let t = n.subscribe(...e)
	return t.unsubscribe ? () => t.unsubscribe() : t
}
function fe(n, e, t) {
	n.$$.on_destroy.push(kt(e, t))
}
function me(n, e, t, s) {
	if (n) {
		let o = at(n, e, t, s)
		return n[0](o)
	}
}
function at(n, e, t, s) {
	return n[1] && s ? se(t.ctx.slice(), n[1](s(e))) : t.ctx
}
function St(n, e, t, s) {
	if (n[2] && s) {
		let o = n[2](s(t))
		if (e.dirty === void 0) return o
		if (typeof o == 'object') {
			let r = [],
				u = Math.max(e.dirty.length, o.length)
			for (let a = 0; a < u; a += 1) r[a] = e.dirty[a] | o[a]
			return r
		}
		return e.dirty | o
	}
	return e.dirty
}
function de(n, e, t, s, o, r, u) {
	let a = St(e, s, o, r)
	if (a) {
		let c = at(e, t, s, u)
		n.p(c, a)
	}
}
function je(n) {
	let e = {}
	for (let t in n) t[0] !== '$' && (e[t] = n[t])
	return e
}
function pe(n, e) {
	let t = {}
	e = new Set(e)
	for (let s in n) !e.has(s) && s[0] !== '$' && (t[s] = n[s])
	return t
}
function p(n, e) {
	n.appendChild(e)
}
function h(n, e, t) {
	n.insertBefore(e, t || null)
}
function _(n) {
	n.parentNode.removeChild(n)
}
function g(n) {
	return document.createElement(n)
}
function w(n) {
	return document.createTextNode(n)
}
function A() {
	return w(' ')
}
function v(n, e, t) {
	t == null ? n.removeAttribute(e) : n.getAttribute(e) !== t && n.setAttribute(e, t)
}
function Te(n, e) {
	let t = Object.getOwnPropertyDescriptors(n.__proto__)
	for (let s in e)
		e[s] == null
			? n.removeAttribute(s)
			: s === 'style'
			? (n.style.cssText = e[s])
			: s === '__value'
			? (n.value = n[s] = e[s])
			: t[s] && t[s].set
			? (n[s] = e[s])
			: v(n, s, e[s])
}
function jt(n) {
	return Array.from(n.childNodes)
}
function He(n, e) {
	;(e = '' + e), n.wholeText !== e && (n.data = e)
}
function qe(n, e, t, s) {
	n.style.setProperty(e, t, s ? 'important' : '')
}
function N(n, e, t) {
	n.classList[t ? 'add' : 'remove'](e)
}
var Oe
function Le(n) {
	Oe = n
}
function zt() {
	if (!Oe) throw new Error('Function called outside component initialization')
	return Oe
}
function Ne(n) {
	zt().$$.on_mount.push(n)
}
var ze = [],
	lt = [],
	Pe = [],
	ct = [],
	Et = Promise.resolve(),
	Ue = !1
function At() {
	Ue || ((Ue = !0), Et.then(ut))
}
function Me(n) {
	Pe.push(n)
}
var De = !1,
	Qe = new Set()
function ut() {
	if (!De) {
		De = !0
		do {
			for (let n = 0; n < ze.length; n += 1) {
				let e = ze[n]
				Le(e), Ct(e.$$)
			}
			for (Le(null), ze.length = 0; lt.length; ) lt.pop()()
			for (let n = 0; n < Pe.length; n += 1) {
				let e = Pe[n]
				Qe.has(e) || (Qe.add(e), e())
			}
			Pe.length = 0
		} while (ze.length)
		for (; ct.length; ) ct.pop()()
		;(Ue = !1), (De = !1), Qe.clear()
	}
}
function Ct(n) {
	if (n.fragment !== null) {
		n.update(), Se(n.before_update)
		let e = n.dirty
		;(n.dirty = [-1]), n.fragment && n.fragment.p(n.ctx, e), n.after_update.forEach(Me)
	}
}
var Re = new Set(),
	_e
function Ge() {
	_e = { r: 0, c: [], p: _e }
}
function Be() {
	_e.r || Se(_e.c), (_e = _e.p)
}
function b(n, e) {
	n && n.i && (Re.delete(n), n.i(e))
}
function y(n, e, t, s) {
	if (n && n.o) {
		if (Re.has(n)) return
		Re.add(n),
			_e.c.push(() => {
				Re.delete(n), s && (t && n.d(1), s())
			}),
			n.o(e)
	}
}
function Ee(n, e) {
	let t = {},
		s = {},
		o = { $$scope: 1 },
		r = n.length
	for (; r--; ) {
		let u = n[r],
			a = e[r]
		if (a) {
			for (let c in u) c in a || (s[c] = 1)
			for (let c in a) o[c] || ((t[c] = a[c]), (o[c] = 1))
			n[r] = a
		} else for (let c in u) o[c] = 1
	}
	for (let u in s) u in t || (t[u] = void 0)
	return t
}
function Je(n) {
	return typeof n == 'object' && n !== null ? n : {}
}
function z(n) {
	n && n.c()
}
function S(n, e, t, s) {
	let { fragment: o, on_mount: r, on_destroy: u, after_update: a } = n.$$
	o && o.m(e, t),
		s ||
			Me(() => {
				let c = r.map(rt).filter(yt)
				u ? u.push(...c) : Se(c), (n.$$.on_mount = [])
			}),
		a.forEach(Me)
}
function j(n, e) {
	let t = n.$$
	t.fragment !== null &&
		(Se(t.on_destroy), t.fragment && t.fragment.d(e), (t.on_destroy = t.fragment = null), (t.ctx = []))
}
function It(n, e) {
	n.$$.dirty[0] === -1 && (ze.push(n), At(), n.$$.dirty.fill(0)), (n.$$.dirty[(e / 31) | 0] |= 1 << e % 31)
}
function Z(n, e, t, s, o, r, u = [-1]) {
	let a = Oe
	Le(n)
	let c = (n.$$ = {
			fragment: null,
			ctx: null,
			props: r,
			update: ue,
			not_equal: o,
			bound: it(),
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(a ? a.$$.context : e.context || []),
			callbacks: it(),
			dirty: u,
			skip_bound: !1,
		}),
		i = !1
	if (
		((c.ctx = t
			? t(n, e.props || {}, (f, l, ...m) => {
					let x = m.length ? m[0] : l
					return (
						c.ctx && o(c.ctx[f], (c.ctx[f] = x)) && (!c.skip_bound && c.bound[f] && c.bound[f](x), i && It(n, f)), l
					)
			  })
			: []),
		c.update(),
		(i = !0),
		Se(c.before_update),
		(c.fragment = s ? s(c.ctx) : !1),
		e.target)
	) {
		if (e.hydrate) {
			let f = jt(e.target)
			c.fragment && c.fragment.l(f), f.forEach(_)
		} else c.fragment && c.fragment.c()
		e.intro && b(n.$$.fragment), S(n, e.target, e.anchor, e.customElement), ut()
	}
	Le(a)
}
var K = class {
	$destroy() {
		j(this, 1), (this.$destroy = ue)
	}
	$on(e, t) {
		let s = this.$$.callbacks[e] || (this.$$.callbacks[e] = [])
		return (
			s.push(t),
			() => {
				let o = s.indexOf(t)
				o !== -1 && s.splice(o, 1)
			}
		)
	}
	$set(e) {
		this.$$set && !xt(e) && ((this.$$.skip_bound = !0), this.$$set(e), (this.$$.skip_bound = !1))
	}
}
var B
;(function (n) {
	;(n.Regular = 'regular'), (n.Mono = 'mono')
})(B || (B = {}))
var O
;(function (n) {
	;(n.Title = 'title'), (n.Header = 'header'), (n.Aside = 'aside'), (n.Paragraph = 'paragraph'), (n.Small = 'small')
})(O || (O = {}))
var ge
;(function (n) {
	;(n.Horizontal = 'horizontal'), (n.Vertical = 'vertical')
})(ge || (ge = {}))
function Tt(n) {
	let e,
		t,
		s = n[7].default,
		o = me(s, n, n[6], null),
		r = [{ class: n[0] }, n[1]],
		u = {}
	for (let a = 0; a < r.length; a += 1) u = se(u, r[a])
	return {
		c() {
			;(e = g('span')), o && o.c(), Te(e, u), N(e, 'svelte-fm1kns', !0)
		},
		m(a, c) {
			h(a, e, c), o && o.m(e, null), (t = !0)
		},
		p(a, [c]) {
			o && o.p && (!t || c & 64) && de(o, s, a, a[6], c, null, null),
				Te(e, (u = Ee(r, [(!t || c & 1) && { class: a[0] }, c & 2 && a[1]]))),
				N(e, 'svelte-fm1kns', !0)
		},
		i(a) {
			t || (b(o, a), (t = !0))
		},
		o(a) {
			y(o, a), (t = !1)
		},
		d(a) {
			a && _(e), o && o.d(a)
		},
	}
}
function qt(n, e, t) {
	let s,
		o = ['family', 'size', 'orientation', 'class'],
		r = pe(e, o),
		{ $$slots: u = {}, $$scope: a } = e,
		{ family: c = B.Regular } = e,
		{ size: i = O.Paragraph } = e,
		{ orientation: f = ge.Horizontal } = e,
		{ class: l = '' } = e
	return (
		(n.$$set = (m) => {
			;(e = se(se({}, e), je(m))),
				t(1, (r = pe(e, o))),
				'family' in m && t(2, (c = m.family)),
				'size' in m && t(3, (i = m.size)),
				'orientation' in m && t(4, (f = m.orientation)),
				'class' in m && t(5, (l = m.class)),
				'$$scope' in m && t(6, (a = m.$$scope))
		}),
		(n.$$.update = () => {
			if (n.$$.dirty & 60) {
				e: t(0, (s = `family-${c} size-${i} orientation-${f} ${l}`))
			}
		}),
		[s, r, c, i, f, l, a, u]
	)
}
var ft = class extends K {
		constructor(e) {
			super()
			Z(this, e, qt, Tt, G, { family: 2, size: 3, orientation: 4, class: 5 })
		}
	},
	U = ft
var $e = []
function Ot(n, e = ue) {
	let t,
		s = []
	function o(a) {
		if (G(n, a) && ((n = a), t)) {
			let c = !$e.length
			for (let i = 0; i < s.length; i += 1) {
				let f = s[i]
				f[1](), $e.push(f, n)
			}
			if (c) {
				for (let i = 0; i < $e.length; i += 2) $e[i][0]($e[i + 1])
				$e.length = 0
			}
		}
	}
	function r(a) {
		o(a(n))
	}
	function u(a, c = ue) {
		let i = [a, c]
		return (
			s.push(i),
			s.length === 1 && (t = e(o) || ue),
			a(n),
			() => {
				let f = s.indexOf(i)
				f !== -1 && s.splice(f, 1), s.length === 0 && (t(), (t = null))
			}
		)
	}
	return { set: o, update: r, subscribe: u }
}
function Lt(n) {
	return Ot({}, (e) => {
		if (typeof window == 'undefined') return
		let t = {},
			s = () =>
				e(
					(function (o) {
						let r = { classNames: '' },
							u = []
						for (let a in o) (r[a] = o[a].matches), r[a] && u.push('media-' + a)
						return (r.classNames = u.join(' ')), r
					})(t)
				)
		for (let o in n) {
			let r = window.matchMedia(n[o])
			;(t[o] = r), t[o].addListener(s)
		}
		return (
			s(),
			() => {
				for (let o in t) t[o].removeListener(s)
			}
		)
	})
}
var mt = Lt
var Pt = {
		sm: '(min-width: 48em)',
		md: '(min-width: 62em)',
		lg: '(min-width: 75em)',
		landscape: '(orientation: landscape)',
		portrait: '(orientation: portrait)',
		dark: '(prefers-color-scheme: dark)',
		light: '(prefers-color-scheme: light)',
		noanimations: '(prefers-reduced-motion: reduce)',
	},
	Rt = mt(Pt),
	ve = Rt
function Ft(n) {
	let e,
		t = n[2].default,
		s = me(t, n, n[3], null)
	return {
		c() {
			s && s.c()
		},
		m(o, r) {
			s && s.m(o, r), (e = !0)
		},
		p(o, r) {
			s && s.p && (!e || r & 8) && de(s, t, o, o[3], r, null, null)
		},
		i(o) {
			e || (b(s, o), (e = !0))
		},
		o(o) {
			y(s, o), (e = !1)
		},
		d(o) {
			s && s.d(o)
		},
	}
}
function Ht(n) {
	let e,
		t,
		s,
		o = [{ class: 'text' }, n[1]],
		r = { $$slots: { default: [Ft] }, $$scope: { ctx: n } }
	for (let u = 0; u < o.length; u += 1) r = se(r, o[u])
	return (
		(t = new U({ props: r })),
		{
			c() {
				;(e = g('a')), z(t.$$.fragment), v(e, 'href', n[0]), v(e, 'class', 'svelte-10yjx9y')
			},
			m(u, a) {
				h(u, e, a), S(t, e, null), (s = !0)
			},
			p(u, [a]) {
				let c = a & 2 ? Ee(o, [o[0], Je(u[1])]) : {}
				a & 8 && (c.$$scope = { dirty: a, ctx: u }), t.$set(c), (!s || a & 1) && v(e, 'href', u[0])
			},
			i(u) {
				s || (b(t.$$.fragment, u), (s = !0))
			},
			o(u) {
				y(t.$$.fragment, u), (s = !1)
			},
			d(u) {
				u && _(e), j(t)
			},
		}
	)
}
function Nt(n, e, t) {
	let s = ['href'],
		o = pe(e, s),
		{ $$slots: r = {}, $$scope: u } = e,
		{ href: a } = e
	return (
		(n.$$set = (c) => {
			;(e = se(se({}, e), je(c))),
				t(1, (o = pe(e, s))),
				'href' in c && t(0, (a = c.href)),
				'$$scope' in c && t(3, (u = c.$$scope))
		}),
		[a, o, r, u]
	)
}
var dt = class extends K {
		constructor(e) {
			super()
			Z(this, e, Nt, Ht, G, { href: 0 })
		}
	},
	ie = dt
function Ut(n) {
	let e
	return {
		c() {
			e = w('People')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function Mt(n) {
	let e
	return {
		c() {
			e = w('Contact')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function pt(n) {
	let e
	return {
		c() {
			e = g('br')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function Dt(n) {
	let e,
		t,
		s = !n[0] && pt(n)
	return {
		c() {
			;(e = w('SNØ is building a future ')), s && s.c(), (t = w(' beyond sustainability.'))
		},
		m(o, r) {
			h(o, e, r), s && s.m(o, r), h(o, t, r)
		},
		p(o, r) {
			o[0] ? s && (s.d(1), (s = null)) : s || ((s = pt(o)), s.c(), s.m(t.parentNode, t))
		},
		d(o) {
			o && _(e), s && s.d(o), o && _(t)
		},
	}
}
function Qt(n) {
	let e, t, s, o, r, u, a, c, i, f
	return (
		(s = new ie({ props: { size: O.Small, href: '#people', $$slots: { default: [Ut] }, $$scope: { ctx: n } } })),
		(a = new ie({ props: { size: O.Small, href: '#contact', $$slots: { default: [Mt] }, $$scope: { ctx: n } } })),
		(i = new U({
			props: { class: 'col-xs-12 col-sm-8', size: O.Title, $$slots: { default: [Dt] }, $$scope: { ctx: n } },
		})),
		{
			c() {
				;(e = g('header')),
					(t = g('nav')),
					z(s.$$.fragment),
					(o = A()),
					(r = g('div')),
					(u = A()),
					z(a.$$.fragment),
					(c = A()),
					z(i.$$.fragment),
					v(r, 'class', 'padding svelte-4ofjzx'),
					v(t, 'class', 'col-xs-2 col-sm-4 svelte-4ofjzx'),
					N(t, 'col-xs-offset-10', n[0]),
					N(t, 'padded', n[0]),
					v(e, 'class', 'row svelte-4ofjzx'),
					N(e, 'reverse', !n[0])
			},
			m(l, m) {
				h(l, e, m), p(e, t), S(s, t, null), p(t, o), p(t, r), p(t, u), S(a, t, null), p(e, c), S(i, e, null), (f = !0)
			},
			p(l, [m]) {
				let x = {}
				m & 4 && (x.$$scope = { dirty: m, ctx: l }), s.$set(x)
				let C = {}
				m & 4 && (C.$$scope = { dirty: m, ctx: l }),
					a.$set(C),
					m & 1 && N(t, 'col-xs-offset-10', l[0]),
					m & 1 && N(t, 'padded', l[0])
				let E = {}
				m & 5 && (E.$$scope = { dirty: m, ctx: l }), i.$set(E), m & 1 && N(e, 'reverse', !l[0])
			},
			i(l) {
				f || (b(s.$$.fragment, l), b(a.$$.fragment, l), b(i.$$.fragment, l), (f = !0))
			},
			o(l) {
				y(s.$$.fragment, l), y(a.$$.fragment, l), y(i.$$.fragment, l), (f = !1)
			},
			d(l) {
				l && _(e), j(s), j(a), j(i)
			},
		}
	)
}
function Gt(n, e, t) {
	let s, o
	return (
		fe(n, ve, (r) => t(1, (o = r))),
		(n.$$.update = () => {
			if (n.$$.dirty & 2) {
				e: t(0, (s = !o.sm))
			}
		}),
		[s, o]
	)
}
var _t = class extends K {
		constructor(e) {
			super()
			Z(this, e, Gt, Qt, G, {})
		}
	},
	ht = _t
function Bt(n) {
	let e
	return {
		c() {
			e = w(n[0])
		},
		m(t, s) {
			h(t, e, s)
		},
		p(t, s) {
			s & 1 && He(e, t[0])
		},
		d(t) {
			t && _(e)
		},
	}
}
function Jt(n) {
	let e
	return {
		c() {
			e = w('LINKEDIN')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function Kt(n) {
	let e,
		t,
		s,
		o,
		r,
		u,
		a = n[6].default,
		c = me(a, n, n[7], null)
	return (
		(o = new ie({
			props: { family: B.Mono, size: O.Paragraph, href: n[1], $$slots: { default: [Jt] }, $$scope: { ctx: n } },
		})),
		{
			c() {
				c && c.c(),
					(e = g('br')),
					(t = g('br')),
					(s = w(`
				[`)),
					z(o.$$.fragment),
					(r = w(']'))
			},
			m(i, f) {
				c && c.m(i, f), h(i, e, f), h(i, t, f), h(i, s, f), S(o, i, f), h(i, r, f), (u = !0)
			},
			p(i, f) {
				c && c.p && (!u || f & 128) && de(c, a, i, i[7], f, null, null)
				let l = {}
				f & 2 && (l.href = i[1]), f & 128 && (l.$$scope = { dirty: f, ctx: i }), o.$set(l)
			},
			i(i) {
				u || (b(c, i), b(o.$$.fragment, i), (u = !0))
			},
			o(i) {
				y(c, i), y(o.$$.fragment, i), (u = !1)
			},
			d(i) {
				c && c.d(i), i && _(e), i && _(t), i && _(s), j(o, i), i && _(r)
			},
		}
	)
}
function Vt(n) {
	let e, t, s, o, r, u, a, c, i, f
	return (
		(s = new U({ props: { size: O.Header, $$slots: { default: [Bt] }, $$scope: { ctx: n } } })),
		(u = new U({ props: { family: B.Mono, size: O.Paragraph, $$slots: { default: [Kt] }, $$scope: { ctx: n } } })),
		{
			c() {
				;(e = g('div')),
					(t = g('div')),
					z(s.$$.fragment),
					(o = A()),
					(r = g('p')),
					z(u.$$.fragment),
					(a = A()),
					(c = g('div')),
					(i = g('div')),
					v(t, 'class', 'text col-sm-8 col-xs-11 svelte-17dsxn9'),
					v(i, 'class', 'figure svelte-17dsxn9'),
					qe(i, 'background-image', "url('" + n[2] + "')"),
					v(c, 'class', 'image col-sm-4 col-xs-11 svelte-17dsxn9'),
					v(e, 'class', 'row end-xs start-sm svelte-17dsxn9'),
					N(e, 'reverse', n[3])
			},
			m(l, m) {
				h(l, e, m), p(e, t), S(s, t, null), p(t, o), p(t, r), S(u, r, null), p(e, a), p(e, c), p(c, i), (f = !0)
			},
			p(l, [m]) {
				let x = {}
				m & 129 && (x.$$scope = { dirty: m, ctx: l }), s.$set(x)
				let C = {}
				m & 130 && (C.$$scope = { dirty: m, ctx: l }),
					u.$set(C),
					(!f || m & 4) && qe(i, 'background-image', "url('" + l[2] + "')"),
					m & 8 && N(e, 'reverse', l[3])
			},
			i(l) {
				f || (b(s.$$.fragment, l), b(u.$$.fragment, l), (f = !0))
			},
			o(l) {
				y(s.$$.fragment, l), y(u.$$.fragment, l), (f = !1)
			},
			d(l) {
				l && _(e), j(s), j(u)
			},
		}
	)
}
function Yt(n, e, t) {
	let s, o
	fe(n, ve, (l) => t(5, (o = l)))
	let { $$slots: r = {}, $$scope: u } = e,
		{ name: a } = e,
		{ linkedinURI: c } = e,
		{ headshotURI: i } = e,
		{ reversed: f = !1 } = e
	return (
		(n.$$set = (l) => {
			'name' in l && t(0, (a = l.name)),
				'linkedinURI' in l && t(1, (c = l.linkedinURI)),
				'headshotURI' in l && t(2, (i = l.headshotURI)),
				'reversed' in l && t(4, (f = l.reversed)),
				'$$scope' in l && t(7, (u = l.$$scope))
		}),
		(n.$$.update = () => {
			if (n.$$.dirty & 48) {
				e: t(3, (s = f && o.sm))
			}
		}),
		[a, c, i, s, f, o, r, u]
	)
}
var gt = class extends K {
		constructor(e) {
			super()
			Z(this, e, Yt, Vt, G, { name: 0, linkedinURI: 1, headshotURI: 2, reversed: 4 })
		}
	},
	Fe = gt
var Ke =
	typeof globalThis != 'undefined'
		? globalThis
		: typeof window != 'undefined'
		? window
		: typeof global != 'undefined'
		? global
		: typeof self != 'undefined'
		? self
		: {}
function Xt(n, e, t) {
	return (
		(t = {
			path: e,
			exports: {},
			require: function (s, o) {
				return Wt(s, o == null ? t.path : o)
			},
		}),
		n(t, t.exports),
		t.exports
	)
}
function Wt() {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs')
}
var Zt = Xt(function (n, e) {
		window.Element &&
			!Element.prototype.closest &&
			(Element.prototype.closest = function (t) {
				var s,
					o = (this.document || this.ownerDocument).querySelectorAll(t),
					r = this
				do for (s = o.length; 0 <= --s && o.item(s) !== r; );
				while (s < 0 && (r = r.parentElement))
				return r
			}),
			(function () {
				if (typeof window.CustomEvent == 'function') return
				function t(s, o) {
					o = o || { bubbles: !1, cancelable: !1, detail: void 0 }
					var r = document.createEvent('CustomEvent')
					return r.initCustomEvent(s, o.bubbles, o.cancelable, o.detail), r
				}
				;(t.prototype = window.Event.prototype), (window.CustomEvent = t)
			})(),
			(function () {
				for (var t = 0, s = ['ms', 'moz', 'webkit', 'o'], o = 0; o < s.length && !window.requestAnimationFrame; ++o)
					(window.requestAnimationFrame = window[s[o] + 'RequestAnimationFrame']),
						(window.cancelAnimationFrame =
							window[s[o] + 'CancelAnimationFrame'] || window[s[o] + 'CancelRequestAnimationFrame'])
				window.requestAnimationFrame ||
					(window.requestAnimationFrame = function (r, u) {
						var a = new Date().getTime(),
							c = Math.max(0, 16 - (a - t)),
							i = window.setTimeout(function () {
								r(a + c)
							}, c)
						return (t = a + c), i
					}),
					window.cancelAnimationFrame ||
						(window.cancelAnimationFrame = function (r) {
							clearTimeout(r)
						})
			})(),
			(function (t, s) {
				n.exports = s(t)
			})(typeof Ke != 'undefined' ? Ke : typeof window != 'undefined' ? window : Ke, function (t) {
				var s = {
						ignore: '[data-scroll-ignore]',
						header: null,
						topOnEmptyHash: !0,
						speed: 500,
						speedAsDuration: !1,
						durationMax: null,
						durationMin: null,
						clip: !0,
						offset: 0,
						easing: 'easeInOutCubic',
						customEasing: null,
						updateURL: !0,
						popstate: !0,
						emitEvents: !0,
					},
					o = function () {
						var f = {}
						return (
							Array.prototype.forEach.call(arguments, function (l) {
								for (var m in l) {
									if (!l.hasOwnProperty(m)) return
									f[m] = l[m]
								}
							}),
							f
						)
					},
					r = function (f) {
						f.charAt(0) === '#' && (f = f.substr(1))
						for (var l, m = String(f), x = m.length, C = -1, E = '', L = m.charCodeAt(0); ++C < x; ) {
							if ((l = m.charCodeAt(C)) === 0)
								throw new InvalidCharacterError('Invalid character: the input contains U+0000.')
							;(1 <= l && l <= 31) ||
							l == 127 ||
							(C === 0 && 48 <= l && l <= 57) ||
							(C === 1 && 48 <= l && l <= 57 && L === 45)
								? (E += '\\' + l.toString(16) + ' ')
								: (E +=
										128 <= l ||
										l === 45 ||
										l === 95 ||
										(48 <= l && l <= 57) ||
										(65 <= l && l <= 90) ||
										(97 <= l && l <= 122)
											? m.charAt(C)
											: '\\' + m.charAt(C))
						}
						return '#' + E
					},
					u = function () {
						return Math.max(
							document.body.scrollHeight,
							document.documentElement.scrollHeight,
							document.body.offsetHeight,
							document.documentElement.offsetHeight,
							document.body.clientHeight,
							document.documentElement.clientHeight
						)
					},
					a = function (f) {
						return f ? ((l = f), parseInt(t.getComputedStyle(l).height, 10) + f.offsetTop) : 0
						var l
					},
					c = function (f, l, m) {
						f === 0 && document.body.focus(),
							m ||
								(f.focus(),
								document.activeElement !== f &&
									(f.setAttribute('tabindex', '-1'), f.focus(), (f.style.outline = 'none')),
								t.scrollTo(0, l))
					},
					i = function (f, l, m, x) {
						if (l.emitEvents && typeof t.CustomEvent == 'function') {
							var C = new CustomEvent(f, { bubbles: !0, detail: { anchor: m, toggle: x } })
							document.dispatchEvent(C)
						}
					}
				return function (f, l) {
					var m,
						x,
						C,
						E,
						L = {}
					;(L.cancelScroll = function (k) {
						cancelAnimationFrame(E), (E = null), k || i('scrollCancel', m)
					}),
						(L.animateScroll = function (k, q, V) {
							L.cancelScroll()
							var I = o(m || s, V || {}),
								Q = Object.prototype.toString.call(k) === '[object Number]',
								J = Q || !k.tagName ? null : k
							if (Q || J) {
								var Y = t.pageYOffset
								I.header && !C && (C = document.querySelector(I.header))
								var we,
									M,
									ae,
									te,
									oe,
									re,
									D,
									W,
									Ae = a(C),
									he = Q
										? k
										: (function (P, R, d, F) {
												var X = 0
												if (P.offsetParent) for (; (X += P.offsetTop), (P = P.offsetParent); );
												return (X = Math.max(X - R - d, 0)), F && (X = Math.min(X, u() - t.innerHeight)), X
										  })(J, Ae, parseInt(typeof I.offset == 'function' ? I.offset(k, q) : I.offset, 10), I.clip),
									ye = he - Y,
									Ce = u(),
									ne = 0,
									xe =
										((we = ye),
										(ae = (M = I).speedAsDuration ? M.speed : Math.abs((we / 1e3) * M.speed)),
										M.durationMax && ae > M.durationMax
											? M.durationMax
											: M.durationMin && ae < M.durationMin
											? M.durationMin
											: parseInt(ae, 10)),
									le = function (P) {
										var R, d, F
										te || (te = P),
											(ne += P - te),
											(re =
												Y +
												ye *
													((d = oe = 1 < (oe = xe === 0 ? 0 : ne / xe) ? 1 : oe),
													(R = I).easing === 'easeInQuad' && (F = d * d),
													R.easing === 'easeOutQuad' && (F = d * (2 - d)),
													R.easing === 'easeInOutQuad' && (F = d < 0.5 ? 2 * d * d : (4 - 2 * d) * d - 1),
													R.easing === 'easeInCubic' && (F = d * d * d),
													R.easing === 'easeOutCubic' && (F = --d * d * d + 1),
													R.easing === 'easeInOutCubic' &&
														(F = d < 0.5 ? 4 * d * d * d : (d - 1) * (2 * d - 2) * (2 * d - 2) + 1),
													R.easing === 'easeInQuart' && (F = d * d * d * d),
													R.easing === 'easeOutQuart' && (F = 1 - --d * d * d * d),
													R.easing === 'easeInOutQuart' && (F = d < 0.5 ? 8 * d * d * d * d : 1 - 8 * --d * d * d * d),
													R.easing === 'easeInQuint' && (F = d * d * d * d * d),
													R.easing === 'easeOutQuint' && (F = 1 + --d * d * d * d * d),
													R.easing === 'easeInOutQuint' &&
														(F = d < 0.5 ? 16 * d * d * d * d * d : 1 + 16 * --d * d * d * d * d),
													R.customEasing && (F = R.customEasing(d)),
													F || d)),
											t.scrollTo(0, Math.floor(re)),
											(function (X, ce) {
												var ke = t.pageYOffset
												if (X == ce || ke == ce || (Y < ce && t.innerHeight + ke) >= Ce)
													return L.cancelScroll(!0), c(k, ce, Q), i('scrollStop', I, k, q), !(E = te = null)
											})(re, he) || ((E = t.requestAnimationFrame(le)), (te = P))
									}
								t.pageYOffset === 0 && t.scrollTo(0, 0),
									(D = k),
									(W = I),
									Q ||
										(history.pushState &&
											W.updateURL &&
											history.pushState(
												{ smoothScroll: JSON.stringify(W), anchor: D.id },
												document.title,
												D === document.documentElement ? '#top' : '#' + D.id
											)),
									'matchMedia' in t && t.matchMedia('(prefers-reduced-motion)').matches
										? c(k, Math.floor(he), !1)
										: (i('scrollStart', I, k, q), L.cancelScroll(!0), t.requestAnimationFrame(le))
							}
						})
					var be = function (k) {
							if (
								!k.defaultPrevented &&
								!(k.button !== 0 || k.metaKey || k.ctrlKey || k.shiftKey) &&
								'closest' in k.target &&
								(x = k.target.closest(f)) &&
								x.tagName.toLowerCase() === 'a' &&
								!k.target.closest(m.ignore) &&
								x.hostname === t.location.hostname &&
								x.pathname === t.location.pathname &&
								/#/.test(x.href)
							) {
								var q, V
								try {
									q = r(decodeURIComponent(x.hash))
								} catch (I) {
									q = r(x.hash)
								}
								if (q === '#') {
									if (!m.topOnEmptyHash) return
									V = document.documentElement
								} else V = document.querySelector(q)
								;(V = V || q !== '#top' ? V : document.documentElement) &&
									(k.preventDefault(),
									(function (I) {
										if (history.replaceState && I.updateURL && !history.state) {
											var Q = t.location.hash
											;(Q = Q || ''),
												history.replaceState(
													{ smoothScroll: JSON.stringify(I), anchor: Q || t.pageYOffset },
													document.title,
													Q || t.location.href
												)
										}
									})(m),
									L.animateScroll(V, x))
							}
						},
						ee = function (k) {
							if (
								history.state !== null &&
								history.state.smoothScroll &&
								history.state.smoothScroll === JSON.stringify(m)
							) {
								var q = history.state.anchor
								;(typeof q == 'string' && q && !(q = document.querySelector(r(history.state.anchor)))) ||
									L.animateScroll(q, null, { updateURL: !1 })
							}
						}
					return (
						(L.destroy = function () {
							m &&
								(document.removeEventListener('click', be, !1),
								t.removeEventListener('popstate', ee, !1),
								L.cancelScroll(),
								(E = C = x = m = null))
						}),
						(function () {
							if (
								!(
									'querySelector' in document &&
									'addEventListener' in t &&
									'requestAnimationFrame' in t &&
									'closest' in t.Element.prototype
								)
							)
								throw 'Smooth Scroll: This browser does not support the required JavaScript methods and browser APIs.'
							L.destroy(),
								(m = o(s, l || {})),
								(C = m.header ? document.querySelector(m.header) : null),
								document.addEventListener('click', be, !1),
								m.updateURL && m.popstate && t.addEventListener('popstate', ee, !1)
						})(),
						L
					)
				}
			})
	}),
	$t = Zt
function en(n) {
	let e
	return {
		c() {
			e = w("We're starting a revolution, vetting sector winning investments that combat climate change.")
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function vt(n) {
	let e, t, s
	return (
		(t = new U({
			props: {
				family: B.Mono,
				orientation: ge.Vertical,
				size: O.Small,
				$$slots: { default: [tn] },
				$$scope: { ctx: n },
			},
		})),
		{
			c() {
				;(e = g('aside')), z(t.$$.fragment), v(e, 'class', 'col-sm-3 svelte-l6e7uz')
			},
			m(o, r) {
				h(o, e, r), S(t, e, null), (s = !0)
			},
			p(o, r) {
				let u = {}
				r & 8 && (u.$$scope = { dirty: r, ctx: o }), t.$set(u)
			},
			i(o) {
				s || (b(t.$$.fragment, o), (s = !0))
			},
			o(o) {
				y(t.$$.fragment, o), (s = !1)
			},
			d(o) {
				o && _(e), j(t)
			},
		}
	)
}
function tn(n) {
	let e, t, s
	return {
		c() {
			;(e = w('If we only sustain,')), (t = g('br')), (s = w('we will never progress.'))
		},
		m(o, r) {
			h(o, e, r), h(o, t, r), h(o, s, r)
		},
		d(o) {
			o && _(e), o && _(t), o && _(s)
		},
	}
}
function nn(n) {
	let e
	return {
		c() {
			e = w('We are solving the climate crisis through tech and innovation amplified by narrative and design.')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function sn(n) {
	let e
	return {
		c() {
			e = w('SNØ General Partners')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function on(n) {
	let e
	return {
		c() {
			e = w(
				'Founder, entrepreneur and strategist for highly curated agents of change. She directly helped startup founders raise over $120M across seed and series A rounds - all in the past 5 years. Prior to this she was leading marketing & communication for luxury brands including Martin Margiela, Rick Owens and Louis Vuitton.'
			)
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function rn(n) {
	let e
	return {
		c() {
			e = w(
				'Ph.D. Mechanical Engineer with 13 years experience in the climate tech space, including 5 years at Bill Gates’ TerraPower. He is the co-founder of Sweet Farm, a Silicon Valley based non-profit incubating food, agriculture, and climate tech startups. He invests and personally advises in emerging sectors, including being the first investor in and an advisor to TurtleTree Labs'
			)
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function an(n) {
	let e
	return {
		c() {
			e = w(
				'Software engineering leader with twenty years of experience across a wide array of sectors (social, gaming, real estate, fitness, logistics, fintech) and two notable exits in the past ten years (Zillow, Disney). He’s the inventor of Goat-2-Meeting (2M+ ARR), the primary architect behind Omni (25M+ XRP raise), and the manager behind VC software at Carta (7B valuation).'
			)
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function ln(n) {
	let e
	return {
		c() {
			e = w('SNØ')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function cn(n) {
	let e
	return {
		c() {
			e = w('Get in Touch')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function un(n) {
	let e
	return {
		c() {
			e = w('hello@sno.llc')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function fn(n) {
	let e
	return {
		c() {
			e = w('LINKEDIN')
		},
		m(t, s) {
			h(t, e, s)
		},
		d(t) {
			t && _(e)
		},
	}
}
function mn(n) {
	let e, t, s, o, r, u, a, c
	return (
		(e = new ie({
			props: {
				family: B.Mono,
				size: O.Paragraph,
				href: 'mailto:hello@sno.llc',
				$$slots: { default: [un] },
				$$scope: { ctx: n },
			},
		})),
		(u = new ie({
			props: {
				family: B.Mono,
				size: O.Paragraph,
				href: 'https://www.linkedin.com/company/snocapfund',
				$$slots: { default: [fn] },
				$$scope: { ctx: n },
			},
		})),
		{
			c() {
				z(e.$$.fragment),
					(t = A()),
					(s = g('br')),
					(o = g('br')),
					(r = w(`
							[`)),
					z(u.$$.fragment),
					(a = w(']'))
			},
			m(i, f) {
				S(e, i, f), h(i, t, f), h(i, s, f), h(i, o, f), h(i, r, f), S(u, i, f), h(i, a, f), (c = !0)
			},
			p(i, f) {
				let l = {}
				f & 8 && (l.$$scope = { dirty: f, ctx: i }), e.$set(l)
				let m = {}
				f & 8 && (m.$$scope = { dirty: f, ctx: i }), u.$set(m)
			},
			i(i) {
				c || (b(e.$$.fragment, i), b(u.$$.fragment, i), (c = !0))
			},
			o(i) {
				y(e.$$.fragment, i), y(u.$$.fragment, i), (c = !1)
			},
			d(i) {
				j(e, i), i && _(t), i && _(s), i && _(o), i && _(r), j(u, i), i && _(a)
			},
		}
	)
}
function dn(n) {
	let e,
		t,
		s,
		o,
		r,
		u,
		a,
		c,
		i,
		f,
		l,
		m,
		x,
		C,
		E,
		L,
		be,
		ee,
		k,
		q,
		V,
		I,
		Q,
		J,
		Y,
		we,
		M,
		ae,
		te,
		oe,
		re,
		D,
		W,
		Ae,
		he,
		ye,
		Ce,
		ne,
		xe,
		le,
		P,
		R,
		d,
		F,
		X,
		ce,
		ke,
		Ve,
		Ie
	;(t = new ht({})),
		(r = new U({
			props: {
				class: 'col-xs-offset-1 col-xs-11 col-sm-offset-8 col-sm-4',
				size: O.Aside,
				$$slots: { default: [en] },
				$$scope: { ctx: n },
			},
		}))
	let H = n[1].sm && vt(n)
	return (
		(x = new U({
			props: {
				class: 'col-xs-11 col-sm-9',
				family: B.Mono,
				size: O.Small,
				$$slots: { default: [nn] },
				$$scope: { ctx: n },
			},
		})),
		(L = new U({ props: { size: O.Title, $$slots: { default: [sn] }, $$scope: { ctx: n } } })),
		(ee = new Fe({
			props: {
				name: 'Susanna Barla, GP',
				linkedinURI: 'https://www.linkedin.com/in/susanna-barla/',
				headshotURI: '/headshots/sb.jpeg',
				$$slots: { default: [on] },
				$$scope: { ctx: n },
			},
		})),
		(q = new Fe({
			props: {
				name: 'Nate Salpeter, GP',
				linkedinURI: 'https://www.linkedin.com/in/nathaniel-salpeter-77145712/',
				headshotURI: '/headshots/ns.jpeg',
				reversed: !0,
				$$slots: { default: [rn] },
				$$scope: { ctx: n },
			},
		})),
		(I = new Fe({
			props: {
				name: 'Jonathan Azoff, MP',
				linkedinURI: 'https://www.linkedin.com/in/jazoff/',
				headshotURI: '/headshots/ja.jpeg',
				$$slots: { default: [an] },
				$$scope: { ctx: n },
			},
		})),
		(Y = new U({ props: { size: O.Title, $$slots: { default: [ln] }, $$scope: { ctx: n } } })),
		(W = new U({ props: { size: O.Header, $$slots: { default: [cn] }, $$scope: { ctx: n } } })),
		(ne = new U({ props: { family: B.Mono, size: O.Paragraph, $$slots: { default: [mn] }, $$scope: { ctx: n } } })),
		{
			c() {
				;(e = g('div')),
					z(t.$$.fragment),
					(s = A()),
					(o = g('section')),
					z(r.$$.fragment),
					(u = A()),
					(a = g('section')),
					H && H.c(),
					(c = A()),
					(i = g('video')),
					(i.innerHTML = '<source src="/video/mountain_graded.mp4" type="video/mp4"/>'),
					(l = A()),
					(m = g('section')),
					z(x.$$.fragment),
					(C = A()),
					(E = g('section')),
					z(L.$$.fragment),
					(be = A()),
					z(ee.$$.fragment),
					(k = A()),
					z(q.$$.fragment),
					(V = A()),
					z(I.$$.fragment),
					(Q = A()),
					(J = g('section')),
					z(Y.$$.fragment),
					(we = A()),
					(M = g('div')),
					(M.innerHTML =
						'<div class="col-xs-11 col-sm-9 mountains svelte-l6e7uz" style="background-image: url(&#39;/img/mountains.jpg&#39;);"></div>'),
					(ae = A()),
					(te = g('div')),
					(oe = g('div')),
					(re = g('div')),
					(D = g('div')),
					z(W.$$.fragment),
					(Ae = A()),
					(he = g('br')),
					(ye = g('br')),
					(Ce = A()),
					z(ne.$$.fragment),
					(xe = A()),
					(le = g('section')),
					(P = g('center')),
					(R = w('—')),
					(d = g('br')),
					(F = w('© ')),
					(X = w(n[2])),
					(ce = w(' SNO Management, LLC. All rights reserved.')),
					(ke = g('br')),
					(Ve = w('SNOCAP US, LP is a 506(c) registered offering.')),
					v(o, 'class', 'row svelte-l6e7uz'),
					v(i, 'class', 'col-xs-11 col-sm-9 svelte-l6e7uz'),
					(i.playsInline = !0),
					(i.autoplay = !0),
					(i.controls = f = !1),
					(i.loop = !0),
					v(a, 'class', 'row end-xs svelte-l6e7uz'),
					v(m, 'class', 'row end-xs svelte-l6e7uz'),
					v(E, 'id', 'people'),
					v(E, 'class', 'svelte-l6e7uz'),
					v(M, 'class', 'row end-xs'),
					v(D, 'class', 'col-xs-6 email svelte-l6e7uz'),
					v(re, 'class', 'row start-xs'),
					v(oe, 'class', 'col-xs-11 col-sm-9 forms'),
					v(te, 'class', 'row end-xs'),
					v(J, 'id', 'contact'),
					v(J, 'class', 'svelte-l6e7uz'),
					v(P, 'class', 'svelte-l6e7uz'),
					v(le, 'class', 'svelte-l6e7uz'),
					v(e, 'class', 'app container-fluid svelte-l6e7uz'),
					N(e, 'visible', n[0])
			},
			m($, T) {
				h($, e, T),
					S(t, e, null),
					p(e, s),
					p(e, o),
					S(r, o, null),
					p(e, u),
					p(e, a),
					H && H.m(a, null),
					p(a, c),
					p(a, i),
					p(e, l),
					p(e, m),
					S(x, m, null),
					p(e, C),
					p(e, E),
					S(L, E, null),
					p(E, be),
					S(ee, E, null),
					p(E, k),
					S(q, E, null),
					p(E, V),
					S(I, E, null),
					p(e, Q),
					p(e, J),
					S(Y, J, null),
					p(J, we),
					p(J, M),
					p(J, ae),
					p(J, te),
					p(te, oe),
					p(oe, re),
					p(re, D),
					S(W, D, null),
					p(D, Ae),
					p(D, he),
					p(D, ye),
					p(D, Ce),
					S(ne, D, null),
					p(e, xe),
					p(e, le),
					p(le, P),
					p(P, R),
					p(P, d),
					p(P, F),
					p(P, X),
					p(P, ce),
					p(P, ke),
					p(P, Ve),
					(Ie = !0)
			},
			p($, [T]) {
				let Ye = {}
				T & 8 && (Ye.$$scope = { dirty: T, ctx: $ }),
					r.$set(Ye),
					$[1].sm
						? H
							? (H.p($, T), T & 2 && b(H, 1))
							: ((H = vt($)), H.c(), b(H, 1), H.m(a, c))
						: H &&
						  (Ge(),
						  y(H, 1, 1, () => {
								H = null
						  }),
						  Be())
				let We = {}
				T & 8 && (We.$$scope = { dirty: T, ctx: $ }), x.$set(We)
				let Xe = {}
				T & 8 && (Xe.$$scope = { dirty: T, ctx: $ }), L.$set(Xe)
				let Ze = {}
				T & 8 && (Ze.$$scope = { dirty: T, ctx: $ }), ee.$set(Ze)
				let et = {}
				T & 8 && (et.$$scope = { dirty: T, ctx: $ }), q.$set(et)
				let tt = {}
				T & 8 && (tt.$$scope = { dirty: T, ctx: $ }), I.$set(tt)
				let nt = {}
				T & 8 && (nt.$$scope = { dirty: T, ctx: $ }), Y.$set(nt)
				let st = {}
				T & 8 && (st.$$scope = { dirty: T, ctx: $ }), W.$set(st)
				let ot = {}
				T & 8 && (ot.$$scope = { dirty: T, ctx: $ }), ne.$set(ot), T & 1 && N(e, 'visible', $[0])
			},
			i($) {
				Ie ||
					(b(t.$$.fragment, $),
					b(r.$$.fragment, $),
					b(H),
					b(x.$$.fragment, $),
					b(L.$$.fragment, $),
					b(ee.$$.fragment, $),
					b(q.$$.fragment, $),
					b(I.$$.fragment, $),
					b(Y.$$.fragment, $),
					b(W.$$.fragment, $),
					b(ne.$$.fragment, $),
					(Ie = !0))
			},
			o($) {
				y(t.$$.fragment, $),
					y(r.$$.fragment, $),
					y(H),
					y(x.$$.fragment, $),
					y(L.$$.fragment, $),
					y(ee.$$.fragment, $),
					y(q.$$.fragment, $),
					y(I.$$.fragment, $),
					y(Y.$$.fragment, $),
					y(W.$$.fragment, $),
					y(ne.$$.fragment, $),
					(Ie = !1)
			},
			d($) {
				$ && _(e), j(t), j(r), H && H.d(), j(x), j(L), j(ee), j(q), j(I), j(Y), j(W), j(ne)
			},
		}
	)
}
function pn(n, e, t) {
	let s, o
	fe(n, ve, (u) => t(1, (o = u)))
	let r = new Date().getFullYear()
	Ne(() => {
		setTimeout(() => {
			t(0, (s = !0))
		}, 10),
			new $t('a[href*="#"]')
	})
	e: t(0, (s = !1))
	return [s, o, r]
}
var bt = class extends K {
		constructor(e) {
			super()
			Z(this, e, pn, dn, G, {})
		}
	},
	wt = bt
var _n = new wt({ target: document.body }),
	hn = _n
export { hn as default }
/*! smooth-scroll v16.1.3 | (c) 2020 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/smooth-scroll */
//# sourceMappingURL=main.js.map
