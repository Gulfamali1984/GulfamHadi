import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Key,
  HelpCircle,
  Eye,
  EyeOff,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

interface SimpleSheetsSettingsProps {
  onRefreshAllData: () => Promise<void>;
}

export const SimpleSheetsSettings: React.FC<SimpleSheetsSettingsProps> = ({
  onRefreshAllData
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sheets?: string[] } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [showAppsScript, setShowAppsScript] = useState(false);
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.getHealth().then((h: any) => {
      setIsConnected(h.googleSheetsConnected);
    }).catch(console.error);

    api.getGoogleSheetsConfig().then((cfg: any) => {
      if (cfg) {
        setSpreadsheetId(cfg.spreadsheetId || '');
        setServiceAccountEmail(cfg.serviceAccountEmail || '');
      }
    }).catch(console.error);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testGoogleSheets({
        spreadsheetId: spreadsheetId.trim(),
        serviceAccountEmail: serviceAccountEmail.trim(),
        privateKey: privateKey.trim()
      });
      setTestResult(res);
      if (res.success) {
        setIsConnected(true);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetupSheets = async () => {
    setSyncStatus('Setting up Google Sheets tabs & columns...');
    try {
      const res = await api.setupGoogleSheetsSchema({
        spreadsheetId: spreadsheetId.trim(),
        serviceAccountEmail: serviceAccountEmail.trim(),
        privateKey: privateKey.trim()
      });
      setSyncStatus(res.message);
    } catch (e: any) {
      setSyncStatus(`Error: ${e.message}`);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing all records to Google Sheets...');
    try {
      const res = await api.syncToGoogleSheets({
        spreadsheetId: spreadsheetId.trim(),
        serviceAccountEmail: serviceAccountEmail.trim(),
        privateKey: privateKey.trim()
      });
      setSyncStatus(res.message);
      await onRefreshAllData();
    } catch (e: any) {
      setSyncStatus(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadAppsScript = async () => {
    setShowAppsScript(true);
    try {
      const data = await api.getAppsScriptCode();
      setAppsScriptCode(data.codeGs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-700" />
            Google Sheets Database Integration
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Connect Google Sheets via Google Cloud Service Account or Google Apps Script backend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
            <span>{isConnected ? 'Sheets Sync Connected' : 'Local Storage Active'}</span>
          </span>
        </div>
      </div>

      {/* Simple 3-step Instructions */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2.5">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          Setup Instructions for Service Account &amp; Google Sheets:
        </div>
        <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
          <li>Create or open your target Google Sheet. Copy the Spreadsheet ID from the browser URL.</li>
          <li>Share your Google Sheet with your Google Cloud Service Account email and grant it <strong>&quot;Editor&quot;</strong> permission.</li>
          <li>Enter the Spreadsheet ID and Service Account credentials below, then click <strong>&quot;Test Connection&quot;</strong>.</li>
          <li>Click <strong>&quot;Create Sheets Schema&quot;</strong> to automatically create the required tabs: <em>Incoming Stock, Outgoing Stock, Inventory, Warehouses, Shipments, Users, and Audit Log</em>.</li>
        </ol>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Spreadsheet ID:
          </label>
          <input
            type="text"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400"
          />
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">
            https://docs.google.com/spreadsheets/d/<strong>{'{SPREADSHEET_ID}'}</strong>/edit
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Cloud Service Account Email:
          </label>
          <input
            type="email"
            value={serviceAccountEmail}
            onChange={(e) => setServiceAccountEmail(e.target.value)}
            placeholder="real-deals-sheets@your-gcp-project.iam.gserviceaccount.com"
            className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Service Account Private Key (Server-Side Storage Only):
            </label>
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
            >
              {showPrivateKey ? 'Hide Key' : 'Show Key'}
            </button>
          </div>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
            rows={showPrivateKey ? 4 : 2}
            className={`w-full bg-slate-50 border border-slate-200 font-mono text-xs rounded-lg p-2.5 focus:bg-white focus:outline-none focus:border-slate-400 ${
              showPrivateKey ? 'text-slate-900' : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Stored only on the server in protected config. Never exposed to browser client responses.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !spreadsheetId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing connection...' : 'Test Connection'}</span>
          </button>

          <button
            onClick={handleSetupSheets}
            disabled={!spreadsheetId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span>Create Sheets Schema</span>
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing || !spreadsheetId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <CloudCheck className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Records to Google Sheets'}</span>
          </button>

          <button
            onClick={handleLoadAppsScript}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer ml-auto"
          >
            <Code className="w-3.5 h-3.5 text-slate-500" />
            <span>Google Apps Script Code</span>
          </button>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-4 rounded-lg text-xs flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold block">{testResult.message}</span>
              {testResult.sheets && (
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Found tabs: {testResult.sheets.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {syncStatus && (
          <div className="p-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs">
            {syncStatus}
          </div>
        )}
      </div>

      {/* Google Apps Script Modal / Collapsible */}
      {showAppsScript && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-700" />
                Google Apps Script Code (Code.gs)
              </h3>
              <p className="text-xs text-slate-500">
                Alternative lightweight backend: Paste this script into Extensions &gt; Apps Script in your Google Sheet.
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-72">
            {appsScriptCode || '// Loading Google Apps Script template...'}
          </pre>
        </div>
      )}
    </div>
  );
};
