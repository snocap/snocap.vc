declare module 'aos'
declare module 'smooth-scroll'

declare interface AOSEvent extends Event {
	detail: HTMLElement
}

export { AOSEvent }