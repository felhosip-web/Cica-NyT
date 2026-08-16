export function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, '.');
}

export function calculateCostBreakdown(cat) {
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

export function calculateTotalCost(cat) {
    return calculateCostBreakdown(cat).total;
}
