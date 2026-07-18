import sys

with open('/tmp/old_page.tsx', 'r') as f:
    content = f.read()

# Add states
content = content.replace(
    "const [databaseId, setDatabaseId] = useState('');",
    "const [databaseId, setDatabaseId] = useState('');\n  const [geminiApiKey, setGeminiApiKey] = useState('');\n  const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');\n  const [activeTab, setActiveTab] = useState<'notion' | 'sheets' | 'gemini'>('notion');"
)

# Fix action imports
content = content.replace(
    "getNotionConfigAction,",
    "getNotionConfigAction, getRawNotionConfigAction,"
)

# Update useEffect
old_use_effect = """
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getNotionConfigAction();
        if (config.exists) {
          setApiKey(config.apiKey || '');
          setDatabaseId(config.databaseId || '');
          
          setAutoSync(config.autoSync || false);
          setSyncInterval(config.syncInterval || '15_mins');
        }
"""
new_use_effect = """
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getNotionConfigAction();
        const rawConfig = await getRawNotionConfigAction();
        if (config.exists) {
          setApiKey(config.apiKey || '');
          setDatabaseId(config.databaseId || '');
          
          setAutoSync(config.autoSync || false);
          setSyncInterval(config.syncInterval || '15_mins');
        }
        if (rawConfig) {
          setGeminiApiKey(rawConfig.geminiApiKey || '');
          setGoogleDriveFolderId(rawConfig.googleDriveFolderId || '');
        }
"""
content = content.replace(old_use_effect, new_use_effect)

# Update tabs section above "Credentials Settings"
# Find the start of the layout: <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
layout_start = '<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">'
tabs_ui = """
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button 
              onClick={() => setActiveTab('notion')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'notion' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Notion Integration
            </button>
            <button 
              onClick={() => setActiveTab('sheets')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'sheets' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Google Sheets Source
            </button>
            <button 
              onClick={() => setActiveTab('gemini')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'gemini' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Gemini AI
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
"""
content = content.replace(layout_start, tabs_ui)

# Update the main content column to conditionally render based on activeTab
col1_start = '{/* Left/Main Column (Col 1 & 2) */}\n          <div className="xl:col-span-2 space-y-6">'
col1_content = """{/* Left/Main Column (Col 1 & 2) */}
          <div className="xl:col-span-2 space-y-6">
            <div className={activeTab === 'notion' ? 'block' : 'hidden'}>"""

content = content.replace(col1_start, col1_content)

# Add closing div and other tabs after Scheduled Sync Settings block
sync_block_end = """
                </div>
              </div>
            </div>"""

new_tabs_content = """
                </div>
              </div>
            </div>
            </div>
            
            <div className={activeTab === 'sheets' ? 'block' : 'hidden'}>
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E8E0D8] dark:border-gray-800 p-8 shadow-sm">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Database className="w-6 h-6 text-indigo-600" />
                    Google Sheets Source
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">Configure the Google Drive folder ID containing your monthly research sheets.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Google Drive Folder ID</label>
                    <input type="text" value={googleDriveFolderId} onChange={e => setGoogleDriveFolderId(e.target.value)} className="w-full bg-[#FAF9F6] dark:bg-[#07090e] border border-[#E8E0D8] dark:border-gray-800 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3 font-mono focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" placeholder="Enter Folder ID" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={async () => { await saveNotionConfigAction(apiKey, databaseId, geminiApiKey, googleDriveFolderId); alert('Saved!'); }} className="px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md">Save Settings</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={activeTab === 'gemini' ? 'block' : 'hidden'}>
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-[#E8E0D8] dark:border-gray-800 p-8 shadow-sm">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Zap className="w-6 h-6 text-indigo-600" />
                    Gemini AI Integration
                  </h2>
                  <p className="text-sm text-gray-500 mt-2">Configure your Google Gemini API Key for automated brief generation.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Gemini API Key</label>
                    <input type="password" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} className="w-full bg-[#FAF9F6] dark:bg-[#07090e] border border-[#E8E0D8] dark:border-gray-800 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3 font-mono focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all" placeholder="Enter API Key" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={async () => { await saveNotionConfigAction(apiKey, databaseId, geminiApiKey, googleDriveFolderId); alert('Saved!'); }} className="px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md">Save Settings</button>
                  </div>
                </div>
              </div>
            </div>
"""

content = content.replace(sync_block_end, new_tabs_content, 1)

with open('src/app/notion-config/page.tsx', 'w') as f:
    f.write(content)
