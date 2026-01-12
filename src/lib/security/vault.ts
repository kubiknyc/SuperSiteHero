/**
 * Vault Service
 * Secure secret management using Supabase Vault extension.
 *
 * Vault stores secrets encrypted at rest using authenticated encryption.
 * Secrets are only decrypted when accessed through the vault.decrypted_secrets view.
 *
 * @see https://supabase.com/docs/guides/database/vault
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface VaultSecret {
  id: string;
  name: string | null;
  description: string | null;
  decrypted_secret: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSecretOptions {
  /** Optional unique name for the secret (for easy lookup) */
  name?: string;
  /** Optional description of what this secret is for */
  description?: string;
}

/**
 * Vault service for secure API key and secret management
 */
export const vaultService = {
  /**
   * Create a new secret in the vault
   * @returns The UUID of the created secret
   */
  async createSecret(
    secret: string,
    options?: CreateSecretOptions
  ): Promise<string> {
    try {
      // Use the vault.create_secret function
      const { data, error } = await (supabase as any).rpc('vault_create_secret', {
        p_secret: secret,
        p_name: options?.name || null,
        p_description: options?.description || null,
      });

      if (error) {
        // If the RPC doesn't exist, fall back to direct insert
        if (error.code === '42883') {
          return this.createSecretDirect(secret, options);
        }
        throw error;
      }

      return data as string;
    } catch (error) {
      logger.error('[Vault] Failed to create secret:', error);
      throw new Error('Failed to store secret securely');
    }
  },

  /**
   * Direct insert fallback if RPC function doesn't exist
   */
  async createSecretDirect(
    secret: string,
    options?: CreateSecretOptions
  ): Promise<string> {
    // Use the built-in vault.create_secret SQL function
    const { data, error } = await (supabase as any).rpc('create_vault_secret', {
      secret_value: secret,
      secret_name: options?.name || null,
      secret_description: options?.description || null,
    });

    if (error) {
      logger.error('[Vault] Direct create failed:', error);
      throw error;
    }

    return data as string;
  },

  /**
   * Get a decrypted secret by its ID
   */
  async getSecret(secretId: string): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('id', secretId)
        .single();

      if (error) {
        // Try vault schema
        if (error.code === 'PGRST200' || error.message?.includes('not found')) {
          return this.getSecretFromVaultSchema(secretId);
        }
        throw error;
      }

      return data?.decrypted_secret || null;
    } catch (error) {
      logger.error('[Vault] Failed to retrieve secret:', error);
      return null;
    }
  },

  /**
   * Get secret from vault schema (fallback)
   */
  async getSecretFromVaultSchema(secretId: string): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_vault_secret', {
        secret_id: secretId,
      });

      if (error) {
        logger.error('[Vault] RPC get failed:', error);
        return null;
      }

      return data as string | null;
    } catch (error) {
      logger.error('[Vault] Schema fallback failed:', error);
      return null;
    }
  },

  /**
   * Get a secret by its unique name
   */
  async getSecretByName(name: string): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_vault_secret_by_name', {
        secret_name: name,
      });

      if (error) {
        logger.error('[Vault] Failed to get secret by name:', error);
        return null;
      }

      return data as string | null;
    } catch (error) {
      logger.error('[Vault] Get by name failed:', error);
      return null;
    }
  },

  /**
   * Update an existing secret
   */
  async updateSecret(
    secretId: string,
    newSecret: string,
    options?: { name?: string; description?: string }
  ): Promise<boolean> {
    try {
      const { error } = await (supabase as any).rpc('update_vault_secret', {
        secret_id: secretId,
        new_secret: newSecret,
        new_name: options?.name,
        new_description: options?.description,
      });

      if (error) {
        logger.error('[Vault] Failed to update secret:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[Vault] Update failed:', error);
      return false;
    }
  },

  /**
   * Delete a secret from the vault
   */
  async deleteSecret(secretId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any).rpc('delete_vault_secret', {
        secret_id: secretId,
      });

      if (error) {
        logger.error('[Vault] Failed to delete secret:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[Vault] Delete failed:', error);
      return false;
    }
  },

  /**
   * Check if vault is available and properly configured
   */
  async isVaultAvailable(): Promise<boolean> {
    try {
      const { error } = await (supabase as any).rpc('check_vault_available');
      return !error;
    } catch {
      // If RPC doesn't exist, vault might still work via direct access
      return false;
    }
  },

  /**
   * Store an API key with a standardized name
   * This is a convenience method for storing provider API keys
   */
  async storeApiKey(
    provider: 'openai' | 'anthropic' | 'custom',
    apiKey: string,
    companyId: string
  ): Promise<string> {
    const name = `api_key_${provider}_${companyId}`;
    const description = `${provider.toUpperCase()} API key for company ${companyId}`;

    // Check if a secret with this name already exists
    const existingId = await this.getSecretIdByName(name);

    if (existingId) {
      // Update existing secret
      await this.updateSecret(existingId, apiKey);
      return existingId;
    }

    // Create new secret
    return this.createSecret(apiKey, { name, description });
  },

  /**
   * Get secret ID by name (without decrypting)
   */
  async getSecretIdByName(name: string): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_vault_secret_id_by_name', {
        secret_name: name,
      });

      if (error) {
        return null;
      }

      return data as string | null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieve an API key by provider
   */
  async getApiKey(
    provider: 'openai' | 'anthropic' | 'custom',
    companyId: string
  ): Promise<string | null> {
    const name = `api_key_${provider}_${companyId}`;
    return this.getSecretByName(name);
  },
};

export default vaultService;
