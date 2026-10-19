import React, { useState } from 'react';
import {
  Building2,
  Users,
  Plus,
  Search,
  Download,
  Edit2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileSpreadsheet,
  ClipboardPaste,
  FileText,
  Sparkles
} from 'lucide-react';
import { Customer, Supplier, User } from '../types/erp';
import { api } from '../services/api';

interface SimpleContactsProps {
  customers: Customer[];
  suppliers: Supplier[];
  currentUser: User;
  onRefreshData?: () => Promise<void>;
}

export const SimpleContacts: React.FC<SimpleContactsProps> = ({
  customers,
  suppliers,
  currentUser,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  const isCustomers = activeTab === 'customers';

  // Inline Form State
  const [showForm, setShowForm] = useState(true);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Saudi Arabia');
  const [city, setCity] = useState('Riyadh');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [currency, setCurrency] = useState('USD');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk List Upload Modal State (Allows uploading entire Customer or Supplier lists)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'paste' | 'file'>('paste');
  const [bulkText, setBulkText] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [parsedBulkItems, setParsedBulkItems] = useState<any[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkErrorMessage, setBulkErrorMessage] = useState<string | null>(null);

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editTerms, setEditTerms] = useState('Net 30 Days');
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({
        type: 'error',
        text: `Please enter the ${isCustomers ? 'Customer / Company' : 'Supplier'} Name.`
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (isCustomers) {
        await api.createCustomer({
          companyName: name.trim(),
          contactPerson: contactPerson.trim() || 'Procurement In-Charge',
          email: email.trim() || 'purchasing@client.com',
          phone: phone.trim(),
          country: country.trim(),
          city: city.trim(),
          shippingAddress: shippingAddress.trim() || 'Client Central Receiving Dock',
          paymentTerms,
          currency
        }, currentUser);

        setStatusMessage({
          type: 'success',
          text: `Customer "${name}" has been registered in the database!`
        });
      } else {
        await api.createSupplier({
          name: name.trim(),
          contactPerson: contactPerson.trim() || 'Sales Representative',
          email: email.trim() || 'orders@supplier.com',
          phone: phone.trim(),
          country: country.trim(),
          city: city.trim(),
          paymentTerms,
          currency
        }, currentUser);

        setStatusMessage({
          type: 'success',
          text: `Supplier "${name}" has been registered in the database!`
        });
      }

      // Reset form
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setShippingAddress('');

      if (onRefreshData) {
        await onRefreshData();
      }
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save entry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.companyName);
    setEditContact(c.contactPerson);
    setEditEmail(c.email);
    setEditPhone(c.phone || '');
    setEditCountry(c.country);
    setEditAddress(c.shippingAddress || '');
    setEditTerms(c.paymentTerms || 'Net 30 Days');
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setEditName(s.name);
    setEditContact(s.contactPerson);
    setEditEmail(s.email);
    setEditPhone(s.phone || '');
    setEditCountry(s.country);
    setEditTerms(s.paymentTerms || 'Net 30 Days');
  };

  const handleSaveCustomerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setIsUpdating(true);
    try {
      await api.updateCustomer(editingCustomer.id, {
        companyName: editName.trim(),
        contactPerson: editContact.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        country: editCountry.trim(),
        shippingAddress: editAddress.trim(),
        paymentTerms: editTerms
      }, currentUser);

      setStatusMessage({ type: 'success', text: `Updated customer "${editName}".` });
      setEditingCustomer(null);
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update customer' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSupplierEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setIsUpdating(true);
    try {
      await api.updateSupplier(editingSupplier.id, {
        name: editName.trim(),
        contactPerson: editContact.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        country: editCountry.trim(),
        paymentTerms: editTerms
      }, currentUser);

      setStatusMessage({ type: 'success', text: `Updated supplier "${editName}".` });
      setEditingSupplier(null);
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update supplier' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    if (isCustomers) {
      const headers = ['ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Country', 'Shipping Address', 'Payment Terms'];
      const rows = filteredCustomers.map(c => [
        `"${c.id}"`,
        `"${c.companyName}"`,
        `"${c.contactPerson}"`,
        `"${c.email}"`,
        `"${c.phone || ''}"`,
        `"${c.country}"`,
        `"${(c.shippingAddress || '').replace(/"/g, '""')}"`,
        `"${c.paymentTerms || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RealDeals_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['ID', 'Supplier Name', 'Contact Person', 'Email', 'Phone', 'Country', 'Payment Terms'];
      const rows = filteredSuppliers.map(s => [
        `"${s.id}"`,
        `"${s.name}"`,
        `"${s.contactPerson}"`,
        `"${s.email}"`,
        `"${s.phone || ''}"`,
        `"${s.country}"`,
        `"${s.paymentTerms || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RealDeals_Suppliers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download Sample Template CSV for Customers or Suppliers
  const handleDownloadSampleTemplate = () => {
    if (isCustomers) {
      const headers = ['Company / Customer Name', 'Contact Person', 'Email', 'Phone', 'Country', 'City', 'Delivery Address', 'Payment Terms'];
      const sample = [
        ['Saudi Aramco Refining Co.', 'Eng. Khalid Al-Otaibi', 'khalid.otaibi@aramco.com', '+966 13 874 0000', 'Saudi Arabia', 'Dhahran', 'Dhahran Central Receiving Dock, Building 145', 'Net 30 Days'],
        ['ADNOC Offshore Operations', 'Ahmed Al-Mansoor', 'procurement@adnoc.ae', '+971 2 602 0000', 'United Arab Emirates', 'Abu Dhabi', 'Mussafah Supply Base Dock 4', 'Net 60 Days'],
        ['SABIC Petrochemicals', 'Fahad Al-Harbi', 'orders@sabic.com', '+966 11 225 8000', 'Saudi Arabia', 'Jubail', 'Jubail Industrial City Gate 2', 'Net 30 Days'],
        ['Kuwait Petroleum Corp (KPC)', 'Mishal Al-Sabah', 'tenders@kpc.com.kw', '+965 2496 1000', 'Kuwait', 'Kuwait City', 'Shuwaikh Port Warehouse 12', 'Net 45 Days']
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sample.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'RealDeals_Customer_List_Template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Supplier / Vendor Name', 'Contact Person', 'Email', 'Phone', 'Country', 'Payment Terms', 'Currency'];
      const sample = [
        ['Siemens AG Industrial Automation', 'Hans Schmidt', 'orders@siemens.com', '+49 89 636 00', 'Germany', 'Net 30 Days', 'EUR'],
        ['ABB Power & Robotics Inc', 'Marco Rossi', 'spares@abb.com', '+41 43 317 7111', 'Switzerland', 'Net 30 Days', 'USD'],
        ['Schneider Electric Global', 'Claire Dubois', 'procurement@se.com', '+33 1 41 29 70 00', 'France', 'Net 30 Days', 'EUR'],
        ['Rockwell Automation (Allen-Bradley)', 'James Wilson', 'direct@ra.rockwell.com', '+1 414 382 2000', 'USA', 'Net 30 Days', 'USD']
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sample.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'RealDeals_Supplier_List_Template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Parse CSV or TSV text
  const parseDelimitedContacts = (text: string) => {
    setBulkErrorMessage(null);
    if (!text || !text.trim()) {
      setParsedBulkItems([]);
      return;
    }
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedBulkItems([]);
      return;
    }

    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');

    const parseLine = (line: string): string[] => {
      if (isTab) return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const result: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null && match[0] !== '') {
        let val = match[1] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        result.push(val.trim());
      }
      return result.length > 0 ? result : line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    };

    const firstTokens = parseLine(firstLine).map(t => t.toLowerCase());
    const isHeader = firstTokens.some(t =>
      t.includes('name') || t.includes('company') || t.includes('contact') || t.includes('supplier') || t.includes('customer')
    );
    const dataLines = isHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line, idx) => {
      const parts = parseLine(line);
      if (isCustomers) {
        const companyName = parts[0] || '';
        const contactPerson = parts[1] || 'Procurement Contact';
        const email = parts[2] || 'procurement@client.com';
        const phone = parts[3] || '';
        const country = parts[4] || 'Saudi Arabia';
        const city = parts[5] || 'Riyadh';
        const shippingAddress = parts[6] || 'Client Central Receiving Dock';
        const paymentTerms = parts[7] || 'Net 30 Days';

        return {
          id: `item-${idx}`,
          companyName,
          contactPerson,
          email,
          phone,
          country,
          city,
          shippingAddress,
          paymentTerms,
          currency: 'USD',
          isValid: Boolean(companyName.trim())
        };
      } else {
        const sName = parts[0] || '';
        const contactPerson = parts[1] || 'Sales Representative';
        const email = parts[2] || 'orders@supplier.com';
        const phone = parts[3] || '';
        const country = parts[4] || 'USA';
        const paymentTerms = parts[5] || 'Net 30 Days';
        const currency = parts[6] || 'USD';

        return {
          id: `item-${idx}`,
          name: sName,
          contactPerson,
          email,
          phone,
          country,
          paymentTerms,
          currency,
          isValid: Boolean(sName.trim())
        };
      }
    }).filter(r => isCustomers ? Boolean(r.companyName) : Boolean(r.name));

    setParsedBulkItems(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkText(content);
      parseDelimitedContacts(content);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    const validItems = parsedBulkItems.filter(i => i.isValid);
    if (validItems.length === 0) {
      setBulkErrorMessage(`Please provide at least one valid ${isCustomers ? 'customer' : 'supplier'} entry with a company/vendor name.`);
      return;
    }

    setIsBulkSubmitting(true);
    setBulkErrorMessage(null);

    try {
      if (isCustomers) {
        const res = await api.bulkCreateCustomers(validItems, currentUser);
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${res.createdCount} customers into your database and Google Sheets!`
        });
      } else {
        const res = await api.bulkCreateSuppliers(validItems, currentUser);
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${res.createdCount} suppliers into your database and Google Sheets!`
        });
      }

      setShowBulkModal(false);
      setParsedBulkItems([]);
      setBulkText('');
      setBulkFileName('');
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setBulkErrorMessage(err.message || `Failed to bulk import ${isCustomers ? 'customers' : 'suppliers'}.`);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              {isCustomers ? 'Customer Directory & Clients' : 'Supplier Directory & Vendors'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
              {isCustomers ? `${customers.length} Customers` : `${suppliers.length} Suppliers`}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {isCustomers
              ? 'Register commercial clients, delivery destinations, and purchase order references.'
              : 'Register authorized distributors, manufacturers, and procurement contacts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* BULK UPLOAD BUTTON REQUESTED BY USER */}
          <button
            type="button"
            onClick={() => {
              setBulkText('');
              setBulkFileName('');
              setParsedBulkItems([]);
              setBulkErrorMessage(null);
              setShowBulkModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title={`Upload multiple ${isCustomers ? 'customers' : 'suppliers'} at once from CSV or Excel`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-300" />
            <span>+ Upload {isCustomers ? 'Customer' : 'Supplier'} List (Bulk)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? `Hide ${isCustomers ? 'Customer' : 'Supplier'} Form` : `+ Add New ${isCustomers ? 'Customer' : 'Supplier'}`}</span>
            {showForm ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Customers vs Suppliers */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveTab('customers');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Customers &amp; Clients ({customers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('suppliers');
            setSearchTerm('');
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Suppliers &amp; Vendors ({suppliers.length})</span>
        </button>
      </div>

      {/* INLINE FORM (Matches User Demand for Easy Data Entry) */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                Register New {isCustomers ? 'Customer / Commercial Client' : 'Supplier / Equipment Vendor'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Saved directly to ERP and Google Sheets Contacts
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {isCustomers ? 'Customer / Company Name *:' : 'Supplier / Vendor Name *:'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isCustomers ? 'e.g. Saudi Aramco Refining Co.' : 'e.g. Siemens AG Distribution'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Contact Person:
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Eng. Khalid Al-Otaibi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. procurement@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Phone / WhatsApp:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +966 13 874 0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Country:
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Saudi Arabia, UAE, USA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Terms:
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Net 90 Days">Net 90 Days</option>
                  <option value="100% Advance Payment">100% Advance Payment</option>
                  <option value="Cash Against Documents (CAD)">Cash Against Documents (CAD)</option>
                  <option value="Letter of Credit (L/C)">Letter of Credit (L/C)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Currency:
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {isCustomers && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Delivery / Receiving Dock Address:
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="e.g. Dhahran Central Receiving Dock, Building 145"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setContactPerson('');
                  setEmail('');
                  setPhone('');
                  setShippingAddress('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {isSubmitting ? 'Registering...' : `Save & Register ${isCustomers ? 'Customer' : 'Supplier'}`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${isCustomers ? 'customer name, contact, email...' : 'supplier name, contact, brand...'}`}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>
      </div>

      {/* Table: Customers */}
      {isCustomers && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer / Company</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Email &amp; Phone</th>
                  <th className="py-3 px-4">Country &amp; Address</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">No customers found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to add a customer.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.companyName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.id}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {c.contactPerson}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{c.country}</span>
                        </div>
                        {c.shippingAddress && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {c.shippingAddress}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">{c.paymentTerms}</span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">({c.currency})</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomer(c)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table: Suppliers */}
      {!isCustomers && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Email &amp; Phone</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">No suppliers found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to add a vendor.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{s.id}</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {s.contactPerson}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                        {s.phone && (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{s.country}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">{s.paymentTerms}</span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">({s.currency})</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSupplier(s)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full my-8 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Edit Customer: {editingCustomer.companyName}</h3>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerEdit} className="p-6 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company Name:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address:</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone:</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country:</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Shipping Address:</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Customer Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full my-8 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Edit Supplier: {editingSupplier.name}</h3>
              </div>
              <button
                onClick={() => setEditingSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierEdit} className="p-6 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier Name:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Person:</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address:</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone:</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country:</label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Supplier Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD CONTACTS MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Bulk Upload {isCustomers ? 'Customer Directory' : 'Supplier Directory'} List
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste from Google Sheets / Excel or upload CSV to batch import into ERP and Google Sheets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Instructions & Template Download */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Expected Columns for {isCustomers ? 'Customers' : 'Suppliers'}:</span>
                  </p>
                  <p className="text-emerald-800 mt-1 font-mono text-[11px]">
                    {isCustomers
                      ? 'Company Name, Contact Person, Email, Phone, Country, City, Shipping Address, Payment Terms'
                      : 'Supplier Name, Contact Person, Email, Phone, Country, Payment Terms, Currency'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-semibold rounded-lg text-xs shrink-0 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample .CSV</span>
                </button>
              </div>

              {/* Input Mode Selector */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setBulkMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    bulkMode === 'paste'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste from Google Sheets / Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    bulkMode === 'file'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload .CSV File</span>
                </button>
              </div>

              {bulkMode === 'paste' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Paste Copied Spreadsheet Rows (Tab-separated or Comma-separated):
                  </label>
                  <textarea
                    rows={6}
                    value={bulkText}
                    onChange={(e) => {
                      setBulkText(e.target.value);
                      parseDelimitedContacts(e.target.value);
                    }}
                    placeholder={
                      isCustomers
                        ? "Saudi Aramco\tKhalid Al-Otaibi\tkhalid@aramco.com\t+966 13 874 0000\tSaudi Arabia\tDhahran\tCentral Dock\tNet 30 Days\nADNOC\tAhmed Al-Mansoor\tahmed@adnoc.ae\t+971 2 602 0000\tUAE\tAbu Dhabi\tSupply Base\tNet 60 Days"
                        : "Siemens AG\tHans Schmidt\torders@siemens.com\t+49 89 636 00\tGermany\tNet 30 Days\tEUR\nABB Power\tMarco Rossi\tspares@abb.com\t+41 43 317 7111\tSwitzerland\tNet 30 Days\tUSD"
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50/50 transition-colors">
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Choose a .CSV file with your {isCustomers ? 'customer' : 'supplier'} list
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 mb-3">
                    Drag and drop or browse from your computer
                  </p>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                  />
                  {bulkFileName && (
                    <p className="text-xs font-semibold text-emerald-700 mt-2">
                      Selected File: {bulkFileName}
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {bulkErrorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{bulkErrorMessage}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedBulkItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Parsed {isCustomers ? 'Customers' : 'Suppliers'} Preview ({parsedBulkItems.length} records ready):
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      All Valid &amp; Ready to Import
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">{isCustomers ? 'Company Name' : 'Supplier Name'}</th>
                          <th className="py-2 px-3">Contact Person</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Country</th>
                          <th className="py-2 px-3">{isCustomers ? 'Address' : 'Payment Terms'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedBulkItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {isCustomers ? item.companyName : item.name}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{item.contactPerson}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.email}</td>
                            <td className="py-2 px-3 text-slate-600">{item.phone || '—'}</td>
                            <td className="py-2 px-3">{item.country}</td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                              {isCustomers ? item.shippingAddress : item.paymentTerms}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {parsedBulkItems.length > 0
                  ? `${parsedBulkItems.length} contacts will be added and synced to Google Sheets`
                  : 'Paste or upload rows above to see preview'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedBulkItems.length === 0 || isBulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-300" />
                  <span>
                    {isBulkSubmitting
                      ? 'Importing...'
                      : `Import ${parsedBulkItems.length} ${isCustomers ? 'Customers' : 'Suppliers'}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
