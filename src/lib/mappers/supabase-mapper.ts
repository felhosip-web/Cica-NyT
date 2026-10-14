/**
 * Converts a local cat record to Supabase format
 * @param localCat - The local cat object from IndexedDB
 * @returns Cat object formatted for Supabase storage
 */
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
        device_group: 'foundation', // Existing default in syncService
        deleted_at: localCat.deletedAt || null,
        deleted_by: localCat.deletedBy || null
    };
};

/**
 * Converts a Supabase cat record to local IndexedDB format
 * @param remoteCat - The cat object from Supabase
 * @returns Cat object formatted for local IndexedDB storage
 */
export const fromSupabaseCat = (remoteCat: any) => {
    const { foster_id, is_spayed, device_group, deleted_at, deleted_by, ...rest } = remoteCat;
    return {
        ...rest,
        fosterId: foster_id,
        isSpayed: is_spayed,
        deletedAt: deleted_at || remoteCat.deletedAt || null,
        deletedBy: deleted_by || remoteCat.deletedBy || null,
        syncStatus: 'synced'
    };
};

export const toSupabaseEvent = (ev: any) => {
    return {
        id: typeof ev.id === 'number' ? undefined : ev.id,
        cat_id: ev.catId || null,
        type: ev.type,
        title: ev.title,
        date: ev.date,
        status: ev.status,
        cost: ev.cost || 0,
        notes: ev.notes || ev.description || null,
        finance_id: ev.financeId || null,
        payment_method: ev.paymentMethod || null,
        invoice_number: ev.invoiceNumber || null,
        created_at: ev.createdAt || new Date().toISOString(),
        updated_at: ev.updatedAt || new Date().toISOString(),
        deleted_at: ev.deletedAt || null,
        deleted_by: ev.deletedBy || null
    };
};

export const fromSupabaseEvent = (remoteEv: any) => {
    return {
        id: remoteEv.id,
        catId: remoteEv.cat_id,
        type: remoteEv.type,
        title: remoteEv.title,
        date: remoteEv.date,
        status: remoteEv.status,
        cost: remoteEv.cost,
        notes: remoteEv.notes,
        financeId: remoteEv.finance_id,
        paymentMethod: remoteEv.payment_method,
        invoiceNumber: remoteEv.invoice_number,
        createdAt: remoteEv.created_at,
        updatedAt: remoteEv.updated_at,
        deletedAt: remoteEv.deleted_at || remoteEv.deletedAt || null,
        deletedBy: remoteEv.deleted_by || remoteEv.deletedBy || null,
        syncStatus: 'synced'
    };
};

export const toSupabaseTnr = (tnr: any) => {
    return {
        id: tnr.id,
        cat_name_or_tag: tnr.catNameOrTag || tnr.nev || tnr.id,
        location_trapped: tnr.locationTrapped || null,
        trapped_date: tnr.dateTrapped || tnr.trappedDate || null,
        trapped_by: tnr.trappedBy || null,
        clinic_location: tnr.clinicLocation || null,
        surgeon_name: tnr.surgeonName || null,
        location_released: tnr.locationReleased || null,
        released_date: tnr.releasedDate || null,
        status: tnr.status || 'befogva',
        ear_tip: tnr.earTip || false,
        notes: tnr.notes || null,
        created_at: tnr.createdAt || new Date().toISOString(),
        updated_at: tnr.updatedAt || new Date().toISOString(),
        deleted_at: tnr.deletedAt || null,
        deleted_by: tnr.deletedBy || null
    };
};

export const fromSupabaseTnr = (remoteTnr: any) => {
    return {
        id: remoteTnr.id,
        catNameOrTag: remoteTnr.cat_name_or_tag,
        locationTrapped: remoteTnr.location_trapped,
        dateTrapped: remoteTnr.trapped_date,
        trappedBy: remoteTnr.trapped_by,
        clinicLocation: remoteTnr.clinic_location,
        surgeonName: remoteTnr.surgeon_name,
        locationReleased: remoteTnr.location_released,
        releasedDate: remoteTnr.released_date,
        status: remoteTnr.status,
        earTip: remoteTnr.ear_tip,
        notes: remoteTnr.notes,
        createdAt: remoteTnr.created_at,
        updatedAt: remoteTnr.updated_at,
        deletedAt: remoteTnr.deleted_at || remoteTnr.deletedAt || null,
        deletedBy: remoteTnr.deleted_by || remoteTnr.deletedBy || null,
        syncStatus: 'synced'
    };
};

export const toSupabaseDonationCampaign = (c: any) => {
    return {
        id: typeof c.id === 'number' ? undefined : c.id,
        name: c.name,
        start_date: c.startDate,
        end_date: c.endDate || null,
        location: c.location,
        participants: c.participants || [],
        status: c.status,
        notes: c.notes || null,
        inventory_converted: c.inventoryConverted || false,
        created_at: c.createdAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
        deleted_at: c.deletedAt || null,
        deleted_by: c.deletedBy || null
    };
};

export const fromSupabaseDonationCampaign = (remoteC: any) => {
    return {
        id: remoteC.id,
        name: remoteC.name,
        startDate: remoteC.start_date,
        endDate: remoteC.end_date,
        location: remoteC.location,
        participants: remoteC.participants,
        status: remoteC.status,
        notes: remoteC.notes,
        inventoryConverted: remoteC.inventory_converted,
        createdAt: remoteC.created_at,
        updatedAt: remoteC.updated_at,
        deletedAt: remoteC.deleted_at || remoteC.deletedAt || null,
        deletedBy: remoteC.deleted_by || remoteC.deletedBy || null,
        syncStatus: 'synced'
    };
};

export const toSupabaseDonationCampaignItem = (item: any) => {
    return {
        id: typeof item.id === 'number' ? undefined : item.id,
        campaign_id: item.campaignId,
        category: item.category,
        brand_or_name: item.brandOrName || null,
        quantity: item.quantity || 1,
        unit: item.unit || 'db',
        estimated_value: item.estimatedValue || null,
        notes: item.notes || null,
        created_at: item.createdAt || new Date().toISOString(),
        deleted_at: item.deletedAt || null,
        deleted_by: item.deletedBy || null
    };
};

export const fromSupabaseDonationCampaignItem = (remoteItem: any) => {
    return {
        id: remoteItem.id,
        campaignId: remoteItem.campaign_id,
        category: remoteItem.category,
        brandOrName: remoteItem.brand_or_name,
        quantity: remoteItem.quantity,
        unit: remoteItem.unit,
        estimatedValue: remoteItem.estimated_value,
        notes: remoteItem.notes,
        createdAt: remoteItem.created_at,
        deletedAt: remoteItem.deleted_at || remoteItem.deletedAt || null,
        deletedBy: remoteItem.deleted_by || remoteItem.deletedBy || null,
        syncStatus: 'synced'
    };
};

/**
 * Converts a local foster parent record to Supabase format
 * @param foster - The local foster parent object from IndexedDB
 * @returns Foster parent object formatted for Supabase storage
 */
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
        updated_at: foster.updatedAt || new Date().toISOString(),
        deleted_at: foster.deletedAt || null,
        deleted_by: foster.deletedBy || null
    };
};

/**
 * Converts a Supabase foster parent record to local IndexedDB format
 * @param remoteFoster - The foster parent object from Supabase
 * @returns Foster parent object formatted for local IndexedDB storage
 */
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
        deletedAt: remoteFoster.deleted_at || remoteFoster.deletedAt || null,
        deletedBy: remoteFoster.deleted_by || remoteFoster.deletedBy || null,
        syncStatus: 'synced'
    };
};

/**
 * Converts a local foster supply record to Supabase format
 * @param supply - The local foster supply object from IndexedDB
 * @returns Foster supply object formatted for Supabase storage
 */
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
        updated_at: supply.updatedAt || new Date().toISOString(),
        deleted_at: supply.deletedAt || null,
        deleted_by: supply.deletedBy || null
    };
};

export const fromSupabaseFosterSupply = (remote: any) => {
    return {
        id: remote.id,
        fosterId: remote.foster_id,
        type: remote.type,
        item: remote.item,
        quantity: remote.quantity,
        unit: remote.unit,
        date: remote.date,
        status: remote.status,
        notes: remote.notes,
        createdAt: remote.created_at,
        updatedAt: remote.updated_at,
        deletedAt: remote.deleted_at || remote.deletedAt || null,
        deletedBy: remote.deleted_by || remote.deletedBy || null,
        syncStatus: 'synced'
    };
};

/**
 * Converts a local foster expense record to Supabase format
 * @param exp - The local foster expense object from IndexedDB
 * @returns Foster expense object formatted for Supabase storage
 */
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
        updated_at: exp.updatedAt || new Date().toISOString(),
        deleted_at: exp.deletedAt || null,
        deleted_by: exp.deletedBy || null
    };
};

export const fromSupabaseFosterExpense = (remote: any) => {
    return {
        id: remote.id,
        fosterId: remote.foster_id,
        catId: remote.cat_id,
        category: remote.category,
        amount: remote.amount,
        date: remote.date,
        receiptNumber: remote.receipt_number,
        vendor: remote.vendor,
        notes: remote.notes,
        createdAt: remote.created_at,
        updatedAt: remote.updated_at,
        deletedAt: remote.deleted_at || remote.deletedAt || null,
        deletedBy: remote.deleted_by || remote.deletedBy || null,
        syncStatus: 'synced'
    };
};

/**
 * Converts a local inventory record to Supabase format
 * @param inv - The local inventory object from IndexedDB
 * @returns Inventory object formatted for Supabase storage
 */
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
        updated_at: inv.updatedAt || new Date().toISOString(),
        deleted_at: inv.deletedAt || null,
        deleted_by: inv.deletedBy || null
    };
};

/**
 * Converts a Supabase inventory record to local IndexedDB format
 * @param remoteInv - The inventory object from Supabase
 * @returns Inventory object formatted for local IndexedDB storage
 */
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
        deletedAt: remoteInv.deleted_at || remoteInv.deletedAt || null,
        deletedBy: remoteInv.deleted_by || remoteInv.deletedBy || null,
        syncStatus: 'synced'
    };
};

/**
 * Converts a local finance record to Supabase format
 * @param fin - The local finance object from IndexedDB
 * @returns Finance object formatted for Supabase storage
 */
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
        updated_at: fin.updatedAt || new Date().toISOString(),
        deleted_at: fin.deletedAt || null,
        deleted_by: fin.deletedBy || null
    };
};

export const fromSupabaseFinance = (remoteFin: any) => {
    return {
        id: remoteFin.id,
        type: remoteFin.type,
        category: remoteFin.category,
        amount: remoteFin.amount,
        date: remoteFin.date,
        title: remoteFin.title,
        partnerName: remoteFin.partner_name,
        paymentMethod: remoteFin.payment_method,
        status: remoteFin.status,
        invoiceNumber: remoteFin.invoice_number,
        catId: remoteFin.cat_id,
        fosterId: remoteFin.foster_id,
        notes: remoteFin.notes,
        createdAt: remoteFin.created_at,
        updatedAt: remoteFin.updated_at,
        deletedAt: remoteFin.deleted_at || remoteFin.deletedAt || null,
        deletedBy: remoteFin.deleted_by || remoteFin.deletedBy || null,
        syncStatus: 'synced'
    };
};
