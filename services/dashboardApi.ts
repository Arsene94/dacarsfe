import { WidgetActivityResponse } from '@/types/admin';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const fetchWidgetActivity = async (
  period: string,
): Promise<WidgetActivityResponse> => {
  const response = await fetch(`${API_BASE_URL}/dashboard/widget-activity/${period}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

