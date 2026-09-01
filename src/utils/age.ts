/**
 * Calculates the age of a cat from its birth date and formats it in Hungarian
 * @param birthDateStr - The birth date as a string (YYYY-MM-DD format)
 * @returns Formatted age string in Hungarian (e.g., "2 év 3 hó (2.3 év)") or "--" if no date provided
 */
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
