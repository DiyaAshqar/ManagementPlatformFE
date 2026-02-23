/**
 * Display-ready interface for a BoQ item.
 * Combines raw DTO fields with computed / resolved display values.
 */
export interface BoqItemDisplay {
  id: number;
  projectStageId: number;
  /** Formatted code e.g. "Item-001" */
  itemCode: string;
  description: string;
  materialId: number;
  unitId: number;
  /** Human-readable unit label, e.g. "m³", "kg" */
  unitLabel: string;
  actualQuantity: number;
  /** Unit price */
  price: number;
  /** price × actualQuantity */
  amount: number;
  subTotal: number;
  constructorId?: number;
}
