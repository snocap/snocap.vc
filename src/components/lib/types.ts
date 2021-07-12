/* eslint-disable no-unused-vars */

export enum FontFamily {
	Regular = 'regular',
	Mono = 'mono',
}

export enum TextSize {
	Title = 'title',
	Header = 'header',
	Aside = 'aside',
	Paragraph = 'paragraph',
	Small = 'small',
}

export enum TextOrientation {
	Horizontal = 'horizontal',
	Vertical = 'vertical',
}

export type EventHandler = (e:Event) => void