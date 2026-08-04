export function formatCurrency(amount) {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, '.');
}

export function calculateTotalCost(cat) {
    let total = 0;

    if (cat.oltasok) {
        cat.oltasok.forEach(item => {
            total += Number(item.koltseg) || 0;
        });
    }
    if (cat.tesztek) {
        cat.tesztek.forEach(item => {
            total += Number(item.koltseg) || 0;
        });
    }
    if (cat.kezelesek) {
        cat.kezelesek.forEach(item => {
            total += Number(item.koltseg) || 0;
        });
    }
    if (cat.kiadasok) {
        cat.kiadasok.forEach(item => {
            total += Number(item.koltseg) || 0;
        });
    }

    return total;
}
