import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './cost';


const ORG_ROLES = [
    { value: 'shelter_admin', label: 'Menhely Vezető / Adminisztrátor' },
    { value: 'foundation_admin', label: 'Alapítvány / Adminisztrátor' },
    { value: 'foundation_member', label: 'Alapítvány / Tag' },
    { value: 'vet', label: 'Állatorvos / Egészségügyi Felelős' },
    { value: 'caretaker', label: 'Gondozó / Önkéntes' }
];

const THEMES = {
    original: { 'brand-pink': '#ec4899' },
    olive: { 'brand-pink': '#8A9A5B' },
    lavender: { 'brand-pink': '#8B5CF6' }
};

function getCurrentThemeId() {
    return localStorage.getItem('cica_theme') || localStorage.getItem('cica-nyt-theme') || 'original';
}

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
            if (roleValue === 'allatmenhely' || roleValue === 'menhely' || roleValue.includes('/')) {
                roleValue = 'shelter_admin';
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
        const brandPinkHex = activeTheme['brand-pink'];
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

export async function generateCatPdf(cat: any, options?: { orgName?: string; events?: any[]; fosterParentName?: string }) {
    if (!cat) return;

    // Load additional DB items if not explicitly provided
    let events = options?.events;
    if (!events && typeof window !== 'undefined') {
        try {
            const { db } = await import('../lib/db');
            events = await db.events.where('catId').equals(cat.id).toArray();
        } catch (e) {
            console.warn('Could not load cat events for PDF:', e);
            events = [];
        }
    }
    events = events || [];

    let fosterName = options?.fosterParentName || '';
    if (!fosterName && cat.fosterId && typeof window !== 'undefined') {
        try {
            const { db } = await import('../lib/db');
            const fp = await db.fosterParents.get(cat.fosterId);
            if (fp) fosterName = fp.name;
        } catch (e) {
            console.warn('Could not load foster parent name for PDF:', e);
        }
    }

    let orgName = options?.orgName || localStorage.getItem('org_name') || 'Macskamenhely & Gondozó Nyilvántartó';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm

    const activeThemeId = getCurrentThemeId();
    const activeTheme = THEMES[activeThemeId] || THEMES.original;
    const brandPinkHex = activeTheme['brand-pink'];
    const brandPinkRgb = hexToRgb(brandPinkHex);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '.');

    // Clean text helper for PDF rendering
    const cText = (str?: string | null) => stripAccents(str || '');

    // Header Banner
    doc.setFillColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('CICA RESZLETES ADATLAP', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(cText(orgName), 14, 19);

    doc.text(`Kiallitas datuma: ${dateStr}`, pageWidth - 14, 12, { align: 'right' });
    doc.text(`Cica-NyT Nyilvantartas`, pageWidth - 14, 19, { align: 'right' });

    let currentY = 32;

    // Cat Name & Status Box Header
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, 'FD');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const catTitle = `${cText(cat.nev || 'Nevtelen')} (#${cat.sorszam || cat.id.slice(0, 4)})`;
    doc.text(catTitle, 18, currentY + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    let statusText = 'Gondozasban';
    if (cat.status === 'gazdis') statusText = 'Gazdis';
    else if (cat.status === 'ideiglenes') statusText = 'Ideiglenes befogadonal';
    else if (cat.status === 'elhunyt') statusText = 'Elhunyt';

    doc.text(`Statusz: ${statusText}`, 18, currentY + 14);

    let ageText = 'Ismeretlen';
    if (cat.szuletes) {
        try {
            const { calculateAge } = await import('./age');
            ageText = calculateAge(cat.szuletes);
        } catch {
            ageText = cat.szuletes;
        }
    }
    doc.text(`Kora / Szuletes: ${cText(ageText)} (${cat.szuletes || 'Ismeretlen'})`, pageWidth - 18, currentY + 11, { align: 'right' });

    currentY += 23;

    // Section 1: Basic Information & Intake Details (Table)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
    doc.text('1. ALAPADATOK ES BEKERULESI INFORMARCIOK', 14, currentY);
    currentY += 3;

    let intakeTypeLabel = 'Sajat gondozas';
    if (cat.intakeType === 'befogott') intakeTypeLabel = 'Befogott';
    else if (cat.intakeType === 'behozott' || cat.intakeType === 'leadott') intakeTypeLabel = 'Leadott / Behozott';
    else if (cat.intakeType === 'elkobzott') intakeTypeLabel = 'Elkobzott';

    const basicInfoRows = [
        [
            { content: 'Ivar:', fontStyle: 'bold' },
            cat.ivar === 'bak' ? 'Bak (Kandur)' : 'Nosteny',
            { content: 'Szin / Mintazat:', fontStyle: 'bold' },
            cText(cat.szin || 'Nincs megadva')
        ],
        [
            { content: 'Bekerules tipusa:', fontStyle: 'bold' },
            intakeTypeLabel,
            { content: 'Bekerules datuma:', fontStyle: 'bold' },
            cat.created ? cat.created.split('T')[0].replace(/-/g, '.') : '-'
        ],
        [
            { content: 'Jelenlegi helyszin:', fontStyle: 'bold' },
            fosterName ? `Ideiglenes: ${cText(fosterName)}` : 'Menhelyi kozpont',
            { content: 'Gazdisodas datuma:', fontStyle: 'bold' },
            cat.gazdisDate ? cat.gazdisDate.replace(/-/g, '.') : '-'
        ]
    ];

    if (cat.status === 'gazdis' && cat.gazdisPerson) {
        basicInfoRows.push([
            { content: 'Orokbefogado:', fontStyle: 'bold' },
            cText(cat.gazdisPerson),
            { content: '', fontStyle: 'bold' },
            ''
        ]);
    }

    const runAutoTable = (options: any) => {
        try {
            if (typeof doc.autoTable === 'function') {
                doc.autoTable(options);
            } else {
                autoTable(doc, options);
            }
        } catch {
            autoTable(doc, options);
        }
    };

    runAutoTable({
        startY: currentY,
        body: basicInfoRows,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold' },
            1: { cellWidth: 55 },
            2: { cellWidth: 38, fontStyle: 'bold' },
            3: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Section 2: Identification & Health Badges
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
    doc.text('2. AZONOSITO ES EGESZSEGUEGYI ASTAT', 14, currentY);
    currentY += 3;

    const healthRows = [
        [
            { content: 'Mikrochip szam:', fontStyle: 'bold' },
            cat.chipNumber ? cText(cat.chipNumber) : 'Nincs chipbeultetes',
            { content: 'Chip datuma / helye:', fontStyle: 'bold' },
            `${cat.chipDate || '-'} / ${cText(cat.chipLocation || '-')}`
        ],
        [
            { content: 'Ivartalanitva:', fontStyle: 'bold' },
            cat.isSpayed ? 'IGEN (Ivartalanitott)' : 'NEM (Ivartalanitlan)',
            { content: 'Ivartalanitas datuma/helye:', fontStyle: 'bold' },
            `${cat.spayedDate || '-'} / ${cText(cat.spayedLocation || '-')}`
        ],
        [
            { content: 'Oltasi kiskonyv:', fontStyle: 'bold' },
            cat.hasKiskonyv ? `Van (${cText(cat.kiskonyvSzam || 'Nincs szam')})` : 'Nincs kiskonyve',
            { content: 'Kiskonyv kiadas datuma:', fontStyle: 'bold' },
            cat.kiskonyvDate || '-'
        ]
    ];

    runAutoTable({
        startY: currentY,
        body: healthRows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: brandPinkRgb },
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold', fillColor: [241, 245, 249] },
            1: { cellWidth: 55 },
            2: { cellWidth: 42, fontStyle: 'bold', fillColor: [241, 245, 249] },
            3: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Section 3: Medical Log Tables (Vaccinations, Treatments, Tests)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
    doc.text('3. ORVOSI NAPLO ES BEKEZELESEK', 14, currentY);
    currentY += 4;

    // 3a. Vaccinations
    const oltasok = Array.isArray(cat.oltasok) ? cat.oltasok : [];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Vedooltasok (${oltasok.length} db):`, 14, currentY);
    currentY += 2;

    const vaxRows = oltasok.map((o: any, idx: number) => [
        `${idx + 1}.`,
        cText(o.nev || 'Vedooltas'),
        o.datum || '-',
        o.koltseg ? `${Number(o.koltseg).toLocaleString('hu-HU')} Ft` : '-',
        cText(o.megjegyzes || '-')
    ]);

    if (vaxRows.length === 0) {
        vaxRows.push(['-', 'Nincs rogzitett vedooltas', '-', '-', '-']);
    }

    runAutoTable({
        startY: currentY,
        head: [['#', 'Oltas megnevezese', 'Datum', 'Koltseg', 'Megjegyzes']],
        body: vaxRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 55, fontStyle: 'bold' },
            2: { cellWidth: 25 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Check page height limit
    if (currentY + 40 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }

    // 3b. Treatments & Medical procedures
    const kezelesek = Array.isArray(cat.kezelesek) ? cat.kezelesek : [];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Orvosi kezelések es beavatkozasok (${kezelesek.length} db):`, 14, currentY);
    currentY += 2;

    const medRows = kezelesek.map((k: any, idx: number) => [
        `${idx + 1}.`,
        cText(k.nev || 'Kezeles'),
        k.datum || '-',
        k.koltseg ? `${Number(k.koltseg).toLocaleString('hu-HU')} Ft` : '-',
        cText(k.megjegyzes || '-')
    ]);

    if (medRows.length === 0) {
        medRows.push(['-', 'Nincs rogzitett kezelés', '-', '-', '-']);
    }

    runAutoTable({
        startY: currentY,
        head: [['#', 'Kezeles / Mutet megnevezese', 'Datum', 'Koltseg', 'Megjegyzes']],
        body: medRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 55, fontStyle: 'bold' },
            2: { cellWidth: 25 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    if (currentY + 40 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }

    // 3c. Diagnostic Tests
    const tesztek = Array.isArray(cat.tesztek) ? cat.tesztek : [];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Labortesztek es szuresek (${tesztek.length} db):`, 14, currentY);
    currentY += 2;

    const testRows = tesztek.map((t: any, idx: number) => [
        `${idx + 1}.`,
        cText(t.nev || 'Teszt'),
        t.datum || '-',
        cText(t.eredmeny || 'Negativ'),
        t.koltseg ? `${Number(t.koltseg).toLocaleString('hu-HU')} Ft` : '-',
        cText(t.megjegyzes || '-')
    ]);

    if (testRows.length === 0) {
        testRows.push(['-', 'Nincs rogzitett teszt', '-', '-', '-', '-']);
    }

    runAutoTable({
        startY: currentY,
        head: [['#', 'Teszt megnevezese', 'Datum', 'Eredmeny', 'Koltseg', 'Megjegyzes']],
        body: testRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45, fontStyle: 'bold' },
            2: { cellWidth: 25 },
            3: { cellWidth: 25, fontStyle: 'bold' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (currentY + 40 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }

    // Section 4: Related Events History
    if (events && events.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
        doc.text('4. ESEMENYEK ES ELOTORTENET', 14, currentY);
        currentY += 4;

        const eventRows = events.map((e: any, idx: number) => [
            `${idx + 1}.`,
            cText(e.title || 'Esemeny'),
            e.date || '-',
            cText(e.location || '-'),
            cText(e.performedBy || '-'),
            e.status === 'done' ? 'Teljesult' : 'Esedekes'
        ]);

        runAutoTable({
            startY: currentY,
            head: [['#', 'Esemeny cime', 'Datum', 'Helyszin', 'Felelos', 'Statusz']],
            body: eventRows,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: brandPinkRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 50, fontStyle: 'bold' },
                2: { cellWidth: 25 },
                3: { cellWidth: 35 },
                4: { cellWidth: 35 },
                5: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (currentY + 30 > pageHeight) {
        doc.addPage();
        currentY = 20;
    }

    // Section 5: Notes & Observations
    if (cat.notes || cat.tags) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandPinkRgb[0], brandPinkRgb[1], brandPinkRgb[2]);
        doc.text('5. MEGJEGYZESEK ES CIMKEK', 14, currentY);
        currentY += 4;

        if (cat.tags && cat.tags.length > 0) {
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text(`Cimkek: ${cText(cat.tags.join(', '))}`, 14, currentY);
            currentY += 5;
        }

        if (cat.notes) {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);

            const splitNotes = doc.splitTextToSize(cText(cat.notes), pageWidth - 36);
            const boxHeight = Math.max(12, splitNotes.length * 4.5 + 4);

            doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 1.5, 1.5, 'FD');

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(splitNotes, 18, currentY + 5);

            currentY += boxHeight + 8;
        }
    }

    // Signature Block at bottom of PDF
    if (currentY + 35 > pageHeight) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 5;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const col1 = 14;
    const col2 = pageWidth - 70;

    doc.text('Kelt: ........................................, ......... ev ......... ho ......... nap', col1, currentY);

    doc.line(col1, currentY + 16, col1 + 55, currentY + 16);
    doc.text('Gondozo / Kiállító alairasa', col1, currentY + 21);

    doc.line(col2, currentY + 16, col2 + 50, currentY + 16);
    doc.text('P.H. / Bélyegzo helye', col2, currentY + 21);

    // Add footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Keszult a Cica-NyT Rendszerbol | ${cText(orgName)} | Oldal ${i} / ${totalPages}`,
            14,
            pageHeight - 8
        );
        doc.text(
            `Kiallítva: ${now.toLocaleString('hu-HU')}`,
            pageWidth - 14,
            pageHeight - 8,
            { align: 'right' }
        );
    }

    const safeName = cText(cat.nev || 'nevtelen').toLowerCase().replace(/[^a-z0-9]/g, '_');
    doc.save(`cica_adatlap_${safeName}_${dateStr}.pdf`);
}

