import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Code,
  Copy,
  Check,
  ExternalLink
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
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

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
        setLastSyncTime(cfg.lastSyncTime || null);
        if (cfg.spreadsheetId && cfg.serviceAccountEmail && cfg.hasPrivateKey) {
          setIsConnected(true);
        }
      }
    }).catch(console.error);
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing all records to Google Sheets...');
    try {
      const res = await api.syncToGoogleSheets();
      setSyncStatus(res.message);
      setLastSyncTime(new Date().toLocaleTimeString());
      await onRefreshAllData();
    } catch (e: any) {
      setSyncStatus(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadAppsScript = () => {
    setShowAppsScript(!showAppsScript);
    setAppsScriptCode(`/**
 * Real Deals Automation & Control LLC - Google Sheets Database
 * Database structure with 10 production tabs
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Real Deals ERP')
    .addItem('Check Database Status', 'checkStatus')
    .addToUi();
}

function checkStatus() {
  SpreadsheetApp.getUi().alert('Real Deals ERP Database is active.');
}`);
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
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-700" />
            Google Sheets Database Integration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud database synchronized in real-time via Google Cloud Service Account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
            <span>{isConnected ? 'Database Connected' : 'Connecting to Google Sheets...'}</span>
          </span>
        </div>
      </div>

      {/* Database Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Spreadsheet ID:
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 break-all select-all">
              {spreadsheetId || 'Configured via Secrets'}
            </div>
            {spreadsheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium mt-1 inline-flex items-center gap-1"
              >
                <span>Open Google Sheet &quot;RD ERP&quot;</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Account Email:
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 break-all select-all">
              {serviceAccountEmail || 'Configured via Secrets'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Granted Editor access to spreadsheet. Private key stored securely on backend.
            </span>
          </div>
        </div>

        {/* Database Tabs Overview */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Configured Database Sheets (10 Active Tabs):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              'Consolidated Inventory',
              'Incoming Stock',
              'Outgoing Stock',
              'Shipment Tracker',
              'Warehouse Inventory',
              'Warehouses',
              'Items Master',
              'Suppliers & Customers',
              'Users',
              'Audit Log'
            ].map(tab => (
              <div key={tab} className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-800 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate" title={tab}>{tab}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <CloudCheck className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Database to Google Sheets'}</span>
          </button>

          {lastSyncTime && (
            <span className="text-xs text-slate-500 font-medium">
              Last synced: {lastSyncTime}
            </span>
          )}

          <button
            onClick={handleLoadAppsScript}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer ml-auto"
          >
            <Code className="w-3.5 h-3.5 text-slate-500" />
            <span>Google Apps Script</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
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
                Google Apps Script Helper
              </h3>
              <p className="text-xs text-slate-500">
                Optional custom macro code for your Google Sheet.
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
            {appsScriptCode}
          </pre>
        </div>
      )}
    </div>
  );
};
