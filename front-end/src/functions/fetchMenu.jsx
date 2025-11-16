// Function to fetch menu data from backend API
export async function fetchMenu(hall, meal, station = null, dietary = null) {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    let url = `${baseUrl}/api/menu/${hall}/${meal}`;
    
    const params = new URLSearchParams();
    if (station) params.append('station', station);
    if (dietary) params.append('dietary', dietary);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching menu:', error);
    throw error;
  }
}

