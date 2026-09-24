import { createClient } from '../supabase';

/**
 * THE ORACLE : DATABASE ACCESS LAYER
 * Built for high-isolation multi-tenant agent management.
 */

/**
 * Retrieves the core data for a specific enterprise node.
 * Includes token budget, consumption metrics, and tier status.
 */
export async function getEnterpriseData(enterpriseId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('enterprises')
    .select('*')
    .eq('id', enterpriseId)
    .single();

  if (error) {
    console.error(`[ORACLE_ERROR] Failed to fetch enterprise ${enterpriseId}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Fetches all neural agents registered under a specific enterprise.
 */
export async function getAgentsByEnterprise(enterpriseId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('agents')
    .select(`*`)
    .eq('enterprise_id', enterpriseId);

  if (error) {
    console.error(`[ORACLE_ERROR] Failed to fetch agents for enterprise ${enterpriseId}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Updates an agent's operational protocol and configuration.
 * Targeted edit of system_prompt, model_config, or role_protocol.
 */
export async function updateAgentProtocol(agentId: string, updateData: {
  name?: string;
  system_prompt?: string;
  model_config?: any;
  role_protocol?: string;
  status?: 'active' | 'standby';
  token_budget?: number;
  temperature?: number;
  fallback_chain?: string[];
}) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('agents')
    .update(updateData)
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    console.error(`[ORACLE_ERROR] Protocol update failed for agent ${agentId}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Synchronizes token consumption metrics for an enterprise.
 * Automatically triggers the 'Oracle Eye' guard for usage thresholds.
 */
export async function syncTokenUsage(enterpriseId: string, amount: number) {
  const supabase = createClient();

  // First, get current usage to perform calculation
  const { data: enterprise, error: fetchError } = await supabase
    .from('enterprises')
    .select('id, total_tokens_consumed')
    .eq('id', enterpriseId)
    .single();

  if (fetchError || !enterprise) {
    console.error(`[ORACLE_ERROR] Failed to sync tokens for enterprise ${enterpriseId}:`, fetchError);
    return { data: null, error: fetchError };
  }

  const newTotal = (enterprise.total_tokens_consumed || 0) + amount;

  const { data, error } = await supabase
    .from('enterprises')
    .update({ total_tokens_consumed: newTotal })
    .eq('id', enterpriseId)
    .select()
    .single();

  if (error) {
    console.error(`[ORACLE_ERROR] Token sync failed for enterprise ${enterpriseId}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Advanced: Knowledge Base Injection
 * Allows manual indexing of enterprise content for vector search.
 */
export async function indexKnowledgeBase(enterpriseId: string, content: string, embedding: number[], category?: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('enterprise_kb')
    .insert({
      enterprise_id: enterpriseId,
      content,
      embedding,
      category
    })
    .select()
    .single();

  if (error) {
    console.error(`[ORACLE_ERROR] KB indexing failed:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}
