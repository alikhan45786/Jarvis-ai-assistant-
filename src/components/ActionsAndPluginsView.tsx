import React, { useState } from "react";
import { Play, Plus, Puzzle, Search, Terminal } from "lucide-react";
import {
  ActionModuleCatalogItem,
  JarvisPlugin,
  MARK_LV_ACTION_MODULES,
} from "../types/jarvis";

interface ActionsAndPluginsViewProps {
  plugins: JarvisPlugin[];
  onExecutePrompt: (prompt: string, useWebSearch?: boolean) => Promise<void>;
  onTogglePlugin: (id: string) => Promise<void>;
  onCreatePlugin: (plugin: {
    name: string;
    title: string;
    description: string;
    triggerWords: string[];
    code: string;
  }) => Promise<void>;
}

export const ActionsAndPluginsView: React.FC<ActionsAndPluginsViewProps> = ({
  plugins,
  onExecutePrompt,
  onTogglePlugin,
  onCreatePlugin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNewPluginForm, setShowNewPluginForm] = useState<boolean>(false);
  const [newPluginName, setNewPluginName] = useState<string>("");
  const [newPluginDesc, setNewPluginDesc] = useState<string>("");
  const [newPluginTriggers, setNewPluginTriggers] = useState<string>("");
  const [newPluginCode, setNewPluginCode] = useState<string>(
    `# Jarvis Plugin\ndef execute(params: dict, context: dict) -> dict:\n    return {"status": "nominal", "output": "Custom Jarvis plugin executed"}`
  );

  const categories = ["All", "Intelligence", "Developer & Files", "System & OS", "Media & Comms"];

  const filteredModules = MARK_LV_ACTION_MODULES.filter((mod) => {
    const matchesCat = selectedCategory === "All" || mod.category === selectedCategory;
    const matchesSearch =
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPluginName.trim()) return;
    await onCreatePlugin({
      name: newPluginName.toLowerCase().replace(/\s+/g, "_"),
      title: newPluginName.trim(),
      description: newPluginDesc.trim() || "Custom Jarvis Extension Module",
      triggerWords: newPluginTriggers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      code: newPluginCode,
    });
    setNewPluginName("");
    setNewPluginDesc("");
    setNewPluginTriggers("");
    setShowNewPluginForm(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Section: 21 Mark-LV Action Modules (core/action_loader.py) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Jarvis Action Modules ({MARK_LV_ACTION_MODULES.length})
            </h2>
            <p className="text-xs text-slate-400">
              Execute any Jarvis action in English or Roman Urdu / Urdu with one click
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter actions..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Interactive Category Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? "bg-sky-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredModules.map((mod: ActionModuleCatalogItem) => (
            <div
              key={mod.id}
              className="flex flex-col justify-between p-4 bg-slate-950/80 border border-slate-800/90 hover:border-sky-500/40 rounded-lg transition-colors gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{mod.name}</h3>
                  <span className="text-[11px] font-mono text-sky-400">{mod.file}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{mod.description}</p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-900">
                <div className="text-[11px] text-slate-400">
                  <span>{mod.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-slate-300 italic">&ldquo;{mod.SampleRomanUrduPrompt}&rdquo;</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onExecutePrompt(mod.samplePrompt, mod.id === "web_search")}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded transition-colors whitespace-nowrap"
                  >
                    <Play className="w-3 h-3" />
                    Run (English)
                  </button>
                  <button
                    type="button"
                    onClick={() => onExecutePrompt(mod.SampleRomanUrduPrompt, mod.id === "web_search")}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/30 hover:bg-sky-900/50 rounded transition-colors whitespace-nowrap"
                  >
                    <Terminal className="w-3 h-3" />
                    Run (Roman Urdu)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Mark-LV Plugin Loader & SDK (core/plugin_loader.py & plugins/_template.py) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              02. Dynamic Plugin Loader & Template Studio
            </h2>
            <p className="text-xs text-slate-400">
              core/plugin_loader.py · plugins/_template.py · Hot-reloadable custom Python/JS extensions
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPluginForm(!showNewPluginForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {showNewPluginForm ? "Cancel" : "Create Plugin from _template.py"}
          </button>
        </div>

        {showNewPluginForm && (
          <form
            onSubmit={handleAddPlugin}
            className="p-4 bg-slate-950 border border-sky-500/30 rounded-lg grid grid-cols-1 md:grid-cols-12 gap-4"
          >
            <div className="md:col-span-5 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plugin Name</label>
                <input
                  type="text"
                  required
                  value={newPluginName}
                  onChange={(e) => setNewPluginName(e.target.value)}
                  placeholder="e.g. Docker Container Monitor"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newPluginDesc}
                  onChange={(e) => setNewPluginDesc(e.target.value)}
                  placeholder="Checks running Docker containers and resource metrics"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Trigger Words (comma-separated)
                </label>
                <input
                  type="text"
                  value={newPluginTriggers}
                  onChange={(e) => setNewPluginTriggers(e.target.value)}
                  placeholder="docker status, container health"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
              >
                Register & Hot-Load Plugin
              </button>
            </div>
            <div className="md:col-span-7 flex flex-col">
              <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">
                Plugin Implementation (plugins/_template.py)
              </label>
              <textarea
                rows={7}
                value={newPluginCode}
                onChange={(e) => setNewPluginCode(e.target.value)}
                className="w-full flex-1 p-3 text-xs font-mono bg-slate-900 border border-slate-800 rounded text-sky-200"
              />
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plugins.map((plug) => (
            <div
              key={plug.id}
              className="p-4 bg-slate-950/90 border border-slate-800 rounded-lg flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-white">{plug.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">v{plug.version}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{plug.description}</p>
                <div className="text-[11px] font-mono text-slate-500">
                  Triggers: {plug.triggerWords.join(" · ")}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() =>
                    onExecutePrompt(
                      `Run the Mark-LV plugin "${plug.title}" (${plug.triggerWords[0] || plug.name}) and report the output.`
                    )
                  }
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Invoke Plugin
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePlugin(plug.id)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    plug.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {plug.enabled ? "Active" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
