import { ScriptSection, FullScriptData } from '@/lib/features/scripts/scriptsSlice'

export interface CachedScriptFormData {
  id: string
  title: string
  targetSections: number
  theme: string
  povSelection: string
  scriptFormat: string
  audience: string
  selectedModel: string
  sectionPrompt: string
  scriptPrompt: string
  additionalPrompt: string
  researchContext: string
  savedAt: string
}

export interface CachedScriptSections {
  id: string
  formDataId: string // Links to the form data that generated these sections
  title: string
  sections: ScriptSection[]
  savedAt: string
}

export interface CachedFullScript extends FullScriptData {
  id: string
  formDataId: string // Links to the form data that generated this script
  sectionsId?: string // Links to the sections that generated this script
  savedAt: string
}

/**
 * Save script form data to localStorage
 */
export function saveScriptFormDataToLocalStorage(formData: Omit<CachedScriptFormData, 'id' | 'savedAt'>) {
  try {
    const existingFormData = getStoredScriptFormDataFromLocalStorage()
    
    const cachedFormData: CachedScriptFormData = {
      ...formData,
      id: `form-${Date.now()}`,
      savedAt: new Date().toISOString()
    }
    
    const updatedFormData = [cachedFormData, ...existingFormData.filter(data => 
      data.title !== formData.title || data.theme !== formData.theme
    )]
    
    // Keep only last 20 form data entries
    const formDataToStore = updatedFormData.slice(0, 20)
    
    localStorage.setItem('cached-script-form-data', JSON.stringify(formDataToStore))
    console.log('💾 Script form data saved to localStorage:', cachedFormData.id)
    return cachedFormData.id
  } catch (error) {
    console.error('❌ Failed to save script form data to localStorage:', error)
    return null
  }
}

/**
 * Get cached script form data from localStorage
 */
export function getStoredScriptFormDataFromLocalStorage(): CachedScriptFormData[] {
  try {
    const stored = localStorage.getItem('cached-script-form-data')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load script form data from localStorage:', error)
    return []
  }
}

/**
 * Save script sections to localStorage
 */
export function saveScriptSectionsToLocalStorage(
  sections: ScriptSection[], 
  title: string, 
  formDataId?: string
) {
  try {
    const existingSections = getStoredScriptSectionsFromLocalStorage()
    
    const cachedSections: CachedScriptSections = {
      id: `sections-${Date.now()}`,
      formDataId: formDataId || `unknown-${Date.now()}`,
      title: title || 'Untitled Script',
      sections,
      savedAt: new Date().toISOString()
    }
    
    const updatedSections = [cachedSections, ...existingSections.filter(data => 
      data.title !== title
    )]
    
    // Keep only last 15 script sections
    const sectionsToStore = updatedSections.slice(0, 15)
    
    localStorage.setItem('cached-script-sections', JSON.stringify(sectionsToStore))
    console.log('💾 Script sections saved to localStorage:', cachedSections.id)
    return cachedSections.id
  } catch (error) {
    console.error('❌ Failed to save script sections to localStorage:', error)
    return null
  }
}

/**
 * Get cached script sections from localStorage
 */
export function getStoredScriptSectionsFromLocalStorage(): CachedScriptSections[] {
  try {
    const stored = localStorage.getItem('cached-script-sections')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load script sections from localStorage:', error)
    return []
  }
}

/**
 * Save full script to localStorage
 */
export function saveFullScriptToLocalStorage(
  fullScript: FullScriptData, 
  formDataId?: string, 
  sectionsId?: string
) {
  try {
    const existingScripts = getStoredFullScriptsFromLocalStorage()
    
    const cachedScript: CachedFullScript = {
      ...fullScript,
      id: `script-${Date.now()}`,
      formDataId: formDataId || `unknown-${Date.now()}`,
      sectionsId,
      savedAt: new Date().toISOString()
    }
    
    const updatedScripts = [cachedScript, ...existingScripts.filter(script => 
      script.title !== fullScript.title
    )]
    
    // Keep only last 10 full scripts
    const scriptsToStore = updatedScripts.slice(0, 10)
    
    localStorage.setItem('cached-full-scripts', JSON.stringify(scriptsToStore))
    console.log('💾 Full script saved to localStorage:', cachedScript.id)
    return cachedScript.id
  } catch (error) {
    console.error('❌ Failed to save full script to localStorage:', error)
    return null
  }
}

/**
 * Get cached full scripts from localStorage
 */
export function getStoredFullScriptsFromLocalStorage(): CachedFullScript[] {
  try {
    const stored = localStorage.getItem('cached-full-scripts')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('❌ Failed to load full scripts from localStorage:', error)
    return []
  }
}

/**
 * Delete cached script form data by ID
 */
export function deleteScriptFormDataFromLocalStorage(formDataId: string) {
  try {
    const existingFormData = getStoredScriptFormDataFromLocalStorage()
    const updatedFormData = existingFormData.filter(data => data.id !== formDataId)
    localStorage.setItem('cached-script-form-data', JSON.stringify(updatedFormData))
    console.log('🗑️ Script form data deleted from localStorage:', formDataId)
  } catch (error) {
    console.error('❌ Failed to delete script form data from localStorage:', error)
  }
}

/**
 * Delete cached script sections by ID
 */
export function deleteScriptSectionsFromLocalStorage(sectionsId: string) {
  try {
    const existingSections = getStoredScriptSectionsFromLocalStorage()
    const updatedSections = existingSections.filter(sections => sections.id !== sectionsId)
    localStorage.setItem('cached-script-sections', JSON.stringify(updatedSections))
    console.log('🗑️ Script sections deleted from localStorage:', sectionsId)
  } catch (error) {
    console.error('❌ Failed to delete script sections from localStorage:', error)
  }
}

/**
 * Delete cached full script by ID
 */
export function deleteFullScriptFromLocalStorage(scriptId: string) {
  try {
    const existingScripts = getStoredFullScriptsFromLocalStorage()
    const updatedScripts = existingScripts.filter(script => script.id !== scriptId)
    localStorage.setItem('cached-full-scripts', JSON.stringify(updatedScripts))
    console.log('🗑️ Full script deleted from localStorage:', scriptId)
  } catch (error) {
    console.error('❌ Failed to delete full script from localStorage:', error)
  }
}

/**
 * Clear all script-related localStorage data
 */
export function clearAllScriptDataFromLocalStorage() {
  try {
    localStorage.removeItem('cached-script-form-data')
    localStorage.removeItem('cached-script-sections')
    localStorage.removeItem('cached-full-scripts')
    console.log('🧹 All script data cleared from localStorage')
  } catch (error) {
    console.error('❌ Failed to clear script data from localStorage:', error)
  }
}

/**
 * Get script cache summary for display
 */
export function getScriptCacheSummary() {
  try {
    const formData = getStoredScriptFormDataFromLocalStorage()
    const sections = getStoredScriptSectionsFromLocalStorage()
    const fullScripts = getStoredFullScriptsFromLocalStorage()
    
    return {
      formDataCount: formData.length,
      sectionsCount: sections.length,
      fullScriptsCount: fullScripts.length,
      lastActivity: [
        ...formData.map(d => d.savedAt),
        ...sections.map(s => s.savedAt),
        ...fullScripts.map(s => s.savedAt)
      ].sort().reverse()[0] || null
    }
  } catch (error) {
    console.error('❌ Failed to get script cache summary:', error)
    return {
      formDataCount: 0,
      sectionsCount: 0,
      fullScriptsCount: 0,
      lastActivity: null
    }
  }
}
