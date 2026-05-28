"use client";

import { useState, useRef } from "react";
import { 
  Mail, ArrowLeft, Loader2, Upload, Eye, Send, FileText, 
  X, Check, AlertCircle, Trash2, Paperclip, Settings
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

const SENDER_OPTIONS = [
  { email: "business@jobon.work", name: "JobOn Business" },
  { email: "info@jobon.work", name: "JobOn Info" },
  { email: "tim@jobon.work", name: "Tim Schäfer" },
  { email: "noreply@jobon.work", name: "JobOn" },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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

  const sendAllEmails = async () => {
    if (emails.length === 0) {
      toast.error("Keine Empfänger vorhanden");
      return;
    }
    if (!subject || !content) {
      toast.error("Betreff und Inhalt erforderlich");
      return;
    }
    if (!confirm(`${emails.length} E-Mails versenden?`)) {
      return;
    }

    setSending(true);
    setSendProgress({ sent: 0, total: emails.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emails.length; i++) {
      try {
        await adminAPI.sendColdOutreachEmail({
          to: emails[i],
          subject,
          content,
          is_html: isHtml,
          from_email: senderEmail,
          from_name: senderName,
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
      setSendProgress({ sent: i + 1, total: emails.length });
      
      // Kleine Pause zwischen E-Mails
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setSending(false);
    toast.success(`${successCount} gesendet, ${failCount} fehlgeschlagen`);
    
    if (successCount > 0) {
      setEmails([]);
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
          
          {/* Sender Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail</label>
            <select
              value={senderEmail}
              onChange={(e) => handleSenderChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {SENDER_OPTIONS.map(opt => (
                <option key={opt.email} value={opt.email}>
                  {opt.name} ({opt.email})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Sender Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender Name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="z.B. Tim Schäfer"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Bereit zum Versenden?</span>
            <span className="ml-2">
              {emails.length} Empfänger · {senderName} ({senderEmail})
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
              disabled={sending || emails.length === 0 || !subject || !content}
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
                  {emails.length} E-Mails senden
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
