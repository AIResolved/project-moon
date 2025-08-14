'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CachedScriptFormData, 
  CachedScriptSections, 
  CachedFullScript,
  getStoredScriptFormDataFromLocalStorage,
  getStoredScriptSectionsFromLocalStorage,
  getStoredFullScriptsFromLocalStorage,
  deleteScriptFormDataFromLocalStorage,
  deleteScriptSectionsFromLocalStorage,
  deleteFullScriptFromLocalStorage
} from '@/utils/script-storage-utils'
import { Download, Trash2, Calendar, FileText, Settings } from 'lucide-react'

interface LoadCachedDataModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadFormData: (formData: CachedScriptFormData) => void
  onLoadSections: (sections: CachedScriptSections) => void
  onLoadFullScript: (script: CachedFullScript) => void
}

export function LoadCachedDataModal({
  isOpen,
  onClose,
  onLoadFormData,
  onLoadSections,
  onLoadFullScript
}: LoadCachedDataModalProps) {
  const [formData, setFormData] = useState<CachedScriptFormData[]>([])
  const [sections, setSections] = useState<CachedScriptSections[]>([])
  const [fullScripts, setFullScripts] = useState<CachedFullScript[]>([])

  // Load data when modal opens
  const refreshData = () => {
    if (typeof window !== 'undefined') {
      setFormData(getStoredScriptFormDataFromLocalStorage())
      setSections(getStoredScriptSectionsFromLocalStorage())
      setFullScripts(getStoredFullScriptsFromLocalStorage())
    }
  }

  // Refresh data when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshData()
    }
  }, [isOpen])

  const handleDeleteFormData = (id: string) => {
    deleteScriptFormDataFromLocalStorage(id)
    refreshData()
  }

  const handleDeleteSections = (id: string) => {
    deleteScriptSectionsFromLocalStorage(id)
    refreshData()
  }

  const handleDeleteFullScript = (id: string) => {
    deleteFullScriptFromLocalStorage(id)
    refreshData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Cached Script Data</DialogTitle>
          <DialogDescription>
            Load previously saved script forms, sections, or full scripts from your browser's cache.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="form-data" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="form-data" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Form Data ({formData.length})
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Script Sections ({sections.length})
            </TabsTrigger>
            <TabsTrigger value="full-scripts" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Full Scripts ({fullScripts.length})
            </TabsTrigger>
          </TabsList>

          {/* Form Data Tab */}
          <TabsContent value="form-data">
            <div className="space-y-4">
              {formData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cached form data found. Generate some scripts to see them here.
                </div>
              ) : (
                formData.map((data) => (
                  <Card key={data.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{data.title || 'Untitled'}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            Saved {formatDate(data.savedAt)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onLoadFormData(data)
                              onClose()
                            }}
                          >
                            Load Form
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFormData(data.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {data.theme && <Badge variant="secondary">{data.theme}</Badge>}
                        <Badge variant="outline">{data.scriptFormat}</Badge>
                        <Badge variant="outline">{data.povSelection}</Badge>
                        <Badge variant="outline">{data.targetSections} sections</Badge>
                      </div>
                      {(data.sectionPrompt || data.scriptPrompt || data.additionalPrompt) && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium">Custom Instructions:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {data.sectionPrompt && <li>Section generation instructions</li>}
                            {data.scriptPrompt && <li>Script writing instructions</li>}
                            {data.additionalPrompt && <li>General instructions</li>}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections">
            <div className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cached script sections found. Generate script sections to see them here.
                </div>
              ) : (
                sections.map((sectionData) => (
                  <Card key={sectionData.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{sectionData.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            Saved {formatDate(sectionData.savedAt)}
                            <Badge variant="outline" className="ml-2">
                              {sectionData.sections.length} sections
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onLoadSections(sectionData)
                              onClose()
                            }}
                          >
                            Load Sections
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSections(sectionData.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {sectionData.sections.slice(0, 3).map((section, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">Section {index + 1}:</span> {section.title}
                          </div>
                        ))}
                        {sectionData.sections.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            ... and {sectionData.sections.length - 3} more sections
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Full Scripts Tab */}
          <TabsContent value="full-scripts">
            <div className="space-y-4">
              {fullScripts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cached full scripts found. Generate full scripts to see them here.
                </div>
              ) : (
                fullScripts.map((script) => (
                  <Card key={script.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{script.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            Saved {formatDate(script.savedAt)}
                            <Badge variant="outline" className="ml-2">
                              {script.wordCount || 0} words
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onLoadFullScript(script)
                              onClose()
                            }}
                          >
                            Load Script
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteFullScript(script.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {script.theme && <Badge variant="secondary">{script.theme}</Badge>}
                        <Badge variant="outline">Generated {formatDate(script.generatedAt)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {script.scriptCleaned.substring(0, 200)}...
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
