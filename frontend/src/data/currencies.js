/**
 * Lista completa de monedas ISO 4217
 * Incluye código, nombre, símbolo y locale recomendado
 */
const currencies = [
  // Américas
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', locale: 'es-CO' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', locale: 'en-US' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', locale: 'es-MX' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', locale: 'es-AR' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', locale: 'pt-BR' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', locale: 'es-CL' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', locale: 'es-PE' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$U', locale: 'es-UY' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.', locale: 'es-BO' },
  { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲', locale: 'es-PY' },
  { code: 'VES', name: 'Bolívar Venezolano', symbol: 'Bs.S', locale: 'es-VE' },
  { code: 'PAB', name: 'Balboa Panameño', symbol: 'B/.', locale: 'es-PA' },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡', locale: 'es-CR' },
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q', locale: 'es-GT' },
  { code: 'HNL', name: 'Lempira Hondureño', symbol: 'L', locale: 'es-HN' },
  { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$', locale: 'es-NI' },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', locale: 'es-DO' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'CA$', locale: 'en-CA' },
  { code: 'JMD', name: 'Dólar Jamaicano', symbol: 'J$', locale: 'en-JM' },
  { code: 'TTD', name: 'Dólar de Trinidad y Tobago', symbol: 'TT$', locale: 'en-TT' },
  { code: 'CUP', name: 'Peso Cubano', symbol: '$', locale: 'es-CU' },

  // Europa
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'es-ES' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', locale: 'en-GB' },
  { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', locale: 'de-CH' },
  { code: 'SEK', name: 'Corona Sueca', symbol: 'kr', locale: 'sv-SE' },
  { code: 'NOK', name: 'Corona Noruega', symbol: 'kr', locale: 'nb-NO' },
  { code: 'DKK', name: 'Corona Danesa', symbol: 'kr', locale: 'da-DK' },
  { code: 'PLN', name: 'Zloty Polaco', symbol: 'zł', locale: 'pl-PL' },
  { code: 'CZK', name: 'Corona Checa', symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', name: 'Florín Húngaro', symbol: 'Ft', locale: 'hu-HU' },
  { code: 'RON', name: 'Leu Rumano', symbol: 'lei', locale: 'ro-RO' },
  { code: 'BGN', name: 'Lev Búlgaro', symbol: 'лв', locale: 'bg-BG' },
  { code: 'HRK', name: 'Kuna Croata', symbol: 'kn', locale: 'hr-HR' },
  { code: 'RUB', name: 'Rublo Ruso', symbol: '₽', locale: 'ru-RU' },
  { code: 'TRY', name: 'Lira Turca', symbol: '₺', locale: 'tr-TR' },
  { code: 'UAH', name: 'Grivna Ucraniana', symbol: '₴', locale: 'uk-UA' },
  { code: 'ISK', name: 'Corona Islandesa', symbol: 'kr', locale: 'is-IS' },

  // Asia y Oceanía
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥', locale: 'ja-JP' },
  { code: 'CNY', name: 'Yuan Chino', symbol: '¥', locale: 'zh-CN' },
  { code: 'KRW', name: 'Won Surcoreano', symbol: '₩', locale: 'ko-KR' },
  { code: 'INR', name: 'Rupia India', symbol: '₹', locale: 'hi-IN' },
  { code: 'IDR', name: 'Rupia Indonesia', symbol: 'Rp', locale: 'id-ID' },
  { code: 'THB', name: 'Baht Tailandés', symbol: '฿', locale: 'th-TH' },
  { code: 'MYR', name: 'Ringgit Malayo', symbol: 'RM', locale: 'ms-MY' },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', locale: 'en-SG' },
  { code: 'PHP', name: 'Peso Filipino', symbol: '₱', locale: 'fil-PH' },
  { code: 'VND', name: 'Dong Vietnamita', symbol: '₫', locale: 'vi-VN' },
  { code: 'TWD', name: 'Dólar Taiwanés', symbol: 'NT$', locale: 'zh-TW' },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$', locale: 'zh-HK' },
  { code: 'PKR', name: 'Rupia Pakistaní', symbol: '₨', locale: 'ur-PK' },
  { code: 'BDT', name: 'Taka de Bangladés', symbol: '৳', locale: 'bn-BD' },
  { code: 'LKR', name: 'Rupia de Sri Lanka', symbol: 'Rs', locale: 'si-LK' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', locale: 'en-AU' },
  { code: 'NZD', name: 'Dólar Neozelandés', symbol: 'NZ$', locale: 'en-NZ' },

  // Medio Oriente y África
  { code: 'AED', name: 'Dírham de EAU', symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'SAR', name: 'Riyal Saudí', symbol: '﷼', locale: 'ar-SA' },
  { code: 'QAR', name: 'Riyal Catarí', symbol: 'ر.ق', locale: 'ar-QA' },
  { code: 'KWD', name: 'Dinar Kuwaití', symbol: 'د.ك', locale: 'ar-KW' },
  { code: 'BHD', name: 'Dinar Bareiní', symbol: '.د.ب', locale: 'ar-BH' },
  { code: 'OMR', name: 'Rial Omaní', symbol: 'ر.ع.', locale: 'ar-OM' },
  { code: 'ILS', name: 'Nuevo Séquel Israelí', symbol: '₪', locale: 'he-IL' },
  { code: 'EGP', name: 'Libra Egipcia', symbol: 'E£', locale: 'ar-EG' },
  { code: 'ZAR', name: 'Rand Sudafricano', symbol: 'R', locale: 'en-ZA' },
  { code: 'NGN', name: 'Naira Nigeriana', symbol: '₦', locale: 'en-NG' },
  { code: 'KES', name: 'Chelín Keniano', symbol: 'KSh', locale: 'sw-KE' },
  { code: 'GHS', name: 'Cedi Ghanés', symbol: 'GH₵', locale: 'en-GH' },
  { code: 'MAD', name: 'Dírham Marroquí', symbol: 'د.م.', locale: 'ar-MA' },
  { code: 'TND', name: 'Dinar Tunecino', symbol: 'د.ت', locale: 'ar-TN' },
]

export default currencies

/**
 * Obtener moneda por código
 */
export const getCurrency = (code) => currencies.find(c => c.code === code)

/**
 * Obtener locale recomendado para una moneda
 */
export const getLocaleForCurrency = (code) => {
  const currency = getCurrency(code)
  return currency?.locale || 'es-CO'
}

/**
 * Obtener símbolo para una moneda
 */
export const getSymbolForCurrency = (code) => {
  const currency = getCurrency(code)
  return currency?.symbol || '$'
}
