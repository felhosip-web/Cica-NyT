export function calculateAge(birthDateStr) {
    if (!birthDateStr) return "--";

    const birthDate = new Date(birthDateStr);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }

    if (today.getDate() < birthDate.getDate()) {
        months--;
        if (months < 0) {
           months += 12;
        }
    }

    let ageStr = "";
    if (years > 0) ageStr += `${years} év `;
    if (months > 0 || years === 0) ageStr += `${months} hó`;

    // decimal years
    const totalMonths = (years * 12) + months;
    const decimalYears = (totalMonths / 12).toFixed(1);

    if (ageStr === "") ageStr = "Újszülött";

    return `${ageStr.trim()} (${decimalYears} év)`;
}

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

    return total;
}
export function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
}
