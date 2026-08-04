// Representative subset of PH provinces/cities for the address form.
// Extend as needed — not an exhaustive PSGC list.
export const PH_PROVINCES: Record<string, string[]> = {
  "Metro Manila": [
    "Manila",
    "Quezon City",
    "Makati",
    "Taguig",
    "Pasig",
    "Mandaluyong",
    "Pasay",
    "Paranaque",
    "Las Pinas",
    "Muntinlupa",
    "Marikina",
    "Caloocan",
    "Valenzuela",
    "Malabon",
    "Navotas",
    "San Juan",
    "Pateros",
  ],
  Cebu: ["Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City", "Toledo City"],
  Davao: ["Davao City", "Tagum City", "Digos City", "Panabo City"],
  Bulacan: ["Malolos", "Meycauayan", "San Jose del Monte", "Baliwag"],
  Iloilo: ["Iloilo City", "Passi City", "Oton", "Pavia"],
  Laguna: ["Santa Rosa", "Calamba", "San Pedro", "Binan"],
  Cavite: ["Bacoor", "Imus", "Dasmarinas", "General Trias"],
  Pampanga: ["San Fernando", "Angeles City", "Mabalacat"],
  "Negros Occidental": ["Bacolod City", "Bago City", "Talisay City"],
  "Rizal": ["Antipolo", "Cainta", "Taytay"],
  Batangas: ["Batangas City", "Lipa City", "Tanauan"],
};

export const PH_PROVINCE_LIST = Object.keys(PH_PROVINCES);
