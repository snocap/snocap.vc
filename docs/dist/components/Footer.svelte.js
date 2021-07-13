import './Footer.svelte.css';
/* src/components/Footer.svelte generated by Svelte v3.38.2 */
import {
	SvelteComponent,
	append,
	attr,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	text
} from "svelte/internal";

function create_fragment(ctx) {
	let section;
	let center;
	let t0;
	let br0;
	let br1;
	let t1;
	let t2;
	let t3;
	let br2;
	let t4;

	return {
		c() {
			section = element("section");
			center = element("center");
			t0 = text("—");
			br0 = element("br");
			br1 = element("br");
			t1 = text("\n\t\t© ");
			t2 = text(/*year*/ ctx[0]);
			t3 = text(" SNO Management, LLC. All rights reserved.");
			br2 = element("br");
			t4 = text("SNOCAP US, LP is a 506(c) registered\n\t\toffering.");
			attr(center, "class", "svelte-1gyo7av");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, center);
			append(center, t0);
			append(center, br0);
			append(center, br1);
			append(center, t1);
			append(center, t2);
			append(center, t3);
			append(center, br2);
			append(center, t4);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(section);
		}
	};
}

function instance($$self) {
	"use strict";
	const year = new Date().getFullYear();
	return [year];
}

class Footer extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

export default Footer;