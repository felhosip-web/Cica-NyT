import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './cost.js';
import { ORG_ROLES } from '../views/settings-view.js';
import { THEMES, getCurrentThemeId } from './theme-manager.js';

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

// Convert Hungarian specific characters to closest ASCII match to avoid jsPDF font issues
// or we can use replace logic for just standard text.
function stripAccents(str) {
    if (!str) return '';
    return str
        .replace(/ő/g, 'ö')
        .replace(/Ő/g, 'Ö')
        .replace(/ű/g, 'ü')
        .replace(/Ű/g, 'Ü')
        .replace(/á/g, 'a').replace(/Á/g, 'A')
        .replace(/é/g, 'e').replace(/É/g, 'E')
        .replace(/í/g, 'i').replace(/Í/g, 'I')
        .replace(/ó/g, 'o').replace(/Ó/g, 'O')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ú/g, 'u').replace(/Ú/g, 'U')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U');
}

export class PdfExporter {
    static async exportCats({ cats, type, title, orgSettings }) {
        if (!cats || cats.length === 0) {
            throw new Error('Nincs exportálható adat.');
        }

        // Initialize jsPDF (Landscape for better table fit)
        const doc = new jsPDF('l', 'mm', 'a4');
        const orgName = orgSettings?.orgName ? stripAccents(orgSettings.orgName) : 'Szervezet / Maganszemely';

        let orgRole = '';
        if (orgSettings?.orgRole) {
            let roleValue = orgSettings.orgRole;
            if (roleValue === 'allatmenhely' || roleValue.includes('/')) {
                roleValue = 'menhely';
            }
            const roleDef = ORG_ROLES.find(r => r.value === roleValue);
            orgRole = roleDef ? stripAccents(roleDef.label) : stripAccents(roleValue);
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '.');
        const docTitle = stripAccents(title) || `Allatnyilvantartas - ${dateStr}`;

        // Header
        doc.setFontSize(16);
        doc.text(docTitle, 14, 20);

        doc.setFontSize(10);
        doc.text(`${orgName} ${orgRole ? '(' + orgRole + ')' : ''}`, 14, 26);

        if (type === 'financial') {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("HIVATALOS KIMUTATAS KONYVELES RESZERE", 14, 32);
            doc.setFont("helvetica", "normal");
        }

        let startY = type === 'financial' ? 40 : 35;

        // Financial Summary Box
        if (type === 'financial') {
            const total = cats.length;
            const befogott = cats.filter(c => c.intakeType === 'befogott').length;
            const behozott = cats.filter(c => c.intakeType === 'behozott' || c.intakeType === 'leadott').length;
            const elkobzott = cats.filter(c => c.intakeType === 'elkobzott').length;
            const gazdis = cats.filter(c => c.status === 'gazdis').length;
            const aktiv = cats.filter(c => c.status !== 'gazdis' && c.status !== 'elhunyt').length;
            const hasKiskonyvCount = cats.filter(c => c.hasKiskonyv).length;

            // Calculate date range based on intake/created
            let minDate = new Date();
            let maxDate = new Date(0);

            cats.forEach(c => {
               const cDate = c.befogottMikor || c.behozottMikor || c.created;
               if (cDate) {
                   const d = new Date(cDate);
                   if (d < minDate) minDate = d;
                   if (d > maxDate) maxDate = d;
               }
            });
            const periodStr = (minDate <= maxDate) ?
                `${minDate.toISOString().split('T')[0].replace(/-/g, '.')} - ${maxDate.toISOString().split('T')[0].replace(/-/g, '.')}` : dateStr;

            doc.setFillColor(240, 240, 240);
            doc.rect(14, startY, 269, 20, 'F');

            doc.setFontSize(9);
            doc.text(`Osszes allat: ${total} db`, 18, startY + 6);
            doc.text(`Befogott: ${befogott} | Leadott: ${behozott} | Elkobzott: ${elkobzott}`, 18, startY + 11);
            doc.text(`Van kiskonyv: ${hasKiskonyvCount} db`, 18, startY + 16);

            doc.text(`Aktiv: ${aktiv} | Gazdis: ${gazdis}`, 100, startY + 6);
            doc.text(`Idoszak: ${periodStr}`, 100, startY + 11);

            startY += 25;
        }

        // Table setup
        let head = [];
        if (type === 'financial') {
            head = [['Sorszam', 'Nev', 'Ivar', 'Szin', 'Statusz', 'Beerkezes', 'Gazdis Datum', 'Kiskonyv', 'Befogo/Behozo', 'Orokbefogado']];
        } else {
            head = [['Sorszam', 'Nev', 'Ivar', 'Szin', 'Statusz', 'Beerkezes', 'Gazdis Datum', 'Kiskonyv']];
        }

        const body = cats.map(cat => {
            const sorszamStr = String(cat.sorszam || cat.id?.slice(0, 4) || '-').padStart(2, '0');
            const nev = stripAccents(cat.nev);
            const ivar = stripAccents(cat.ivar);
            const szin = stripAccents(cat.szin);
            const statusz = stripAccents(cat.status);

            let beerkezes = '-';
            if (cat.intakeType === 'befogott') {
                beerkezes = 'Befogott: ' + (cat.befogottMikor ? formatDate(cat.befogottMikor).split(' ')[0] : '-');
            } else if (cat.intakeType === 'behozott' || cat.intakeType === 'leadott') {
                beerkezes = 'Leadott: ' + (cat.behozottMikor ? formatDate(cat.behozottMikor).split(' ')[0] : '-');
            } else if (cat.intakeType === 'elkobzott') {
                beerkezes = 'Elkobzott: ' + (cat.created ? formatDate(cat.created).split(' ')[0] : '-');
            } else {
                beerkezes = 'Sajat: ' + (cat.created ? formatDate(cat.created).split(' ')[0] : '-');
            }

            const gazdisDatum = cat.gazdisDate ? formatDate(cat.gazdisDate) : '-';
            const kiskonyv = cat.hasKiskonyv ? `Van (${stripAccents(cat.kiskonyvSzam || '-')})` : 'Nincs';

            if (type === 'financial') {
                let behozK = '-';
                if (cat.intakeType === 'befogott') behozK = stripAccents(cat.befogottKi || '-');
                else if (cat.intakeType === 'behozott') behozK = stripAccents(cat.behozottKi || '-');

                const orokbe = stripAccents(cat.gazdisPerson || '-');

                return [sorszamStr, nev, ivar, szin, statusz, beerkezes, gazdisDatum, kiskonyv, behozK, orokbe];
            } else {
                return [sorszamStr, nev, ivar, szin, statusz, beerkezes, gazdisDatum, kiskonyv];
            }
        });

        const activeThemeId = getCurrentThemeId();
        const activeTheme = THEMES[activeThemeId] || THEMES.original;
        const brandPinkHex = activeTheme.colors['brand-pink'];
        const brandPinkRgb = hexToRgb(brandPinkHex);

        // Generate Table
        const tableOptions = {
            startY: startY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: brandPinkRgb },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { top: 15, left: 14, right: 14 },
            didDrawPage: function (data) {
                // Footer
                const str = `Keszult: ${now.toLocaleString()} | ${orgName} | Oldal ${doc.internal.getNumberOfPages()}`;
                doc.setFontSize(8);
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                doc.text(str, data.settings.margin.left, pageHeight - 10);

                if (type === 'financial' && data.pageNumber === doc.internal.getNumberOfPages()) {
                    doc.text("....................................................", 220, pageHeight - 20);
                    doc.text("Alairas", 240, pageHeight - 15);
                    doc.text(`A kimutatas a Cica-NyT rendszerbol exportalva, adatok hitelesseget ${orgName} igazolja.`, 14, pageHeight - 5);
                }
            }
        };

        try {
            if (typeof doc.autoTable === 'function') {
                doc.autoTable(tableOptions);
            } else {
                autoTable(doc, tableOptions);
            }
        } catch {
            autoTable(doc, tableOptions);
        }

        const safeTitle = docTitle.replace(/[^a-zA-Z0-9-]/g, '_');
        doc.save(`${safeTitle}.pdf`);
    }
}

export async function generateCatPdf(cat) {
    if (!cat) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const name = cat.nev || 'Névtelen';

    doc.setFontSize(18);
    doc.text(`Cica Adatlap: ${name}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Sorszam: #${cat.sorszam || cat.id.slice(0, 4)}`, 14, 28);
    doc.text(`Ivar: ${cat.ivar === 'bak' ? 'Bak (Kandur)' : 'Nosteny'}`, 14, 34);
    doc.text(`Szin: ${cat.szin || '-'}`, 14, 40);
    doc.text(`Szuletes: ${cat.szuletes || 'Ismeretlen'}`, 14, 46);
    doc.text(`Chip szam: ${cat.chipNumber || 'Nincs'}`, 14, 52);
    doc.text(`Ivartalanitva: ${cat.isSpayed ? 'Igen' : 'Nem'}`, 14, 58);

    doc.save(`cica_adatlap_${name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

