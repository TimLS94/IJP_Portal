"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Mail, ArrowLeft, Loader2, Upload, Eye, Send, FileText,
  X, Check, AlertCircle, Trash2, Paperclip, Settings,
  Search, ChevronDown, ChevronUp, History
} from "lucide-react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface Attachment {
  name: string;
  size: number;
  base64: string;
  type: string;
}

interface AlreadyContacted {
  email: string;
  last_sent_at: string;
  times: number;
  last_sender?: string | null;
}

interface CheckResult {
  input_count: number;
  unique_valid: number;
  invalid: number;
  duplicates_in_list: number;
  new: string[];
  already_contacted: AlreadyContacted[];
}

interface ContactRow {
  email: string;
  last_sent_at: string;
  times: number;
  successful: number;
  last_sender?: string | null;
}

const SENDER_OPTIONS = [
  { email: "business@jobon.work", name: "JobOn Business" },
  { email: "info@jobon.work", name: "JobOn Info" },
  { email: "tim@jobon.work", name: "Tim Schäfer" },
  { email: "noreply@jobon.work", name: "JobOn" },
  { email: "service@internationaljobplacement.com", name: "International Job Placement" },
];

export default function ColdOutreachPage() {
  const [emails, setEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(`Sehr geehrte Damen und Herren,

wir von JobOn vermitteln qualifizierte internationale Fachkräfte für Ihr Unternehmen.

Unsere Vorteile:
- Motivierte Mitarbeiter
- Schnelle Vermittlung
- Persönliche Betreuung

Besuchen Sie uns auf www.jobon.work

Mit freundlichen Grüßen`);
  const [isHtml, setIsHtml] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [senderEmail, setSenderEmail] = useState("business@jobon.work");
  const [senderName, setSenderName] = useState("JobOn Business");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [gmailConfig, setGmailConfig] = useState<{ enabled: boolean; from: string; name: string }>({ enabled: false, from: "", name: "" });
  const [useGmail, setUseGmail] = useState(false);
  // Dubletten-Check gegen die Kaltakquise-Historie
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [includeContacted, setIncludeContacted] = useState(false);
  const [showContactedList, setShowContactedList] = useState(false);
  // Durchsuchbare Kontakt-Historie
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<ContactRow[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  // Import bereits (extern) gesendeter Adressen
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSender, setImportSender] = useState("");
  const [importDate, setImportDate] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Gmail-Versand-Status laden; wenn konfiguriert, standardmäßig aktiv
  useEffect(() => {
    adminAPI.getColdOutreachConfig()
      .then((r) => {
        const enabled = !!r.data?.gmail_enabled;
        setGmailConfig({ enabled, from: r.data?.gmail_from || "", name: r.data?.gmail_from_name || "" });
        setUseGmail(enabled);
      })
      .catch(() => {});
  }, []);

  // Empfängerliste gegen die Kaltakquise-Historie prüfen (neu vs. bereits kontaktiert)
  useEffect(() => {
    if (emails.length === 0) { setCheckResult(null); setIncludeContacted(false); return; }
    let cancelled = false;
    setChecking(true);
    adminAPI.checkColdOutreachRecipients(emails)
      .then((r) => { if (!cancelled) setCheckResult(r.data); })
      .catch(() => { if (!cancelled) setCheckResult(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [emails]);

  // Durchsuchbare Kontakt-Historie (debounced)
  useEffect(() => {
    const term = contactSearch.trim();
    const t = setTimeout(() => {
      setSearchingContacts(true);
      adminAPI.searchColdOutreachContacts(term, 100)
        .then((r) => setContactResults(r.data?.contacts || []))
        .catch(() => setContactResults([]))
        .finally(() => setSearchingContacts(false));
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(line => {
        const trimmed = line.trim();
        return trimmed && trimmed.includes("@") && trimmed.includes(".");
      });
      
      const uniqueEmails = [...new Set(lines.map(e => e.trim().toLowerCase()))];
      setEmails(uniqueEmails);
      toast.success(`${uniqueEmails.length} E-Mail-Adressen importiert`);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const clearEmails = () => {
    if (confirm("Alle E-Mail-Adressen entfernen?")) {
      setEmails([]);
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Max 10MB pro Datei
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} ist zu groß (max. 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          size: file.size,
          base64,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSenderChange = (email: string) => {
    setSenderEmail(email);
    const option = SENDER_OPTIONS.find(o => o.email === email);
    if (option) setSenderName(option.name);
  };

  const sendTestEmail = async () => {
    if (!subject || !content) {
      toast.error("Betreff und Inhalt erforderlich");
      return;
    }

    try {
      await adminAPI.sendColdOutreachEmail({
        to: senderEmail,
        subject: `[TEST] ${subject}`,
        content,
        is_html: isHtml,
        from_email: senderEmail,
        from_name: senderName,
        use_gmail: useGmail,
        attachments: attachments.map(a => ({
          filename: a.name,
          content: a.base64,
          type: a.type
        }))
      });
      toast.success("Test-E-Mail gesendet");
    } catch (error) {
      toast.error("Fehler beim Senden");
    }
  };

  const runImport = async () => {
    const list = importText.split(/[\r\n,;\s]+/).map(s => s.trim()).filter(s => s.includes("@") && s.includes("."));
    if (list.length === 0) { toast.error("Keine gültigen Adressen"); return; }
    if (!importSender.trim() || !importSender.includes("@")) { toast.error("Absender-E-Mail angeben"); return; }
    setImporting(true);
    try {
      const r = await adminAPI.importSentColdOutreach({
        emails: list,
        sender_email: importSender.trim(),
        sent_at: importDate ? new Date(importDate).toISOString() : undefined,
      });
      toast.success(`${r.data?.added ?? 0} importiert · ${r.data?.skipped_existing ?? 0} schon vorhanden · ${r.data?.invalid ?? 0} ungültig`);
      setImportText("");
      // Historie-Suche & aktuellen Check aktualisieren
      setContactSearch((s) => s);
      if (emails.length > 0) {
        adminAPI.checkColdOutreachRecipients(emails).then((res) => setCheckResult(res.data)).catch(() => {});
      }
    } catch {
      toast.error("Import fehlgeschlagen");
    } finally {
      setImporting(false);
    }
  };

  // Tatsächliche Empfänger: bereits kontaktierte nur, wenn bewusst eingeschlossen
  const recipients: string[] = checkResult
    ? (includeContacted ? [...checkResult.new, ...checkResult.already_contacted.map(a => a.email)] : checkResult.new)
    : emails;

  const sendAllEmails = async () => {
    if (recipients.length === 0) {
      toast.error("Keine Empfänger vorhanden");
      return;
    }
    if (!subject || !content) {
      toast.error("Betreff und Inhalt erforderlich");
      return;
    }
    const skipped = checkResult && !includeContacted ? checkResult.already_contacted.length : 0;
    const confirmMsg = skipped > 0
      ? `${recipients.length} E-Mails versenden?\n(${skipped} bereits kontaktierte werden übersprungen)`
      : `${recipients.length} E-Mails versenden?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    setSending(true);
    setSendProgress({ sent: 0, total: recipients.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      try {
        await adminAPI.sendColdOutreachEmail({
          to: recipients[i],
          subject,
          content,
          is_html: isHtml,
          from_email: senderEmail,
          from_name: senderName,
          use_gmail: useGmail,
          attachments: attachments.map(a => ({
            filename: a.name,
            content: a.base64,
            type: a.type
          }))
        });
        successCount++;
      } catch {
        failCount++;
      }
      setSendProgress({ sent: i + 1, total: recipients.length });

      // Kleine Pause zwischen E-Mails
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setSending(false);
    toast.success(`${successCount} gesendet, ${failCount} fehlgeschlagen`);

    if (successCount > 0) {
      setEmails([]);
      setCheckResult(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Zurück-Link */}
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Vertrieb
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <Mail className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kaltakquise E-Mails</h1>
            <p className="text-sm text-gray-500">Massen-E-Mails an potenzielle Kunden versenden</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Absender & Anhänge</h3>

          {/* Versandweg: Gmail vs. SendGrid-Absender */}
          <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
            {gmailConfig.enabled ? (
              <>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGmail}
                    onChange={(e) => setUseGmail(e.target.checked)}
                    className="mt-0.5 accent-orange-500 h-4 w-4"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">Über Gmail senden</span>
                    <span className="text-gray-600"> ({gmailConfig.from})</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {useGmail
                        ? "Aktiv: Alle Mails gehen von dieser Gmail-Adresse raus – die Absender-Auswahl unten wird ignoriert."
                        : "Aus: Es wird der unten gewählte Absender (über SendGrid) verwendet."}
                    </span>
                  </span>
                </label>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Gmail-Versand nicht konfiguriert. Zum Aktivieren <code>OUTREACH_SMTP_USER</code> und{" "}
                <code>OUTREACH_SMTP_PASSWORD</code> in Render setzen. Es wird der unten gewählte Absender (SendGrid) verwendet.
              </p>
            )}
          </div>

          {/* Sender Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail</label>
            <select
              value={senderEmail}
              onChange={(e) => handleSenderChange(e.target.value)}
              disabled={useGmail}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SENDER_OPTIONS.map(opt => (
                <option key={opt.email} value={opt.email}>
                  {opt.name} ({opt.email})
                </option>
              ))}
            </select>
            {useGmail && (
              <p className="text-xs text-gray-500 mt-1">Wird bei Gmail-Versand ignoriert.</p>
            )}
          </div>

          {/* Custom Sender Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="z.B. Tim Schäfer"
              disabled={useGmail}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anhänge ({attachments.length})
            </label>
            
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mb-3">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                className="hidden"
              />
              <Paperclip className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Dateien hinzufügen</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">Max. 10MB pro Datei (PDF, Bilder, Dokumente)</p>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate max-w-[200px]">{att.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(att.size)})</span>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Linke Spalte: E-Mail Import */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">E-Mail-Adressen importieren</h2>
          </div>

          {/* Upload Area */}
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-colors mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700">CSV-Datei hochladen</p>
            <p className="text-sm text-gray-500">Eine E-Mail pro Zeile</p>
          </label>

          {/* Email List */}
          {emails.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {emails.length} Empfänger
                </span>
                <button
                  onClick={clearEmails}
                  className="text-sm text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Alle entfernen
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {emails.slice(0, 50).map((email, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="text-gray-700 truncate">{email}</span>
                    <button
                      onClick={() => removeEmail(idx)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {emails.length > 50 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    ... und {emails.length - 50} weitere
                  </p>
                )}
              </div>

              {/* Dubletten-Check gegen die Historie */}
              {checking && <p className="text-xs text-gray-400 mt-3">Prüfe gegen Historie…</p>}
              {checkResult && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-green-700 font-semibold">{checkResult.new.length} neu</span>
                    <span className="text-amber-700 font-semibold">{checkResult.already_contacted.length} bereits kontaktiert</span>
                    {checkResult.duplicates_in_list > 0 && <span className="text-gray-500">{checkResult.duplicates_in_list} Dubletten entfernt</span>}
                    {checkResult.invalid > 0 && <span className="text-gray-500">{checkResult.invalid} ungültig</span>}
                  </div>
                  {checkResult.already_contacted.length > 0 && (
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={includeContacted} onChange={e => setIncludeContacted(e.target.checked)} className="accent-orange-500 h-4 w-4" />
                        <span>Auch an bereits Kontaktierte senden (<strong>{checkResult.already_contacted.length}</strong>)</span>
                      </label>
                      <button type="button" onClick={() => setShowContactedList(v => !v)} className="text-xs text-primary-600 hover:underline">
                        {showContactedList ? "Liste ausblenden" : "Bereits Kontaktierte anzeigen"}
                      </button>
                      {showContactedList && (
                        <div className="mt-1 max-h-40 overflow-y-auto space-y-1">
                          {checkResult.already_contacted.map((c) => (
                            <div key={c.email} className="text-xs bg-amber-50 border border-amber-100 rounded px-2 py-1">
                              <span className="text-gray-800">{c.email}</span>
                              <span className="text-gray-500"> · {c.times}× · zuletzt {new Date(c.last_sent_at).toLocaleDateString("de-DE")}{c.last_sender ? ` · von ${c.last_sender}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rechte Spalte: E-Mail Editor */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">E-Mail verfassen</h2>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setIsHtml(false)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  !isHtml ? "bg-white shadow-sm" : "text-gray-600"
                }`}
              >
                Volltext
              </button>
              <button
                onClick={() => setIsHtml(true)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  isHtml ? "bg-white shadow-sm" : "text-gray-600"
                }`}
              >
                HTML
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="z.B. Internationale Fachkräfte für Ihr Unternehmen"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inhalt ({isHtml ? "HTML" : "Volltext"})
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
            />
          </div>

          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(true)}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Vorschau anzeigen
          </button>
        </div>
      </div>

      {/* Kontaktierte Adressen: durchsuchen & bereits gesendete importieren */}
      <div className="card mb-28">
        <button type="button" onClick={() => setShowHistoryPanel(v => !v)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Kontaktierte Adressen &amp; Import</h2>
          </div>
          {showHistoryPanel ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showHistoryPanel && (
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            {/* Durchsuchen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Historie durchsuchen</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="E-Mail-Adresse suchen…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
                {searchingContacts ? (
                  <p className="text-xs text-gray-400 py-2">Suche…</p>
                ) : contactResults.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Keine Treffer</p>
                ) : contactResults.map((c) => (
                  <div key={c.email} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                    <div className="font-medium text-gray-800 truncate">{c.email}</div>
                    <div className="text-gray-500">
                      {c.times}× · zuletzt {new Date(c.last_sent_at).toLocaleDateString("de-DE")}
                      {c.last_sender ? <> · von <span className="text-gray-700">{c.last_sender}</span></> : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Import bereits gesendeter Adressen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bereits gesendete importieren</label>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Eine E-Mail-Adresse pro Zeile (oder komma-getrennt)…"
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
              <input
                value={importSender}
                onChange={e => setImportSender(e.target.value)}
                placeholder="Absender, z. B. momente.ijp@gmail.com"
                className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={importDate}
                  onChange={e => setImportDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  title="Datum des Versands (optional)"
                />
                <button
                  type="button"
                  onClick={runImport}
                  disabled={importing}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Als „kontaktiert" importieren
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Trägt die Adressen mit dem angegebenen Absender als „bereits kontaktiert" ein, damit der Dubletten-Check sie erkennt. Bereits vorhandene werden übersprungen.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Bereit zum Versenden?</span>
            <span className="ml-2">
              {recipients.length} Empfänger{checkResult && !includeContacted && checkResult.already_contacted.length > 0 ? ` (${checkResult.already_contacted.length} übersprungen)` : ""} · {useGmail && gmailConfig.enabled
                ? `${gmailConfig.name || "Gmail"} (${gmailConfig.from})`
                : `${senderName} (${senderEmail})`}
              {attachments.length > 0 && ` · ${attachments.length} Anhänge`}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendTestEmail}
              disabled={sending || !subject || !content}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Test an mich
            </button>
            <button
              onClick={sendAllEmails}
              disabled={sending || recipients.length === 0 || !subject || !content}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {sendProgress.sent}/{sendProgress.total}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {recipients.length} E-Mails senden
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">E-Mail Vorschau</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <span className="text-sm text-gray-500">Betreff:</span>
                <p className="font-medium">{subject || "(Kein Betreff)"}</p>
              </div>
              <div className="border-t pt-4">
                {isHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">{content}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
