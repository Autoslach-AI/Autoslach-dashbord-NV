/**
 * UNIVERSAL DOMAIN ADAPTATION ENGINE - REGISTRY
 * Maps business domains to specific labels, placeholders, and UI modules.
 */

export type BusinessDomain = 
  | 'AGRICULTURE' 
  | 'REAL_ESTATE' 
  | 'FASHION' 
  | 'HEALTH' 
  | 'ELECTRONICS' 
  | 'AUTOMOBILE'
  | 'GENERIC';

export interface DomainConfig {
  nameLabel: string;
  categoryLabel: string;
  descriptionPlaceholder: string;
  addItemLabel: string;
  itemType: string;
  categoryOptions: string[];
  modules: {
    id: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'date';
    label: string;
    placeholder?: string;
    options?: string[];
  }[];
}

const DOMAIN_REGISTRY: Record<BusinessDomain, DomainConfig> = {
  AGRICULTURE: {
    nameLabel: 'Resource/Crops Name',
    categoryLabel: 'Resource Type',
    descriptionPlaceholder: 'Describe the soil, yield expectations, or livestock health...',
    addItemLabel: 'Inject New Resource',
    itemType: 'Resource',
    categoryOptions: ['Crops', 'Livestock', 'Equipment', 'Soil Treatment'],
    modules: [
      { id: 'acreage', type: 'number', label: 'Acreage (ha)', placeholder: 'e.g., 50' },
      { id: 'harvest_date', type: 'date', label: 'Estimated Harvest' },
      { id: 'irrigation_system', type: 'select', label: 'Irrigation Type', options: ['Drip', 'Sprinkler', 'Manual', 'None'] }
    ]
  },
  REAL_ESTATE: {
    nameLabel: 'Property Address',
    categoryLabel: 'Property Type',
    descriptionPlaceholder: 'Describe the neighborhood, amenities, and structural conditions...',
    addItemLabel: 'Add New Property',
    itemType: 'Property',
    categoryOptions: ['Residential', 'Commercial', 'Industrial', 'Land'],
    modules: [
      { id: 'bedrooms', type: 'number', label: 'Bedrooms', placeholder: 'e.g., 3' },
      { id: 'sqft', type: 'number', label: 'Total Square Feet', placeholder: 'e.g., 2500' },
      { id: 'year_built', type: 'number', label: 'Year Built' },
      { id: 'is_furnished', type: 'boolean', label: 'Fully Furnished' }
    ]
  },
  FASHION: {
    nameLabel: 'Product Name',
    categoryLabel: 'Collection',
    descriptionPlaceholder: 'Describe fabric, fit, and style inspirations...',
    addItemLabel: 'Add New Garnment',
    itemType: 'Product',
    categoryOptions: ['Spring/Summer', 'Fall/Winter', 'Accessories', 'Footwear'],
    modules: [
      { id: 'size_grid', type: 'select', label: 'Size Grid', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'] },
      { id: 'material', type: 'text', label: 'Material', placeholder: 'e.g., 100% Organic Cotton' },
      { id: 'color_variants', type: 'text', label: 'Color Variants', placeholder: 'e.g., Midnight Black, Arctic White' }
    ]
  },
  ELECTRONICS: {
    nameLabel: 'Device Model',
    categoryLabel: 'Component Category',
    descriptionPlaceholder: 'List technical specs, battery life, and connectivity...',
    addItemLabel: 'Add New Component',
    itemType: 'Component',
    categoryOptions: ['Computers', 'Smartphones', 'Audio', 'Components'],
    modules: [
      { id: 'voltage', type: 'text', label: 'Voltage', placeholder: 'e.g., 110V - 240V' },
      { id: 'processor', type: 'text', label: 'Processor', placeholder: 'e.g., M3 Max' },
      { id: 'warranty_period', type: 'text', label: 'Warranty (Months)', placeholder: 'e.g., 24' }
    ]
  },
  AUTOMOBILE: {
    nameLabel: 'Vehicle Model',
    categoryLabel: 'Vehicle Type',
    descriptionPlaceholder: 'Describe engine specs, safety features, and interior...',
    addItemLabel: 'Add New Vehicle',
    itemType: 'Vehicle',
    categoryOptions: ['SUV', 'Sedan', 'Electric', 'Commercial'],
    modules: [
      { id: 'mileage', type: 'number', label: 'Current Mileage', placeholder: 'e.g., 15000' },
      { id: 'fuel_type', type: 'select', label: 'Fuel Type', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
      { id: 'transmission', type: 'select', label: 'Transmission', options: ['Automatic', 'Manual'] }
    ]
  },
  HEALTH: {
    nameLabel: 'Service/Item Name',
    categoryLabel: 'Medical Division',
    descriptionPlaceholder: 'Describe medical use cases, contraindications, and results...',
    addItemLabel: 'Add Medical Item',
    itemType: 'Item',
    categoryOptions: ['Diagnostics', 'Pharmacy', 'Surgical', 'Equipment'],
    modules: [
      { id: 'expiry_date', type: 'date', label: 'Expiry Date' },
      { id: 'storage_temp', type: 'text', label: 'Storage Temperature', placeholder: 'e.g., 2°C to 8°C' },
      { id: 'is_prescription_required', type: 'boolean', label: 'Prescription Needed' }
    ]
  },
  GENERIC: {
    nameLabel: 'Product Name',
    categoryLabel: 'Category',
    descriptionPlaceholder: 'Describe your product...',
    addItemLabel: 'Add Product',
    itemType: 'Product',
    categoryOptions: ['General', 'Other'],
    modules: []
  }
};

export function getDomainConfig(domain: string): DomainConfig {
  const d = domain.toUpperCase() as BusinessDomain;
  return DOMAIN_REGISTRY[d] || DOMAIN_REGISTRY.GENERIC;
}
