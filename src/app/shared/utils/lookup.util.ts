import { LookupType } from '../../../nswag/api-client';

/**
 * The backend serializes /api/Lookup dictionary keys fully lowercase
 * (e.g. "mainContractType" -> "maincontracttype"), regardless of the
 * camelCase LookupType enum value sent in the request. Do a case-insensitive
 * match so multi-word lookup types resolve correctly.
 */
export function getLookupData<T = unknown>(
  data: { [key: string]: T } | undefined,
  type: LookupType
): T | undefined {
  if (!data) {
    return undefined;
  }

  const target = type.toLowerCase();
  const key = Object.keys(data).find(k => k.toLowerCase() === target);
  return key ? data[key] : undefined;
}
