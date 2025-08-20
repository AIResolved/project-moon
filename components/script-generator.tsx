"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "../lib/hooks";
import { 
  setScriptSections, 
  updateScriptSection, 
  setFullScript, 
  setIsGeneratingScript, 
  setScriptGenerationError,
  clearFullScript,
  loadScriptSections,
  loadFullScript,
  type ScriptSection,
  type CallToAction,
  type Hook
} from "../lib/features/scripts/scriptsSlice";
import { selectResearchSummaries, selectVideoSummarization } from "../lib/features/youtube/youtubeSlice";

// Import modular components
import { ScriptGeneratorForm } from "./script-generator/ScriptGeneratorForm";
import { AdvancedOptionsTab } from "./script-generator/AdvancedOptionsTab";
import { ScriptSectionsDisplay } from "./script-generator/ScriptSectionsDisplay";
import { FullScriptDisplay } from "./script-generator/FullScriptDisplay";
import { PromptHistoryModal } from "./script-generator/PromptHistoryModal";
import { CTAModal } from "./script-generator/CTAModal";
import { HookModal } from "./script-generator/HookModal";
import { ResearchPreviewModal } from "./script-generator/ResearchPreviewModal";
import { LoadCachedDataModal } from "./script-generator/LoadCachedDataModal";
import { Button } from "./ui/button";
import { PepeScriptGenerator } from "./script-variations/pepe/index";
import { InvestigationForm } from "./script-variations/investigation";
import { OptionsGenerator } from "./script-variations/investigation-1";
import { Philosophy2Form } from "./script-variations/philosophy-2";

// True-crime uses the same UI as original; only the full-script route differs
import { 
  saveScriptFormDataToLocalStorage,
  saveScriptSectionsToLocalStorage,
  saveFullScriptToLocalStorage,
  type CachedScriptFormData,
  type CachedScriptSections,
  type CachedFullScript
} from "@/utils/script-storage-utils";

// True-crime variation specific components (aliased)
import { ScriptGeneratorForm as TrueCrimeScriptGeneratorForm } from "./script-variations/true-crime/ScriptGeneratorForm";
import { ScriptSectionsDisplay as TrueCrimeScriptSectionsDisplay } from "./script-variations/true-crime/ScriptSectionsDisplay";
import { FullScriptDisplay as TrueCrimeFullScriptDisplay } from "./script-variations/true-crime/FullScriptDisplay";
import { PromptHistoryModal as TrueCrimePromptHistoryModal } from "./script-variations/true-crime/PromptHistoryModal";
import { CTAModal as TrueCrimeCTAModal } from "./script-variations/true-crime/CTAModal";
import { HookModal as TrueCrimeHookModal } from "./script-variations/true-crime/HookModal";
import { ResearchPreviewModal as TrueCrimeResearchPreviewModal } from "./script-variations/true-crime/ResearchPreviewModal";
import { LoadCachedDataModal as TrueCrimeLoadCachedDataModal } from "./script-variations/true-crime/LoadCachedDataModal";
import { ScriptUploadModal } from "./script-variations/ScriptUploadModal";

interface OpenAIModel {
  id: string;
  owned_by: string;
}

const ScriptGenerator: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Get state from Redux
  const { 
    scriptSections, 
    fullScript, 
    hasScriptSections, 
    hasFullScript, 
    isGeneratingScript, 
    scriptGenerationError 
  } = useAppSelector(state => state.scripts);

  // Get research data from Redux using proper selectors
  const researchSummaries = useAppSelector(selectResearchSummaries);
  const videoSummarization = useAppSelector(selectVideoSummarization);

  // Store form values in state
  const [title, setTitle] = useState("");
  // Use this as desired word count in UI; backend will convert words -> sections
  const [targetSections, setTargetSections] = useState(2400);
  const [theme, setTheme] = useState("");
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [sectionPrompt, setSectionPrompt] = useState("");
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [researchContext, setResearchContext] = useState("");
  const [inspirationalTranscript, setInspirationalTranscript] = useState("");
  const [forbiddenWords, setForbiddenWords] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scriptWordCount, setScriptWordCount] = useState(0);
  const [uploadedScript, setUploadedScript] = useState("");
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  
  // State for editing sections
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionData, setEditingSectionData] = useState<ScriptSection | null>(null);
  
  // State for editing segments
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState<string>("");
  
  // New state variables for the additional fields
  const [povSelection, setPovSelection] = useState<string>("3rd Person");
  const [scriptFormat, setScriptFormat] = useState<string>("Story");
  const [audience, setAudience] = useState<string>("");
  const [promptVariant, setPromptVariant] = useState<'original' | 'pepe' | 'investigation' | 'true-crime' | 'options' | 'philosophy-1' | 'philosophy-2'>('original');

  // State for prompt history sidebar
  const [isPromptHistoryOpen, setIsPromptHistoryOpen] = useState(false);
  
  // State for saved prompts
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // State for research preview modal
  const [isResearchPreviewOpen, setIsResearchPreviewOpen] = useState(false);

  // State for load cached data modal
  const [isLoadCachedDataOpen, setIsLoadCachedDataOpen] = useState(false);
  const [isScriptUploadOpen, setIsScriptUploadOpen] = useState(false);

  // Track IDs for localStorage persistence
  const [currentFormDataId, setCurrentFormDataId] = useState<string | null>(null);
  const [currentSectionsId, setCurrentSectionsId] = useState<string | null>(null);

  // State for CTA and Hook modals
  const [ctaModalOpen, setCtaModalOpen] = useState(false);
  const [hookModalOpen, setHookModalOpen] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number | null>(null);
  const [editingCta, setEditingCta] = useState<CallToAction | null>(null);
  const [editingHook, setEditingHook] = useState<Hook | null>(null);

  // CTA form state
  const [ctaText, setCtaText] = useState("");
  const [ctaPlacement, setCtaPlacement] = useState<'beginning' | 'middle' | 'end' | 'custom'>('end');
  const [ctaCustomPlacement, setCtaCustomPlacement] = useState("");
  const [ctaAdditionalInstructions, setCtaAdditionalInstructions] = useState("");

  // Hook form state
  const [hookText, setHookText] = useState("");
  const [hookStyle, setHookStyle] = useState<'question' | 'statement' | 'story' | 'statistic' | 'custom'>('question');
  const [hookAdditionalInstructions, setHookAdditionalInstructions] = useState("");
  
  // Function to format research for script from Redux state
  const formatResearchForScript = () => {
    const appliedYouTubeResearch = researchSummaries.youtubeResearchSummaries?.filter((r: any) => r.appliedToScript) || [];

    let contextString = "";

    // Add YouTube Research
    if (appliedYouTubeResearch.length > 0) {
      contextString += "=== YOUTUBE VIDEO ANALYSIS ===\n\n";
      appliedYouTubeResearch.forEach((research: any, index: number) => {
        const summary = research.videosSummary;
        contextString += `Analysis ${index + 1}: "${research.query}"\n`;
        contextString += `Overall Theme: ${summary.overallTheme}\n\n`;
        
        contextString += "Key Insights:\n";
        summary.keyInsights.forEach((insight: string, i: number) => {
          contextString += `${i + 1}. ${insight}\n`;
        });
        
        if (summary.characterInsights.length > 0) {
          contextString += "\nCharacter Insights:\n";
          summary.characterInsights.forEach((insight: string, i: number) => {
            contextString += `${i + 1}. ${insight}\n`;
          });
        }
        
        if (summary.conflictElements.length > 0) {
          contextString += "\nDramatic Conflicts:\n";
          summary.conflictElements.forEach((conflict: string, i: number) => {
            contextString += `${i + 1}. ${conflict}\n`;
          });
        }
        
        if (summary.storyIdeas.length > 0) {
          contextString += "\nStory Ideas:\n";
          summary.storyIdeas.forEach((idea: string, i: number) => {
            contextString += `${i + 1}. ${idea}\n`;
          });
        }
        
        contextString += `\nCreative Prompt: ${summary.creativePrompt}\n`;
        contextString += "\n---\n\n";
      });
    }

    return contextString.trim();
  };
  
  // Store form values in localStorage to persist between renders
  useEffect(() => {
    // Load saved values from localStorage on initial component mount
    const savedTitle = localStorage.getItem('scriptGenerator.title');
    const savedWordCount = localStorage.getItem('scriptGenerator.wordCount');
    const savedTheme = localStorage.getItem('scriptGenerator.theme');
    const savedAdditionalPrompt = localStorage.getItem('scriptGenerator.additionalPrompt');
    const savedForbiddenWords = localStorage.getItem('scriptGenerator.forbiddenWords');
    const savedPovSelection = localStorage.getItem('scriptGenerator.povSelection');
    const savedScriptFormat = localStorage.getItem('scriptGenerator.scriptFormat');
    const savedAudience = localStorage.getItem('scriptGenerator.audience');
    
    if (savedTitle) setTitle(savedTitle);
    if (savedWordCount) setTargetSections(parseInt(savedWordCount));
    if (savedTheme) setTheme(savedTheme);
    if (savedAdditionalPrompt) setAdditionalPrompt(savedAdditionalPrompt);
    if (savedForbiddenWords) setForbiddenWords(savedForbiddenWords);
    if (savedPovSelection) setPovSelection(savedPovSelection);
    if (savedScriptFormat) setScriptFormat(savedScriptFormat);
    if (savedAudience) setAudience(savedAudience);
  }, []);

  // Fetch models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) {
          throw new Error("Failed to fetch models");
        }
        const data = await response.json();
        setModels(data);
    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
    }
    };
    fetchModels();
  }, []);

  // Update research context automatically from Redux state
  useEffect(() => {
    const autoResearchContext = formatResearchForScript();
    setResearchContext(autoResearchContext);
  }, [researchSummaries, videoSummarization]);
  
  // Save form values to localStorage when they change
  useEffect(() => {
    localStorage.setItem('scriptGenerator.title', title);
    localStorage.setItem('scriptGenerator.targetSections', targetSections.toString());
    localStorage.setItem('scriptGenerator.theme', theme);
    localStorage.setItem('scriptGenerator.additionalPrompt', additionalPrompt);
    localStorage.setItem('scriptGenerator.forbiddenWords', forbiddenWords);
    localStorage.setItem('scriptGenerator.povSelection', povSelection);
    localStorage.setItem('scriptGenerator.scriptFormat', scriptFormat);
    localStorage.setItem('scriptGenerator.audience', audience);
  }, [title, targetSections, theme, additionalPrompt, forbiddenWords, povSelection, scriptFormat, audience]);

  // Calculate word count when full script changes
  const updateScriptWordCount = (script: string) => {
    if (!script) {
      setScriptWordCount(0);
      return;
    }
    const cleanText = script.replace(/[#*_~`]/g, '');
    const words = cleanText.trim().split(/\s+/);
    setScriptWordCount(words.length);
  };

  // Update word count when full script changes from Redux
  useEffect(() => {
    if (fullScript?.scriptWithMarkdown) {
      updateScriptWordCount(fullScript.scriptWithMarkdown);
    } else {
      setScriptWordCount(0);
    }
  }, [fullScript?.scriptWithMarkdown]);

  const handleGenerateOutline = async () => {
    try {
      setIsLoading(true);
      dispatch(clearFullScript());
      
      // Route based on selected prompt variant
      // Route outline generation based on selected variant
      let endpoint = "/api/generate-script";
      if (promptVariant === 'pepe' || promptVariant === 'options' || promptVariant === 'philosophy-1' || promptVariant === 'philosophy-2') {
        endpoint = "/api/script-outline-variations/pepe";
      } else if (promptVariant === 'true-crime') {
        endpoint = "/api/script-outline-variations/true-crime";
      } else if (promptVariant === 'investigation') {
        endpoint = "/api/script-outline-variations/investigation";
      }

      const body = promptVariant === 'pepe'
        ? {
            title,
            wordCount: Math.max(800, targetSections * 800),
            themeId: '',
            additionalPrompt: additionalPrompt,
            emotionalTone: '',
            targetAudience: audience,
            forbiddenWords,
            selectedModel,
            uploadedStyle: '',
            ctas: [],
            inspirationalTranscript,
            researchData: researchContext ? { analysis: { context: researchContext }, searchResults: [] } : null,
            generateQuote: false
          }
        : {
            title, 
            // Map desired word count to number of sections (~750 words per section)
            targetSections: Math.max(1, Math.ceil((targetSections || 1500) / 750)), 
            theme, 
            additionalPrompt,
            sectionPrompt, 
            researchContext,
            inspirationalTranscript, 
            forbiddenWords,
            modelName: selectedModel,
            povSelection,
            scriptFormat,
            audience
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate script outline");
      }
      
      const data = await response.json();
      
      // Store sections in Redux
      if (data.sections) {
        dispatch(setScriptSections(data.sections));
        
        // Save form data to localStorage
        const formDataId = saveScriptFormDataToLocalStorage({
          title,
          targetSections,
          theme,
          povSelection,
          scriptFormat,
          audience,
          selectedModel,
          sectionPrompt,
          scriptPrompt,
          additionalPrompt,
          researchContext
        });
        setCurrentFormDataId(formDataId);
        
        // Save sections to localStorage
        const sectionsId = saveScriptSectionsToLocalStorage(data.sections, title, formDataId || undefined);
        setCurrentSectionsId(sectionsId);
      }
      
    } catch (error) {
      console.error("Error generating script outline:", error);
      dispatch(setScriptGenerationError((error as Error).message));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate full script using the sections directly
  const generateFullScriptDirectly = async (sections: ScriptSection[]) => {
    try {
      dispatch(setIsGeneratingScript(true));
      
      const fullScriptEndpoint =
        promptVariant === 'true-crime' ? "/api/full-script-variations/true-crime" :
        (promptVariant === 'pepe' || promptVariant === 'options' || promptVariant === 'philosophy-1' || promptVariant === 'philosophy-2') ? "/api/full-script-variations/pepe" :
        (promptVariant === 'investigation') ? "/api/full-script-variations/investigation" :
        "/api/generate-full-script";

      const response = await fetch(fullScriptEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title, 
          ...(promptVariant === 'true-crime' || promptVariant === 'pepe'
            ? {
                sections: sections.map(section => ({
                  ...section,
                })),
                selectedModel: selectedModel,
                audience,
                povSelection,
                forbiddenWords,
                additionalPrompt,
                researchContext
              }
            : {
                theme, 
                sections: sections.map(section => ({
                  ...section,
                  writingInstructions: generateEnhancedWritingInstructions(section)
                })),
                additionalPrompt,
                scriptPrompt,
                researchContext,
                forbiddenWords,
                modelName: selectedModel,
                povSelection,
                scriptFormat,
                audience
              })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate full script");
      }
      
      const data = await response.json();
      
      // Process the script - clean it up for the audio component
      if (data.scriptWithMarkdown) {
        const scriptWithMarkdown = data.scriptWithMarkdown;
        let scriptCleaned = data.scriptCleaned || data.scriptWithMarkdown;
        
        // Enhanced cleaning process
        const originalLength = scriptCleaned.length;
        
        // Clean script
        scriptCleaned = scriptCleaned.replace(new RegExp(`^(?:${title}|\\s*${title}\\s*)$`, 'im'), '');
        scriptCleaned = scriptCleaned.replace(/^([A-Z][a-z]*\s*){1,7}$/m, '');
        scriptCleaned = scriptCleaned.replace(/^(Title:|Script:|Written by:).*$/gim, '');
        scriptCleaned = scriptCleaned.replace(/^#{1,6}\s+.*$/gm, '');
        scriptCleaned = scriptCleaned.replace(/^(?:Chapter|Section|Part)\s+\d+[\s:.-]*.*$/gim, '');
        scriptCleaned = scriptCleaned.replace(/^[A-Z][A-Z\s\d:,.!?-]{4,}$/gm, '');
        scriptCleaned = scriptCleaned.replace(new RegExp(`^\\s*${title}\\s*$`, 'gim'), '');
        scriptCleaned = scriptCleaned.replace(/^(Hi!|Hello!|Greetings!|Welcome!)\s*/i, '');
        scriptCleaned = scriptCleaned.replace(/^A Chance Encounter\\nHi!\\n/i, '');
        scriptCleaned = scriptCleaned.replace(/^[A-Z][a-zA-Z\s]+\\n(Hi!|Hello!)/i, '');
        scriptCleaned = scriptCleaned.replace(/^\s*\n+/, '');
        scriptCleaned = scriptCleaned.replace(/\n{2,}/g, '\n\n');
        scriptCleaned = scriptCleaned.trim();
        
        console.log("Script cleaned for audio. Original length:", originalLength, 
                    "Cleaned length:", scriptCleaned.length,
                    "First 100 chars:", scriptCleaned.substring(0, 100));
        
        // Store in Redux
        const fullScriptData = {
          scriptWithMarkdown: scriptWithMarkdown,
          scriptCleaned: scriptCleaned,
          title: title,
          theme: theme,
          wordCount: data.wordCount || scriptWordCount,
          generatedAt: new Date().toISOString()
        };
        
        dispatch(setFullScript(fullScriptData));
        
        // Save full script to localStorage
        saveFullScriptToLocalStorage(fullScriptData, currentFormDataId || undefined, currentSectionsId || undefined);
      }
    } catch (error) {
      console.error("Error generating full script:", error);
      dispatch(setScriptGenerationError((error as Error).message));
    } finally {
      dispatch(setIsGeneratingScript(false));
    }
  };

  const handleGenerateFullScript = async () => {
    if (scriptSections.length === 0) return;
    await generateFullScriptDirectly(scriptSections);
  };

  const handleUpdateSection = (index: number, updatedSection: ScriptSection) => {
    dispatch(updateScriptSection({ index, section: updatedSection }));
  };

  // Functions for editing sections
  const startEditingSection = (index: number) => {
    setEditingSectionIndex(index);
    setEditingSectionData({ ...scriptSections[index] });
  };

  const saveEditingSection = () => {
    if (editingSectionIndex !== null && editingSectionData) {
      dispatch(updateScriptSection({ 
        index: editingSectionIndex, 
        section: editingSectionData 
      }));
      setEditingSectionIndex(null);
      setEditingSectionData(null);
    }
  };

  const cancelEditingSection = () => {
    setEditingSectionIndex(null);
    setEditingSectionData(null);
  };

  const updateEditingSectionField = (field: keyof ScriptSection, value: string) => {
    if (editingSectionData) {
      setEditingSectionData({
        ...editingSectionData,
        [field]: value
      });
    }
  };

  const handleDownloadDocx = async () => {
    if (!fullScript?.scriptWithMarkdown) return;
    
    try {
      const response = await fetch("/api/download-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          title, 
          content: fullScript.scriptWithMarkdown
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate DOCX");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading DOCX:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedScript(event.target.result as string);
        dispatch(setFullScript({
          scriptWithMarkdown: event.target.result as string,
          scriptCleaned: event.target.result as string,
          title: title || "Uploaded Script",
          theme: theme,
          wordCount: 0
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleRegenerateSegment = async (sectionIndex?: number) => {
    const index = sectionIndex !== undefined ? sectionIndex : selectedSegmentIndex;
    
    if (index === null || !scriptSections[index]) return;
    
    try {
      const currentSection = scriptSections[index];
      
      console.log(`🔄 Starting regeneration for section ${index + 1}: "${currentSection.title}"`);
      
      const promptText = window.prompt(
        `Enter instructions for regenerating section "${currentSection.title}":`,
        `Improve section ${index + 1} to make it more detailed and engaging.`
      );
      
      if (promptText === null) {
        console.log(`⏱️ Regeneration cancelled by user for section ${index + 1}`);
        return;
      }
      
      const regenerationPrompt = promptText.trim();
      console.log(`📝 User provided prompt for section ${index + 1}: "${regenerationPrompt}"`);
      
      const response = await fetch("/api/regenerate-segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionIndex: index,
          currentSection,
          additionalPrompt: regenerationPrompt,
          researchContext,
          forbiddenWords,
          title: title || currentSection.title,
          theme: theme || '',
          modelName: selectedModel,
          enhancedInstructions: generateEnhancedWritingInstructions(currentSection)
        }),
      });

        if (!response.ok) {
        throw new Error(`Failed to regenerate segment. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Regeneration successful for section ${index + 1}. New title: "${data.updatedSection.title}"`);
      
      dispatch(updateScriptSection({ index, section: data.updatedSection }));
      
      setRegeneratePrompt("");
      setSelectedSegmentIndex(null);
      } catch (error) {
      console.error(`❌ Error regenerating segment ${index !== null ? index + 1 : 'unknown'}:`, error);
    }
  };

  // Function to split text into 500-word segments for display
  const splitIntoSegments = (text: string, wordsPerSegment = 500): string[] => {
    if (!text) return [];
    
    const words = text.split(/\s+/);
    const segments: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      segments.push(words.slice(i, i + wordsPerSegment).join(' '));
    }
    
    return segments;
  };
  
  const scriptSegments = splitIntoSegments(fullScript?.scriptWithMarkdown || '');

  // Functions for editing segments
  const startEditingSegment = (index: number) => {
    setEditingSegmentIndex(index);
    setEditingSegmentText(scriptSegments[index]);
  };

  const saveEditingSegment = () => {
    if (editingSegmentIndex !== null && fullScript) {
      const updatedSegments = [...scriptSegments];
      updatedSegments[editingSegmentIndex] = editingSegmentText;
      
      const updatedScript = updatedSegments.join('\n\n');
      
      const scriptCleaned = updatedScript
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .trim();
      
      dispatch(setFullScript({
        scriptWithMarkdown: updatedScript,
        scriptCleaned: scriptCleaned,
        title: fullScript.title,
        theme: fullScript.theme,
        wordCount: scriptCleaned.split(/\s+/).filter(Boolean).length
      }));
      
      setEditingSegmentIndex(null);
      setEditingSegmentText("");
    }
  };

  const cancelEditingSegment = () => {
    setEditingSegmentIndex(null);
    setEditingSegmentText("");
  };

  const handleRegenerateScriptSegment = async (segmentIndex: number, segmentContent: string, prompt?: string) => {
    try {
      console.log(`🔄 Starting regeneration for script segment ${segmentIndex + 1}`);
      
      if (!title || !theme) {
        console.error(`❌ Cannot regenerate script segment - missing title or theme`);
        alert("Please enter a title and theme before regenerating script segments.");
        return;
      }

      console.log(`📄 Using title: "${title}" and theme: "${theme}"`);
      dispatch(setIsGeneratingScript(true));
      
      const regenerationPrompt = prompt || regeneratePrompt;
      console.log(`📝 Using prompt for script segment ${segmentIndex + 1}: "${regenerationPrompt}"`);
      
      const response = await fetch("/api/regenerate-script-segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          segmentIndex, 
          segmentContent,
          title,
          theme,
          additionalPrompt: regenerationPrompt,
          researchContext,
          forbiddenWords,
          modelName: selectedModel
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to regenerate script segment. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Successfully regenerated script segment ${segmentIndex + 1}. Word count: ${data.wordCount || 'unknown'}`);
      
      if (fullScript && data.regeneratedContent) {
        const segments = splitIntoSegments(fullScript.scriptWithMarkdown);
        segments[segmentIndex] = data.regeneratedContent;
        const updatedScript = segments.join(' ');
        
        dispatch(setFullScript({
          scriptWithMarkdown: updatedScript,
          scriptCleaned: updatedScript,
          title: fullScript.title,
          theme: fullScript.theme,
          wordCount: updatedScript.split(/\s+/).length
        }));
        
        console.log(`📊 Updated full script after segment regeneration. Total length: ${updatedScript.split(/\s+/).length} words`);
      }
      
      setRegeneratePrompt("");
      setSelectedSegmentIndex(null);
    } catch (error) {
      console.error(`❌ Error regenerating script segment ${segmentIndex + 1}:`, error);
      dispatch(setScriptGenerationError((error as Error).message));
    } finally {
      dispatch(setIsGeneratingScript(false));
    }
  };

  const handleDirectRegeneration = async (segmentIndex: number, segmentContent: string) => {
    console.log(`🔄 Initiating direct regeneration for segment ${segmentIndex + 1}`);
    
    const prompt = window.prompt("Enter instructions for rewriting this segment:", `Rewrite segment ${segmentIndex + 1} to make it more engaging and impactful.`);
    
    if (prompt === null) {
      console.log(`⏱️ Direct regeneration cancelled by user for segment ${segmentIndex + 1}`);
      return;
    }
    
    console.log(`📝 User provided prompt for direct regeneration of segment ${segmentIndex + 1}: "${prompt}"`);
    
    await handleRegenerateScriptSegment(segmentIndex, segmentContent, prompt);
  };

  // Function to fetch saved prompts
  const fetchSavedPrompts = async () => {
    console.log('🔄 Starting fetchSavedPrompts...');
    setLoadingPrompts(true);
    
    try {
      console.log('🔄 Fetching saved prompts from /api/prompts...');
      const response = await fetch('/api/prompts');
      console.log('📥 Response status:', response.status, response.statusText);

      if (response.ok) {
        const prompts = await response.json();
        console.log('✅ Prompts fetched successfully:', prompts);
        setSavedPrompts(prompts);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch saved prompts. Status:', response.status);
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Network error fetching saved prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Function to apply a saved prompt to the form
  const applyPromptToForm = (prompt: any) => {
    if (prompt.title) setTitle(prompt.title);
    if (prompt.theme) setTheme(prompt.theme);
    if (prompt.audience) setAudience(prompt.audience);
    if (prompt.additional_context) setAdditionalPrompt(prompt.additional_context);
    if (prompt.POV) setPovSelection(prompt.POV);
    if (prompt.format) setScriptFormat(prompt.format);
    
    setIsPromptHistoryOpen(false);
  };

  // CTA and Hook Handler Functions
  const openCtaModal = (sectionIndex: number, existingCta?: CallToAction) => {
    setCurrentSectionIndex(sectionIndex);
    setEditingCta(existingCta || null);
    
    if (existingCta) {
      setCtaText(existingCta.text);
      setCtaPlacement(existingCta.placement);
      setCtaCustomPlacement(existingCta.customPlacement || "");
      setCtaAdditionalInstructions(existingCta.additionalInstructions || "");
    } else {
      setCtaText("");
      setCtaPlacement('end');
      setCtaCustomPlacement("");
      setCtaAdditionalInstructions("");
    }
    
    setCtaModalOpen(true);
  };

  const openHookModal = (sectionIndex: number, existingHook?: Hook) => {
    setCurrentSectionIndex(sectionIndex);
    setEditingHook(existingHook || null);
    
    if (existingHook) {
      setHookText(existingHook.text);
      setHookStyle(existingHook.style);
      setHookAdditionalInstructions(existingHook.additionalInstructions || "");
    } else {
      setHookText("");
      setHookStyle('question');
      setHookAdditionalInstructions("");
    }
    
    setHookModalOpen(true);
  };

  const saveCta = () => {
    if (currentSectionIndex === null || !ctaText.trim()) return;
    
    const newCta: CallToAction = {
      id: editingCta?.id || `cta-${Date.now()}`,
      text: ctaText.trim(),
      placement: ctaPlacement,
      customPlacement: ctaPlacement === 'custom' ? ctaCustomPlacement : undefined,
      additionalInstructions: ctaAdditionalInstructions.trim() || undefined
    };

    const currentSection = scriptSections[currentSectionIndex];
    const updatedCtas = editingCta 
      ? (currentSection.ctas || []).map(cta => cta.id === editingCta.id ? newCta : cta)
      : [...(currentSection.ctas || []), newCta];

    const updatedSection: ScriptSection = {
      ...currentSection,
      ctas: updatedCtas
    };

    dispatch(updateScriptSection({ index: currentSectionIndex, section: updatedSection }));
    
    setCtaModalOpen(false);
    setCurrentSectionIndex(null);
    setEditingCta(null);
  };

  const saveHook = () => {
    if (currentSectionIndex === null || !hookText.trim()) return;
    
    const newHook: Hook = {
      id: editingHook?.id || `hook-${Date.now()}`,
      text: hookText.trim(),
      style: hookStyle,
      additionalInstructions: hookAdditionalInstructions.trim() || undefined
    };

    const currentSection = scriptSections[currentSectionIndex];
    const updatedSection: ScriptSection = {
      ...currentSection,
      hook: newHook
    };

    dispatch(updateScriptSection({ index: currentSectionIndex, section: updatedSection }));
    
    setHookModalOpen(false);
    setCurrentSectionIndex(null);
    setEditingHook(null);
  };

  const removeCta = (sectionIndex: number, ctaId: string) => {
    const currentSection = scriptSections[sectionIndex];
    const updatedCtas = (currentSection.ctas || []).filter(cta => cta.id !== ctaId);
    
    const updatedSection: ScriptSection = {
      ...currentSection,
      ctas: updatedCtas
    };

    dispatch(updateScriptSection({ index: sectionIndex, section: updatedSection }));
  };

  const removeHook = (sectionIndex: number) => {
    const currentSection = scriptSections[sectionIndex];
    const updatedSection: ScriptSection = {
      ...currentSection,
      hook: undefined
    };

    dispatch(updateScriptSection({ index: sectionIndex, section: updatedSection }));
  };

  // Function to generate writing instructions with CTAs and hooks
  const generateEnhancedWritingInstructions = (section: ScriptSection) => {
    let instructions = section.writingInstructions;

    if (section.hook) {
      const hookPlacement = section.hook.style === 'custom' ? 'customized hook' : `${section.hook.style} hook`;
      instructions += `\n\nHOOK INSTRUCTIONS: Start this section with a compelling ${hookPlacement}: "${section.hook.text}"`;
      if (section.hook.additionalInstructions) {
        instructions += ` ${section.hook.additionalInstructions}`;
      }
    }

    if (section.ctas && section.ctas.length > 0) {
      instructions += `\n\nCALL-TO-ACTION INSTRUCTIONS:`;
      section.ctas.forEach((cta, index) => {
        const placement = cta.placement === 'custom' && cta.customPlacement 
          ? cta.customPlacement 
          : `at the ${cta.placement}`;
        
        instructions += `\n${index + 1}. Include this call-to-action ${placement} of the section: "${cta.text}"`;
        if (cta.additionalInstructions) {
          instructions += ` ${cta.additionalInstructions}`;
        }
      });
    }

    return instructions;
  };

  // Fetch prompts when modal opens
  const handleOpenPromptHistory = () => {
    console.log('🔄 Opening prompt history modal...');
    setIsPromptHistoryOpen(true);
    fetchSavedPrompts();
  };

  // Handle research preview
  const handlePreviewResearch = () => {
    // If there's no manual research context, format the applied research automatically
    if (!researchContext) {
      const autoFormattedContext = formatResearchForScript();
      setResearchContext(autoFormattedContext);
    }
    setIsResearchPreviewOpen(true);
  };

  const handleScriptUpload = (script: string) => {
    dispatch(setFullScript({
      scriptWithMarkdown: script,
      scriptCleaned: script,
      title: title || "Uploaded Script",
      theme: theme,
      wordCount: script.split(/\s+/).filter(Boolean).length
    }));
    setIsScriptUploadOpen(false);
  };

  // Handlers for loading cached data
  const handleOpenLoadCachedData = () => {
    setIsLoadCachedDataOpen(true);
  };

  const handleLoadFormData = (formData: CachedScriptFormData) => {
    setTitle(formData.title);
    setTargetSections(formData.targetSections);
    setTheme(formData.theme);
    setPovSelection(formData.povSelection);
    setScriptFormat(formData.scriptFormat);
    setAudience(formData.audience);
    setSelectedModel(formData.selectedModel);
    setSectionPrompt(formData.sectionPrompt);
    setScriptPrompt(formData.scriptPrompt);
    setAdditionalPrompt(formData.additionalPrompt);
    setResearchContext(formData.researchContext);
    setCurrentFormDataId(formData.id);
    console.log('📋 Loaded form data:', formData.title);
  };

  const handleLoadSections = (sectionsData: CachedScriptSections) => {
    dispatch(loadScriptSections(sectionsData.sections));
    setCurrentSectionsId(sectionsData.id);
    // Also update the title if it was saved with the sections
    if (sectionsData.title && sectionsData.title !== 'Untitled Script') {
      setTitle(sectionsData.title);
    }
    console.log('📂 Loaded script sections:', sectionsData.title);
  };

  const handleLoadFullScript = (scriptData: CachedFullScript) => {
    const fullScriptData = {
      scriptWithMarkdown: scriptData.scriptWithMarkdown,
      scriptCleaned: scriptData.scriptCleaned,
      title: scriptData.title,
      theme: scriptData.theme || '',
      wordCount: scriptData.wordCount || 0,
      generatedAt: scriptData.generatedAt
    };
    
    dispatch(loadFullScript(fullScriptData));
    
    // Also update form fields if available
    setTitle(scriptData.title);
    if (scriptData.theme) {
      setTheme(scriptData.theme);
    }
    
    console.log('📄 Loaded full script:', scriptData.title);
  };

  // Get applied research count for preview
  const getAppliedResearchCount = () => {
    return researchSummaries.youtubeResearchSummaries?.filter((r: any) => r.appliedToScript)?.length || 0;
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="form">
        {promptVariant === 'original' && (
          <TabsList className="mb-4">
            <TabsTrigger value="form">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
          </TabsList>
        )}
        
        <TabsContent value="form">
          {/* Variant selector + global research preview */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Generator:</span>
              <select
                className="border rounded px-2 py-1 text-sm bg-background"
                value={promptVariant}
                onChange={(e) => setPromptVariant(e.target.value as any)}
              >
                <option value="original">NEW Script</option>
                <option value="pepe">AI Story Niche</option>
                <option value="investigation">Investigation Niche</option>
                <option value="true-crime">True Crime Niche</option>
                <option value="philosophy-1">Philosophy Story Niche</option>
                <option value="philosophy-2">Philosophy Niche 2</option>
              </select>
            </div>
            {getAppliedResearchCount() > 0 && (
              <Button variant="outline" onClick={handlePreviewResearch}>
                Research Preview ({getAppliedResearchCount()})
              </Button>
            )}
          </div>


          {promptVariant === 'pepe' ? (
            <PepeScriptGenerator />
          ) : promptVariant === 'investigation' ? (
            <InvestigationForm />
          ) : promptVariant === 'true-crime' ? (
            <TrueCrimeScriptGeneratorForm
              title={title}
              targetSections={targetSections}
              theme={theme}
              povSelection={povSelection}
              scriptFormat={scriptFormat}
              audience={audience}
              selectedModel={selectedModel}
              sectionPrompt={sectionPrompt}
              scriptPrompt={scriptPrompt}
              additionalPrompt={additionalPrompt}
              researchContext={researchContext}
              onTitleChange={setTitle}
              onTargetSectionsChange={setTargetSections}
              onThemeChange={setTheme}
              onPovSelectionChange={setPovSelection}
              onScriptFormatChange={setScriptFormat}
              onAudienceChange={setAudience}
              onModelChange={setSelectedModel}
              onSectionPromptChange={setSectionPrompt}
              onScriptPromptChange={setScriptPrompt}
              onAdditionalPromptChange={setAdditionalPrompt}
              onResearchContextChange={setResearchContext}
              onClearResearch={() => setResearchContext("")}
              onPreviewResearch={handlePreviewResearch}
              onGenerateOutline={handleGenerateOutline}
              onGenerateFullScript={handleGenerateFullScript}
              onDownloadDocx={handleDownloadDocx}
              onOpenPromptHistory={handleOpenPromptHistory}
              onOpenLoadCachedData={handleOpenLoadCachedData}
              onOpenScriptUpload={() => setIsScriptUploadOpen(true)}
              models={models}
              isLoading={isLoading}
              isGeneratingScript={isGeneratingScript}
              hasScriptSections={hasScriptSections}
              hasFullScript={hasFullScript}
              scriptGenerationError={scriptGenerationError}
            />
          ) : (promptVariant === 'options' || promptVariant === 'philosophy-1') ? (
            <OptionsGenerator />
          ) : (promptVariant === 'philosophy-2') ? (
            <Philosophy2Form />
          ) : (
            <ScriptGeneratorForm
            title={title}
            targetSections={targetSections}
            theme={theme}
            povSelection={povSelection}
            scriptFormat={scriptFormat}
            audience={audience}
            selectedModel={selectedModel}
            sectionPrompt={sectionPrompt}
            scriptPrompt={scriptPrompt}
            additionalPrompt={additionalPrompt}
            researchContext={researchContext}
            onTitleChange={setTitle}
            onTargetSectionsChange={setTargetSections}
            onThemeChange={setTheme}
            onPovSelectionChange={setPovSelection}
            onScriptFormatChange={setScriptFormat}
            onAudienceChange={setAudience}
            onModelChange={setSelectedModel}
            onSectionPromptChange={setSectionPrompt}
            onScriptPromptChange={setScriptPrompt}
            onAdditionalPromptChange={setAdditionalPrompt}
            onResearchContextChange={setResearchContext}
            onClearResearch={() => setResearchContext("")}
            onPreviewResearch={handlePreviewResearch}
            onGenerateOutline={handleGenerateOutline}
            onGenerateFullScript={handleGenerateFullScript}
            onDownloadDocx={handleDownloadDocx}
            onOpenPromptHistory={handleOpenPromptHistory}
            onOpenLoadCachedData={handleOpenLoadCachedData}
            onOpenScriptUpload={() => setIsScriptUploadOpen(true)}
            models={models}
            isLoading={isLoading}
            isGeneratingScript={isGeneratingScript}
            hasScriptSections={hasScriptSections}
            hasFullScript={hasFullScript}
            scriptGenerationError={scriptGenerationError}
            />
          )}
        </TabsContent>

        {promptVariant === 'original' && (
          <TabsContent value="advanced">
            <AdvancedOptionsTab
              inspirationalTranscript={inspirationalTranscript}
              forbiddenWords={forbiddenWords}
              onInspirationalTranscriptChange={setInspirationalTranscript}
              onForbiddenWordsChange={setForbiddenWords}
              onFileUpload={handleFileUpload}
            />
          </TabsContent>
        )}
      </Tabs>

      {promptVariant === 'true-crime' ? (
        <TrueCrimeScriptSectionsDisplay
          scriptSections={scriptSections}
          hasScriptSections={hasScriptSections}
          editingSectionIndex={editingSectionIndex}
          editingSectionData={editingSectionData}
          onStartEditingSection={startEditingSection}
          onSaveEditingSection={saveEditingSection}
          onCancelEditingSection={cancelEditingSection}
          onUpdateEditingSectionField={updateEditingSectionField}
          onRegenerateSegment={handleRegenerateSegment}
          onOpenCtaModal={openCtaModal}
          onOpenHookModal={openHookModal}
          onRemoveCta={removeCta}
          onRemoveHook={removeHook}
        />
      ) : (
        <ScriptSectionsDisplay
          scriptSections={scriptSections}
          hasScriptSections={hasScriptSections}
          editingSectionIndex={editingSectionIndex}
          editingSectionData={editingSectionData}
          onStartEditingSection={startEditingSection}
          onSaveEditingSection={saveEditingSection}
          onCancelEditingSection={cancelEditingSection}
          onUpdateEditingSectionField={updateEditingSectionField}
          onRegenerateSegment={handleRegenerateSegment}
          onOpenCtaModal={openCtaModal}
          onOpenHookModal={openHookModal}
          onRemoveCta={removeCta}
          onRemoveHook={removeHook}
        />
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimeFullScriptDisplay
          fullScript={fullScript}
          scriptWordCount={scriptWordCount}
          isGeneratingScript={isGeneratingScript}
          isLoading={isLoading}
          scriptSegments={scriptSegments}
          editingSegmentIndex={editingSegmentIndex}
          editingSegmentText={editingSegmentText}
          onStartEditingSegment={startEditingSegment}
          onSaveEditingSegment={saveEditingSegment}
          onCancelEditingSegment={cancelEditingSegment}
          onEditingSegmentTextChange={setEditingSegmentText}
          onDirectRegeneration={handleDirectRegeneration}
        />
      ) : (
        <FullScriptDisplay
          fullScript={fullScript}
          scriptWordCount={scriptWordCount}
          isGeneratingScript={isGeneratingScript}
          isLoading={isLoading}
          scriptSegments={scriptSegments}
          editingSegmentIndex={editingSegmentIndex}
          editingSegmentText={editingSegmentText}
          onStartEditingSegment={startEditingSegment}
          onSaveEditingSegment={saveEditingSegment}
          onCancelEditingSegment={cancelEditingSegment}
          onEditingSegmentTextChange={setEditingSegmentText}
          onDirectRegeneration={handleDirectRegeneration}
        />
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimePromptHistoryModal
          isOpen={isPromptHistoryOpen}
          onClose={() => setIsPromptHistoryOpen(false)}
          savedPrompts={savedPrompts}
          loadingPrompts={loadingPrompts}
          onApplyPrompt={applyPromptToForm}
        />
      ) : (
        <PromptHistoryModal
          isOpen={isPromptHistoryOpen}
          onClose={() => setIsPromptHistoryOpen(false)}
          savedPrompts={savedPrompts}
          loadingPrompts={loadingPrompts}
          onApplyPrompt={applyPromptToForm}
        />
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimeCTAModal
          isOpen={ctaModalOpen}
          onClose={() => setCtaModalOpen(false)}
          editingCta={editingCta}
          ctaText={ctaText}
          ctaPlacement={ctaPlacement}
          ctaCustomPlacement={ctaCustomPlacement}
          ctaAdditionalInstructions={ctaAdditionalInstructions}
          onCtaTextChange={setCtaText}
          onCtaPlacementChange={setCtaPlacement}
          onCtaCustomPlacementChange={setCtaCustomPlacement}
          onCtaAdditionalInstructionsChange={setCtaAdditionalInstructions}
          onSave={saveCta}
        />
      ) : (
        <CTAModal
          isOpen={ctaModalOpen}
          onClose={() => setCtaModalOpen(false)}
          editingCta={editingCta}
          ctaText={ctaText}
          ctaPlacement={ctaPlacement}
          ctaCustomPlacement={ctaCustomPlacement}
          ctaAdditionalInstructions={ctaAdditionalInstructions}
          onCtaTextChange={setCtaText}
          onCtaPlacementChange={setCtaPlacement}
          onCtaCustomPlacementChange={setCtaCustomPlacement}
          onCtaAdditionalInstructionsChange={setCtaAdditionalInstructions}
          onSave={saveCta}
        />
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimeHookModal
          isOpen={hookModalOpen}
          onClose={() => setHookModalOpen(false)}
          editingHook={editingHook}
          hookText={hookText}
          hookStyle={hookStyle}
          hookAdditionalInstructions={hookAdditionalInstructions}
          onHookTextChange={setHookText}
          onHookStyleChange={setHookStyle}
          onHookAdditionalInstructionsChange={setHookAdditionalInstructions}
          onSave={saveHook}
        />
      ) : (
        <HookModal
          isOpen={hookModalOpen}
          onClose={() => setHookModalOpen(false)}
          editingHook={editingHook}
          hookText={hookText}
          hookStyle={hookStyle}
          hookAdditionalInstructions={hookAdditionalInstructions}
          onHookTextChange={setHookText}
          onHookStyleChange={setHookStyle}
          onHookAdditionalInstructionsChange={setHookAdditionalInstructions}
          onSave={saveHook}
        />
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimeResearchPreviewModal
          isOpen={isResearchPreviewOpen}
          onClose={() => setIsResearchPreviewOpen(false)}
          researchContext={researchContext || formatResearchForScript()}
          appliedResearchCount={getAppliedResearchCount()}
        />
      ) : (
        <>
          <ResearchPreviewModal
            isOpen={isResearchPreviewOpen}
            onClose={() => setIsResearchPreviewOpen(false)}
            researchContext={researchContext || formatResearchForScript()}
            appliedResearchCount={getAppliedResearchCount()}
          />

          <ScriptUploadModal
            isOpen={isScriptUploadOpen}
            onClose={() => setIsScriptUploadOpen(false)}
            onScriptUpload={handleScriptUpload}
          />
        </>
      )}

      {promptVariant === 'true-crime' ? (
        <TrueCrimeLoadCachedDataModal
          isOpen={isLoadCachedDataOpen}
          onClose={() => setIsLoadCachedDataOpen(false)}
          onLoadFormData={handleLoadFormData}
          onLoadSections={handleLoadSections}
          onLoadFullScript={handleLoadFullScript}
        />
      ) : (
        <LoadCachedDataModal
          isOpen={isLoadCachedDataOpen}
          onClose={() => setIsLoadCachedDataOpen(false)}
          onLoadFormData={handleLoadFormData}
          onLoadSections={handleLoadSections}
          onLoadFullScript={handleLoadFullScript}
        />
      )}
    </div>
  );
};

export default ScriptGenerator; 