/**
 * AGENT KNOWLEDGE SYNC
 * Prepares product metadata (Universal Core + Extended Specs) for AI Agent context.
 */

export interface ProductContext {
  name: string;
  base_price: number;
  description: string;
  category: string;
  extended_specs: any;
}

export function formatProductForAgent(product: ProductContext, domain: string): string {
  let context = `[PRODUCT_RECORD]\nNAME: ${product.name}\nDOMAIN: ${domain}\nCATEGORY: ${product.category}\nPRICE: ${product.base_price} FCF\nDESCRIPTION: ${product.description}\n\n[EXTENDED_SPECS]\n`;
  
  Object.entries(product.extended_specs).forEach(([key, value]) => {
    context += `${key.toUpperCase()}: ${value}\n`;
  });

  context += `\n[INSTRUCTION]: Use these technical details for precise user support and development planning.`;
  
  return context;
}
