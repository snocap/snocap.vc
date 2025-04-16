interface I18nOptions {
	locale: SupportedLocales
}

export type SupportedLocales = 'en-US'
type StringInterpolations = Record<string, string | number>;
type Translations = Record<string, Record<string, string>>;

export const defaultOptions: I18nOptions = {
	locale: 'en-US'
};

const translations = import.meta.glob('./translations/*.json', { eager: true }) as Translations;

function interpolate(formatString: string, interpolations: StringInterpolations): string {
	return formatString.replace(/\{(\w+)\}/g, (_, key) => {
		const value = interpolations[key];
		return (typeof value === 'string' || typeof value === 'number') ? String(value) : _;
	});
}

export function t(textToTranslate: string, interpolations: StringInterpolations = {}, options: I18nOptions = defaultOptions): string {
	const usingTranslations = translations[`./translations/${options.locale}.json`];
	const formatString = (textToTranslate in usingTranslations) ? usingTranslations[textToTranslate] : textToTranslate;
	return interpolate(formatString, interpolations);
}