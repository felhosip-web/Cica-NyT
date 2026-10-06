import { db } from '../lib/db';
import { Cat } from '../components/CatCard';

export interface CatValidationError {
  field: string;
  message: string;
}

export interface DuplicateCheckResult {
  exactChipMatchCat?: Cat;
  similarNameMatches: Cat[];
}

/**
  * Cleans microchip number string by stripping whitespace and dashes
  */
export function cleanChipNumber(chip: string): string {
  return (chip || '').replace(/[\s-]/g, '');
}

/**
  * Validates microchip number (must be exactly 15 digits)
  */
export function isValidHungarianMicrochip(chip: string): boolean {
  const cleaned = cleanChipNumber(chip);
  return /^\d{15}$/.test(cleaned);
}

/**
  * Validate cat form input data
  */
export function validateCatFormData(data: {
  nev: string;
  status: string;
  szuletes?: string;
  hasChip: boolean;
  chipNumber?: string;
  chipDate?: string;
  isSpayed: boolean;
  spayedDate?: string;
  intakeType?: string;
  createdDate?: string;
  gazdisDate?: string;
}): CatValidationError[] {
  const errors: CatValidationError[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Name required
  if (!data.nev || !data.nev.trim()) {
    errors.push({ field: 'nev', message: 'A cica nevének megadása kötelező!' });
  }

  // 2. Microchip required if hasChip is true, exactly 15 digits
  if (data.hasChip) {
    if (!data.chipNumber || !data.chipNumber.trim()) {
      errors.push({ field: 'chipNumber', message: 'A mikrochip számának megadása kötelező, ha a jelölés be van pipálva!' });
    } else if (!isValidHungarianMicrochip(data.chipNumber)) {
      errors.push({
        field: 'chipNumber',
        message: 'A magyar mikrochip számnak pontosan 15 számjegyből kell állnia!'
      });
    }
  }

  // 3. Birth date cannot be in the future
  if (data.szuletes && data.szuletes > todayStr) {
    errors.push({ field: 'szuletes', message: 'A születési dátum nem lehet jövőbeli dátum!' });
  }

  // 4. Spay date cannot be before birth date
  if (data.isSpayed && data.spayedDate && data.szuletes) {
    if (data.spayedDate < data.szuletes) {
      errors.push({ field: 'spayedDate', message: 'Az ivartalanítás dátuma nem lehet korábbi a születési dátumnál!' });
    }
  }

  // 5. Chip date cannot be before birth date
  if (data.hasChip && data.chipDate && data.szuletes) {
    if (data.chipDate < data.szuletes) {
      errors.push({ field: 'chipDate', message: 'A chip beültetés dátuma nem lehet korábbi a születési dátumnál!' });
    }
  }

  // 6. Adoption (gazdis) date check
  if (data.status === 'gazdis' && data.gazdisDate) {
    const intakeOrCreatedDate = data.createdDate || todayStr;
    if (data.gazdisDate < intakeOrCreatedDate) {
      errors.push({
        field: 'gazdisDate',
        message: 'Az örökbefogadás dátuma nem lehet korábbi a bekerülés / regisztráció dátumánál!'
      });
    }
  }

  return errors;
}

/**
  * Check for duplicates in Dexie database before save
  */
export async function checkCatDuplicates(
  nev: string,
  chipNumber: string | null | undefined,
  currentCatId?: string | number | null
): Promise<DuplicateCheckResult> {
  const result: DuplicateCheckResult = {
    similarNameMatches: []
  };

  try {
    const allCats: Cat[] = await db.cats.toArray();

    // Exclude current cat if editing
    const otherCats = allCats.filter((c) => String(c.id) !== String(currentCatId));

    // 1. Check exact chip match
    if (chipNumber) {
      const cleanedInputChip = cleanChipNumber(chipNumber);
      if (cleanedInputChip.length > 0) {
        const chipMatch = otherCats.find((c) => {
          if (!c.chipNumber) return false;
          return cleanChipNumber(c.chipNumber) === cleanedInputChip;
        });
        if (chipMatch) {
          result.exactChipMatchCat = chipMatch;
        }
      }
    }

    // 2. Check similar name
    if (nev && nev.trim()) {
      const trimmedInputName = nev.trim().toLowerCase();
      const nameMatches = otherCats.filter((c) => {
        if (!c.nev) return false;
        return c.nev.trim().toLowerCase() === trimmedInputName;
      });
      result.similarNameMatches = nameMatches;
    }
  } catch (err) {
    console.error('Error during duplicate check:', err);
  }

  return result;
}
