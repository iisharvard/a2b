import { Party } from '../store/negotiationSlice';

/**
 * Gets a party object by its party ID (e.g., "party-1")
 * 
 * @param parties Array of party objects
 * @param partyId The party ID to look for (e.g., "party-1")
 * @returns The party object if found, undefined otherwise
 */
export const getPartyById = (parties: Party[], partyId: string): Party | undefined => {
  if (!parties || !partyId) return undefined;
  
  // Party IDs are in the format "party-X" where X is the 1-based index in the array
  const match = partyId.match(/party-(\d+)/);
  if (!match) return undefined;
  
  const index = parseInt(match[1], 10) - 1; // Convert to 0-based index
  return parties[index];
};

/**
 * Gets a party ID from a party object
 * 
 * @param parties Array of party objects
 * @param party The party object to get the ID for
 * @returns The party ID (e.g., "party-1") if found, undefined otherwise
 */
export const getPartyId = (parties: Party[], party: Party): string | undefined => {
  if (!parties || !party) return undefined;
  
  const index = parties.indexOf(party);
  if (index === -1) return undefined;
  
  return `party-${index + 1}`;
};

/**
 * Finds the currently selected parties based on the selectedPartyPair
 * 
 * @param parties Array of party objects
 * @param selectedPartyPair Object containing party1Id and party2Id
 * @returns Object containing party1 and party2 objects, or null values if not found
 */
export const getSelectedParties = (
  parties: Party[],
  selectedPartyPair: { party1Id: string; party2Id: string } | null
): { party1: Party | null; party2: Party | null } => {
  if (!parties || !selectedPartyPair) {
    return { party1: null, party2: null };
  }
  
  const party1 = getPartyById(parties, selectedPartyPair.party1Id);
  const party2 = getPartyById(parties, selectedPartyPair.party2Id);
  
  return {
    party1: party1 || null,
    party2: party2 || null
  };
}; 