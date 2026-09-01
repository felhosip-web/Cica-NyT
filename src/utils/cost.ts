/**
 * Formats a number as Hungarian currency (HUF)
 * @param amount - The amount to format (number or string)
 * @returns Formatted currency string in HUF (e.g., "5 000 Ft")
 */
export function formatCurrency(amount: number | string) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(Number(amount));
}

/**
 * Formats a date string by replacing hyphens with dots
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string with dots (YYYY.MM.DD) or empty string if no date provided
 */
export function formatDate(dateStr?: string | null) {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, '.');
}

/**
 * Calculates a breakdown of all medical costs for a cat
 * @param cat - The cat object containing medical records (oltasok, tesztek, kezelesek, kiadasok)
 * @returns Object containing total cost and individual category sums
 */
export function calculateCostBreakdown(cat: any) {
    let oltasokSum = 0;
    let tesztekSum = 0;
    let kezelesekSum = 0;
    let kiadasokSum = 0;

    if (cat.oltasok) cat.oltasok.forEach(i => oltasokSum += Number(i.koltseg) || 0);
    if (cat.tesztek) cat.tesztek.forEach(i => tesztekSum += Number(i.koltseg) || 0);
    if (cat.kezelesek) cat.kezelesek.forEach(i => kezelesekSum += Number(i.koltseg) || 0);
    if (cat.kiadasok) cat.kiadasok.forEach(i => kiadasokSum += Number(i.koltseg) || 0);

    const total = oltasokSum + tesztekSum + kezelesekSum + kiadasokSum;

    return {
        total,
        oltasokSum,
        tesztekSum,
        kezelesekSum,
        kiadasokSum
    };
}

/**
 * Calculates the total medical cost for a cat
 * @param cat - The cat object containing medical records
 * @returns Total cost across all medical categories
 */
export function calculateTotalCost(cat: any) {
    return calculateCostBreakdown(cat).total;
}
