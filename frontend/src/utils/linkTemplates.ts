/**
 * Utility functions for custom link templates
 */
import type { CustomLinkTemplate } from '@/types';

/**
 * Builds a custom link URL by replacing {field_name} placeholders with contact data values.
 *
 * @param template - The link template object with url_template containing {field_name} placeholders
 * @param contactData - The contact's data object (from Contact.data JSONB)
 * @returns The built URL string with all placeholders replaced, or null if required fields are missing
 *
 * @example
 * const template = {
 *   id: '1',
 *   name: 'Google Search',
 *   url_template: 'https://google.com/search?q={company}+{city}',
 *   enabled: true
 * };
 * const contactData = { company: 'Acme Corp', city: 'Milano' };
 * const url = buildCustomLinkUrl(template, contactData);
 * // Returns: 'https://google.com/search?q=Acme%20Corp+Milano'
 */
export function buildCustomLinkUrl(
  template: CustomLinkTemplate,
  contactData: Record<string, any>
): string | null {
  // Skip disabled templates
  if (!template.enabled) {
    return null;
  }

  // Start with the template URL
  let url = template.url_template;

  // Extract all {field_name} placeholders using regex
  const placeholderRegex = /\{([^}]+)\}/g;
  const matches = [...url.matchAll(placeholderRegex)];

  // If no placeholders found, return null (invalid template)
  if (matches.length === 0) {
    return null;
  }

  // Track if all required fields are present
  let hasAllFields = true;

  // Replace each placeholder with actual value from contactData
  for (const match of matches) {
    const fieldName = match[1].trim();
    const fieldValue = contactData[fieldName];

    // If field is missing or empty, return null (don't show button)
    if (!fieldValue || String(fieldValue).trim() === '') {
      hasAllFields = false;
      break;
    }

    // URL encode the value for safe URLs
    const encodedValue = encodeURIComponent(String(fieldValue).trim());

    // Replace the placeholder with encoded value
    url = url.replace(match[0], encodedValue);
  }

  // Return URL only if all required fields were found
  return hasAllFields ? url : null;
}

/**
 * Gets all enabled templates for a contact with built URLs.
 * Filters out disabled templates and templates with missing fields.
 *
 * @param templates - Array of link templates from ContactList.metadata
 * @param contactData - The contact's data object
 * @returns Array of objects containing template and built URL
 *
 * @example
 * const templates = [
 *   { id: '1', name: 'Google', url_template: 'https://google.com/{company}', enabled: true },
 *   { id: '2', name: 'LinkedIn', url_template: 'https://linkedin.com/{email}', enabled: false }
 * ];
 * const contactData = { company: 'Acme Corp', city: 'Milano' };
 * const links = getContactLinks(templates, contactData);
 * // Returns: [{ template: {...}, url: 'https://google.com/Acme%20Corp' }]
 * // Note: LinkedIn link not included (disabled), email link not included (missing field)
 */
export function getContactLinks(
  templates: CustomLinkTemplate[] | undefined,
  contactData: Record<string, any>
): Array<{ template: CustomLinkTemplate; url: string }> {
  // Handle empty/undefined templates gracefully
  if (!templates || templates.length === 0) {
    return [];
  }

  return templates
    // Only process enabled templates
    .filter(template => template.enabled)
    // Build URL for each template
    .map(template => ({
      template,
      url: buildCustomLinkUrl(template, contactData)
    }))
    // Filter out templates where URL building failed (missing fields)
    .filter(item => item.url !== null) as Array<{ template: CustomLinkTemplate; url: string }>;
}
