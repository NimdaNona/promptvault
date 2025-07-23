import { Info } from 'lucide-react';

export const ClineImportHelp = {
  overview: (
    <div className="space-y-3 text-sm text-gray-600">
      <p>
        Import your AI-powered coding conversations from the Cline VSCode extension 
        (formerly Claude Dev) into PromptVault.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Two import methods available:</p>
            <ul className="mt-1 space-y-1 text-blue-800">
              <li>• <strong>Upload File</strong>: Drag & drop markdown files</li>
              <li>• <strong>Scan Storage</strong>: Auto-detect VSCode storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ),

  fileUpload: {
    title: "Upload Cline Markdown Files",
    description: "Drag and drop your Cline conversation files or click to browse",
    tips: [
      "Supports multiple .md files at once",
      "Files should contain Cline conversation history",
      "Maximum 10MB per file"
    ]
  },

  storagesScan: {
    title: "Scan VSCode Storage",
    description: "Automatically find and import Cline conversations from your VSCode extension storage",
    tips: [
      "Detects default Cline storage locations",
      "Preview files before importing",
      "Select specific conversations to import"
    ]
  },

  features: [
    {
      title: "AI Categorization",
      description: "Automatically organizes and tags your prompts",
      tier: "Pro"
    },
    {
      title: "Batch Processing",
      description: "Efficiently handles large imports",
      tier: "All"
    },
    {
      title: "Deduplication",
      description: "Removes duplicate prompts automatically",
      tier: "All"
    },
    {
      title: "Performance Monitoring",
      description: "Real-time import metrics and progress",
      tier: "All"
    }
  ],

  formats: {
    title: "Supported Formats",
    items: [
      {
        name: "Human/Assistant",
        example: "### Human\\nYour question\\n\\n### Assistant\\nAI response"
      },
      {
        name: "User/Cline",  
        example: "User: Your question\\n\\nCline: AI response"
      }
    ]
  },

  troubleshooting: [
    {
      issue: "No files found in storage",
      solutions: [
        "Ensure Cline extension is installed",
        "Check you have existing conversations",
        "Try manual file upload instead"
      ]
    },
    {
      issue: "Import fails",
      solutions: [
        "Verify files are valid markdown",
        "Check for Cline conversation markers",
        "Ensure files are under 10MB"
      ]
    },
    {
      issue: "Slow performance",
      solutions: [
        "Import files in smaller batches",
        "Check performance metrics",
        "Split very large files"
      ]
    }
  ]
};

export function getClineStorageLocation(platform: string): string {
  switch (platform) {
    case 'darwin':
      return '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev';
    case 'win32':
      return '%APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev';
    case 'linux':
      return '~/.config/Code/User/globalStorage/saoudrizwan.claude-dev';
    default:
      return 'VSCode global storage folder';
  }
}