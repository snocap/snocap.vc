interface I18nOptions {
	locale: 'en_US'
}

type StringInterpolations = Record<string, string | number>;

const defaultOptions: I18nOptions = {
	locale: 'en_US'
};

function interpolate(formatString: string, interpolations: StringInterpolations): string {
	return formatString.replace(/\{(\w+)\}/g, (_, key) => {
		const value = interpolations[key];
		return (typeof value === 'string' || typeof value === 'number') ? String(value) : _;
	});
}

export async function t(textToTranslate: string, interpolations: StringInterpolations = {}, options: I18nOptions = defaultOptions): Promise<string> {
	const translations = await import(`./translations/${options.locale}.json`);
	const formatString = (textToTranslate in translations) ? translations[textToTranslate] : textToTranslate;
	return interpolate(formatString, interpolations);
}