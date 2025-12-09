/**
 * Company API Service
 *
 * CRUD operations for company profile management.
 */

import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export type Company = Tables<'companies'>
export type CompanyUpdate = TablesUpdate<'companies'>

export const companyApi = {
  /**
   * Get company by ID
   */
  async getCompany(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) {
      logger.error('[CompanyApi] Failed to fetch company:', error)
      throw error
    }

    return data
  },

  /**
   * Update company profile
   */
  async updateCompany(companyId: string, updates: CompanyUpdate): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select()
      .single()

    if (error) {
      logger.error('[CompanyApi] Failed to update company:', error)
      throw error
    }

    return data
  },

  /**
   * Upload company logo to storage
   */
  async uploadLogo(companyId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/logo.${fileExt}`

    // Upload to company-logos bucket
    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      logger.error('[CompanyApi] Failed to upload logo:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName)

    // Update company with new logo URL
    await this.updateCompany(companyId, { logo_url: urlData.publicUrl })

    return urlData.publicUrl
  },

  /**
   * Delete company logo
   */
  async deleteLogo(companyId: string): Promise<void> {
    // List files in company folder
    const { data: files } = await supabase.storage
      .from('company-logos')
      .list(companyId)

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${companyId}/${f.name}`)
      await supabase.storage.from('company-logos').remove(filePaths)
    }

    // Clear logo URL in company record
    await this.updateCompany(companyId, { logo_url: null })
  },
}

export default companyApi
