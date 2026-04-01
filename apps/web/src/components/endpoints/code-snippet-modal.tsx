"use client";

import React, { useState } from "react";
import { X, Copy, Check, Terminal, Code2 } from "lucide-react";
import { config } from "@/lib/config";

export function CodeSnippetModal({ endpoint, onClose }: any) {
  const [copied, setCopied] = useState("");
  // Use config.dataPlaneUrl instead of hardcoded localhost
  const gatewayUrl = `${config.dataPlaneUrl}/proxy${endpoint.path}`;
  const method = endpoint.method === "ALL" ? "POST" : endpoint.method;

  const snippets = {
    js: `// Javascript / Node.js
fetch("${gatewayUrl}", {
  method: "${method}",
  headers: {
    "Authorization": "Bearer <API_KEY>",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({\n    "messages": [{"role": "user", "content": "Hello!"}]\n  })
})
.then(res => res.json())
.then(console.log);`,
    python: `# Python (requests)
import requests

url = "${gatewayUrl}"
headers = {
    "Authorization": "Bearer <API_KEY>",
    "Content-Type": "application/json"
}
data = {
    "messages": [{"role": "user", "content": "Hello!"}]
}

response = requests.${method.toLowerCase()}(url, headers=headers, json=data)
print(response.json())`,
    curl: `# Bash / cURL
curl -X ${method} ${gatewayUrl} \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'`
  };

  const [activeTab, setActiveTab] = useState<"js" | "python" | "curl">("js");

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(activeTab);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-text-main/20 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-card shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-text-main">
                Integrate into your App
              </h3>
              <p className="text-sm font-body text-text-muted">Copy these ready-to-use snippets to call your API.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50">
          <div className="flex gap-2 mb-4">
            {(["js", "python", "curl"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-body text-sm rounded-lg transition-colors font-medium ${
                  activeTab === tab ? "bg-primary text-white shadow-soft" : "text-text-muted bg-transparent hover:bg-slate-200/50"
                }`}
              >
                {tab === "js" ? "JavaScript" : tab === "python" ? "Python" : "cURL"}
              </button>
            ))}
          </div>

          <div className="relative group">
            <pre className="w-full h-[250px] overflow-auto p-4 bg-[#0d1117] text-[#c9d1d9] rounded-xl font-mono text-sm shadow-inner selection:bg-primary/30">
              <code>{snippets[activeTab]}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 bg-text-main/50 hover:bg-primary text-white backdrop-blur rounded-lg shadow-soft transition-all opacity-0 group-hover:opacity-100"
            >
              {copied === activeTab ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
