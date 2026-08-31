export const toSupabaseCat = (localCat: any) => {
    return {
        id: localCat.id,
        sorszam: localCat.sorszam,
        nev: localCat.nev,
        ivar: localCat.ivar,
        szin: localCat.szin,
        szuletes: localCat.szuletes,
        created: localCat.created,
        updated: localCat.updated,
        status: localCat.status,
        osszKoltseg: localCat.osszKoltseg,
        deviceId: localCat.deviceId,
        oltasok: localCat.oltasok,
        tesztek: localCat.tesztek,
        kezelesek: localCat.kezelesek,
        intakeType: localCat.intakeType,
        gazdisDate: localCat.gazdisDate,
        gazdisPerson: localCat.gazdisPerson,
        hasKiskonyv: localCat.hasKiskonyv,
        kiskonyvSzam: localCat.kiskonyvSzam,
        kiskonyvDate: localCat.kiskonyvDate,
        hasPassport: localCat.hasPassport,
        passportSzam: localCat.passportSzam,
        passportDate: localCat.passportDate,
        hasChip: localCat.hasChip,
        chipNumber: localCat.chipNumber,
        chipDate: localCat.chipDate,
        chipLocation: localCat.chipLocation,
        foster_id: localCat.fosterId || null,
        is_spayed: localCat.isSpayed || false,
        device_group: 'foundation' // Existing default in syncService
    };
};

export const fromSupabaseCat = (remoteCat: any) => {
    const { foster_id, is_spayed, ...rest } = remoteCat;
    return {
        ...rest,
        fosterId: foster_id,
        isSpayed: is_spayed,
        syncStatus: 'synced'
    };
};

export const toSupabaseFosterParent = (foster: any) => {
    return {
        id: foster.id,
        name: foster.name,
        phone: foster.phone,
        email: foster.email,
        address: foster.address,
        city: foster.city,
        max_capacity: foster.maxCapacity,
        status: foster.status,
        notes: foster.notes,
        is_quarantine: foster.isQuarantine || false,
        is_kitten_specialist: foster.isKittenSpecialist || false,
        is_medical_specialist: foster.isMedicalSpecialist || false,
        created_at: foster.createdAt || new Date().toISOString(),
        updated_at: foster.updatedAt || new Date().toISOString()
    };
};

export const fromSupabaseFosterParent = (remoteFoster: any) => {
    return {
        id: remoteFoster.id,
        name: remoteFoster.name,
        phone: remoteFoster.phone,
        email: remoteFoster.email,
        address: remoteFoster.address,
        city: remoteFoster.city,
        maxCapacity: remoteFoster.max_capacity,
        status: remoteFoster.status,
        notes: remoteFoster.notes,
        isQuarantine: remoteFoster.is_quarantine,
        isKittenSpecialist: remoteFoster.is_kitten_specialist,
        isMedicalSpecialist: remoteFoster.is_medical_specialist,
        createdAt: remoteFoster.created_at,
        updatedAt: remoteFoster.updated_at,
        syncStatus: 'synced'
    };
};

export const toSupabaseFosterSupply = (supply: any) => {
    return {
        id: typeof supply.id === 'number' ? undefined : supply.id,
        foster_id: supply.fosterId,
        type: supply.type,
        item: supply.item,
        quantity: supply.quantity,
        unit: supply.unit,
        date: supply.date,
        status: supply.status,
        notes: supply.notes,
        created_at: supply.createdAt || new Date().toISOString(),
        updated_at: supply.updatedAt || new Date().toISOString()
    };
};

export const toSupabaseFosterExpense = (exp: any) => {
    return {
        id: typeof exp.id === 'number' ? undefined : exp.id,
        foster_id: exp.fosterId,
        cat_id: exp.catId || null,
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        receipt_number: exp.receiptNumber,
        vendor: exp.vendor,
        notes: exp.notes,
        created_at: exp.createdAt || new Date().toISOString(),
        updated_at: exp.updatedAt || new Date().toISOString()
    };
};

export const toSupabaseInventory = (inv: any) => {
    return {
        id: typeof inv.id === 'number' ? undefined : inv.id,
        direction: inv.direction,
        item_type: inv.itemType,
        source_type: inv.sourceType,
        brand_or_name: inv.brandOrName,
        quantity: inv.quantity,
        unit: inv.unit,
        date: inv.date,
        source_or_recipient: inv.sourceOrRecipient,
        destination: inv.destination,
        notes: inv.notes,
        created_at: inv.createdAt || new Date().toISOString(),
        updated_at: inv.updatedAt || new Date().toISOString()
    };
};

export const fromSupabaseInventory = (remoteInv: any) => {
    return {
        id: remoteInv.id,
        direction: remoteInv.direction,
        itemType: remoteInv.item_type,
        sourceType: remoteInv.source_type,
        brandOrName: remoteInv.brand_or_name,
        quantity: remoteInv.quantity,
        unit: remoteInv.unit,
        date: remoteInv.date,
        sourceOrRecipient: remoteInv.source_or_recipient,
        destination: remoteInv.destination,
        notes: remoteInv.notes,
        createdAt: remoteInv.created_at,
        updatedAt: remoteInv.updated_at,
        syncStatus: 'synced'
    };
};

export const toSupabaseFinance = (fin: any) => {
    return {
        id: typeof fin.id === 'number' ? undefined : fin.id,
        type: fin.type,
        category: fin.category,
        amount: fin.amount,
        date: fin.date,
        title: fin.title,
        partner_name: fin.partnerName,
        payment_method: fin.paymentMethod,
        status: fin.status,
        invoice_number: fin.invoiceNumber,
        cat_id: fin.catId,
        foster_id: fin.fosterId,
        notes: fin.notes,
        created_at: fin.createdAt || new Date().toISOString(),
        updated_at: fin.updatedAt || new Date().toISOString()
    };
};
