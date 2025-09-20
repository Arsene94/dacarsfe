// Serviciu pentru comunicarea cu API-ul Laravel pentru roata norocului

import type { DiscountValidationResponse, ReservationPayload } from '@/types/reservation';
import { Prize, SpinResult } from '@/types/wheel';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Obține lista de premii disponibile
export const fetchWheelPrizes = async (): Promise<Prize[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wheel/prizes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.prizes || [];
  } catch (error) {
    console.error('Error fetching wheel prizes:', error);
    throw error;
  }
};

// Învârte roata și obține rezultatul
export const spinWheelApi = async (userId?: string): Promise<SpinResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wheel/spin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Adaugă token de autentificare dacă este necesar
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userId,
        // Alte date necesare pentru tracking
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error spinning wheel:', error);
    throw error;
  }
};

// Validează un cod de reducere
export const validateDiscountCode = async (code: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wheel/validate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.valid || false;
  } catch (error) {
    console.error('Error validating discount code:', error);
    return false;
  }
};

// Aplică un cod de reducere la rezervare
export const applyDiscountCode = async (
  code: string,
  reservationData: ReservationPayload | Record<string, unknown>,
): Promise<DiscountValidationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wheel/apply-discount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        code,
        reservation: reservationData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DiscountValidationResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error applying discount code:', error);
    throw error;
  }
};
