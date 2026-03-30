export interface Menu {
  restaurantName: string | null;
  menuType: string | null;        // "dinner", "brunch", "drinks", etc.
  categories: MenuCategory[];
  extractionConfidence: number;   // 0-1 overall
  warnings: string[];             // "Page 2 was blurry", etc.
}

export interface MenuCategory {
  name: string;
  description: string | null;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  description: string | null;
  price: string | null;           // String to handle "Market Price", "$12/$18"
  allergens: string[];            // ["dairy", "nuts", "gluten"]
  dietaryFlags: string[];         // ["vegetarian", "spicy", "gluten-free"]
  modifications: string[] | null;
  portionSize: string | null;
  confidence: number;             // 0-1 per item
}
