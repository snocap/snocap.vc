import './Testimonial.svelte.css';
/* src/components/Testimonial.svelte generated by Svelte v3.38.2 */
import {
	SvelteComponent,
	append,
	attr,
	component_subscribe,
	create_component,
	create_slot,
	destroy_component,
	detach,
	element,
	init,
	insert,
	mount_component,
	safe_not_equal,
	set_data,
	set_style,
	space,
	text,
	toggle_class,
	transition_in,
	transition_out,
	update_slot
} from "../../_snowpack/pkg/svelte/internal.js";

import Text from "./lib/Text.svelte.js";
import media from "./lib/media.js";
import { TextSize } from "./lib/types.js";

function create_default_slot_1(ctx) {
	let q;
	let current;
	const default_slot_template = /*#slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			q = element("q");
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			insert(target, q, anchor);

			if (default_slot) {
				default_slot.m(q, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(q);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (15:12) <Text size={TextSize.Paragragh}>
function create_default_slot(ctx) {
	let t;

	return {
		c() {
			t = text(/*name*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*name*/ 1) set_data(t, /*name*/ ctx[0]);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment(ctx) {
	let div3;
	let div0;
	let text0;
	let t0;
	let br0;
	let br1;
	let text1;
	let t1;
	let div2;
	let div1;
	let div3_data_aos_value;
	let current;

	text0 = new Text({
			props: {
				size: TextSize.Aside,
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	text1 = new Text({
			props: {
				size: TextSize.Paragragh,
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div3 = element("div");
			div0 = element("div");
			create_component(text0.$$.fragment);
			t0 = space();
			br0 = element("br");
			br1 = element("br");
			create_component(text1.$$.fragment);
			t1 = space();
			div2 = element("div");
			div1 = element("div");
			attr(div0, "class", "text col-sm-9 col-xs-12 svelte-10sywli");
			attr(div1, "class", "figure svelte-10sywli");
			set_style(div1, "background-image", "url('" + /*headshotURI*/ ctx[1] + "')");
			attr(div2, "class", "image col-sm-3 col-xs-12 svelte-10sywli");
			attr(div3, "data-aos", div3_data_aos_value = /*reverse*/ ctx[2] ? "fade-right" : "fade-left");
			attr(div3, "class", "row end-xs start-sm svelte-10sywli");
			toggle_class(div3, "reverse", /*reverse*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			mount_component(text0, div0, null);
			append(div0, t0);
			append(div0, br0);
			append(div0, br1);
			mount_component(text1, div0, null);
			append(div3, t1);
			append(div3, div2);
			append(div2, div1);
			current = true;
		},
		p(ctx, [dirty]) {
			const text0_changes = {};

			if (dirty & /*$$scope*/ 64) {
				text0_changes.$$scope = { dirty, ctx };
			}

			text0.$set(text0_changes);
			const text1_changes = {};

			if (dirty & /*$$scope, name*/ 65) {
				text1_changes.$$scope = { dirty, ctx };
			}

			text1.$set(text1_changes);

			if (!current || dirty & /*headshotURI*/ 2) {
				set_style(div1, "background-image", "url('" + /*headshotURI*/ ctx[1] + "')");
			}

			if (!current || dirty & /*reverse*/ 4 && div3_data_aos_value !== (div3_data_aos_value = /*reverse*/ ctx[2] ? "fade-right" : "fade-left")) {
				attr(div3, "data-aos", div3_data_aos_value);
			}

			if (dirty & /*reverse*/ 4) {
				toggle_class(div3, "reverse", /*reverse*/ ctx[2]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(text0.$$.fragment, local);
			transition_in(text1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text0.$$.fragment, local);
			transition_out(text1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			destroy_component(text0);
			destroy_component(text1);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let reverse;
	let $media;
	component_subscribe($$self, media, $$value => $$invalidate(4, $media = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	let { name } = $$props;
	let { headshotURI } = $$props;
	let { reversed = false } = $$props;

	$$self.$$set = $$props => {
		if ("name" in $$props) $$invalidate(0, name = $$props.name);
		if ("headshotURI" in $$props) $$invalidate(1, headshotURI = $$props.headshotURI);
		if ("reversed" in $$props) $$invalidate(3, reversed = $$props.reversed);
		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*reversed, $media*/ 24) {
			$: $$invalidate(2, reverse = reversed && $media.sm);
		}
	};

	return [name, headshotURI, reverse, reversed, $media, slots, $$scope];
}

class Testimonial extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { name: 0, headshotURI: 1, reversed: 3 });
	}
}

export default Testimonial;