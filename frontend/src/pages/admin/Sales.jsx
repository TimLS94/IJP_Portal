import { useState, useRef } from 'react';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  Mail, Upload, Send, Users, FileText, AlertCircle, CheckCircle,
  Loader2, Eye, X, Link as LinkIcon, Bold, Italic, List,
  Trash2, TestTube, Rocket
} from 'lucide-react';

function AdminSales() {
  // CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef(null);

  // E-Mail Content State
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(false); // Standard: Volltext
  const [showPreview, setShowPreview] = useState(false);

  // Sending State
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // CSV Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Bitte eine CSV-Datei auswählen');
      return;
    }

    setCsvFile(file);
    setParsing(true);

    try {
      const response = await adminAPI.parseEmailCSV(file);
      const data = response.data;
      setRecipients(data.recipients || []);
      toast.success(`${data.valid} gültige E-Mail-Adressen gefunden`);
      if (data.invalid > 0) {
        toast.error(`${data.invalid} ungültige Adressen übersprungen`);
      }
    } catch (error) {
      toast.error('Fehler beim Parsen der CSV');
      console.error(error);
    } finally {
      setParsing(false);
    }
  };

  // Empfänger entfernen
  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  // Nur gültige Empfänger
  const validRecipients = recipients.filter(r => r.valid);

  // Aktueller Inhalt basierend auf Modus
  const currentContent = isHtmlMode ? htmlContent : plainText;

  // Test-E-Mail senden
  const sendTestEmail = async () => {
    if (!subject || !currentContent) {
      toast.error('Bitte Betreff und Inhalt eingeben');
      return;
    }

    setSendingTest(true);
    try {
      await adminAPI.sendTestEmail({
        recipients: [],
        subject,
        html_content: isHtmlMode ? htmlContent : '',
        plain_text: isHtmlMode ? '' : plainText,
        is_html: isHtmlMode
      });
      toast.success('Test-E-Mail wurde an deine Admin-Adresse gesendet');
    } catch (error) {
      console.error('Test-E-Mail Fehler:', error);
      toast.error(error.response?.data?.detail || 'Test-E-Mail konnte nicht gesendet werden');
    } finally {
      setSendingTest(false);
    }
  };

  // Massen-E-Mails senden
  const sendEmails = async () => {
    if (!subject || !currentContent) {
      toast.error('Bitte Betreff und Inhalt eingeben');
      return;
    }

    if (validRecipients.length === 0) {
      toast.error('Keine gültigen Empfänger');
      return;
    }

    const confirmed = window.confirm(
      `Möchtest du wirklich ${validRecipients.length} E-Mails versenden?\n\nAbsender: business@jobon.work\nBetreff: ${subject}`
    );

    if (!confirmed) return;

    setSending(true);
    setSendResult(null);

    try {
      const response = await adminAPI.sendSalesEmails({
        recipients: validRecipients.map(r => r.email),
        subject,
        html_content: isHtmlMode ? htmlContent : '',
        plain_text: isHtmlMode ? '' : plainText,
        is_html: isHtmlMode
      });

      setSendResult(response.data);

      if (response.data.failed === 0) {
        toast.success(`${response.data.sent} E-Mails erfolgreich gesendet!`);
      } else {
        toast.error(`${response.data.sent} gesendet, ${response.data.failed} fehlgeschlagen`);
      }
    } catch (error) {
      toast.error('Fehler beim Senden der E-Mails');
    } finally {
      setSending(false);
    }
  };

  // Einfache Formatierung einfügen
  const insertFormatting = (tag) => {
    const textarea = document.getElementById('email-content');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = htmlContent.substring(start, end);

    let newText = '';
    switch (tag) {
      case 'bold':
        newText = `<strong>${selectedText || 'Text'}</strong>`;
        break;
      case 'italic':
        newText = `<em>${selectedText || 'Text'}</em>`;
        break;
      case 'link':
        const url = prompt('URL eingeben:', 'https://');
        if (url) {
          newText = `<a href="${url}" style="color: #2563eb;">${selectedText || 'Link-Text'}</a>`;
        }
        break;
      case 'list':
        newText = `<ul style="margin: 10px 0; padding-left: 20px;">
  <li>${selectedText || 'Punkt 1'}</li>
  <li>Punkt 2</li>
</ul>`;
        break;
      case 'paragraph':
        newText = `<p style="margin: 15px 0;">${selectedText || 'Absatz'}</p>`;
        break;
      case 'heading':
        newText = `<h2 style="color: #1f2937; margin: 20px 0 10px 0;">${selectedText || 'Überschrift'}</h2>`;
        break;
      default:
        return;
    }

    if (newText) {
      const newContent = htmlContent.substring(0, start) + newText + htmlContent.substring(end);
      setHtmlContent(newContent);
    }
  };

  // Reset
  const resetForm = () => {
    setCsvFile(null);
    setRecipients([]);
    setSubject('');
    setHtmlContent('');
    setPlainText('');
    setSendResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Mail className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vertrieb</h1>
            <p className="text-gray-600">Kaltakquise E-Mails versenden</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Absender: <span className="font-medium text-gray-700">business@jobon.work</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Linke Spalte: CSV Upload & Empfänger */}
        <div className="space-y-6">
          {/* CSV Upload */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-600" />
              E-Mail-Adressen importieren
            </h2>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                csvFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-orange-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {parsing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-orange-600 animate-spin mb-3" />
                  <p className="text-gray-600">CSV wird verarbeitet...</p>
                </div>
              ) : csvFile ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-10 w-10 text-green-600 mb-3" />
                  <p className="font-medium text-gray-900">{csvFile.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {validRecipients.length} gültige Empfänger
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetForm();
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-700"
                  >
                    Zurücksetzen
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center cursor-pointer">
                  <FileText className="h-10 w-10 text-gray-400 mb-3" />
                  <p className="font-medium text-gray-700">CSV-Datei hochladen</p>
                  <p className="text-sm text-gray-500 mt-1">Eine E-Mail pro Zeile</p>
                </div>
              )}
            </div>
          </div>

          {/* Empfänger-Liste */}
          {recipients.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Empfänger ({validRecipients.length})
                </h2>
                {recipients.some(r => !r.valid) && (
                  <span className="text-sm text-red-600">
                    {recipients.filter(r => !r.valid).length} ungültig
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {recipients.map((recipient, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      recipient.valid ? 'bg-gray-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {recipient.valid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={recipient.valid ? 'text-gray-700' : 'text-red-700'}>
                        {recipient.email}
                      </span>
                      {!recipient.valid && (
                        <span className="text-xs text-red-500">({recipient.error})</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRecipient(recipient.email)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: E-Mail Inhalt */}
        <div className="space-y-6">
          {/* Betreff */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600" />
                E-Mail verfassen
              </h2>
              
              {/* Modus-Umschalter */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsHtmlMode(false)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    !isHtmlMode ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Volltext
                </button>
                <button
                  onClick={() => setIsHtmlMode(true)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isHtmlMode ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  HTML
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betreff
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="z.B. Internationale Fachkräfte für Ihr Unternehmen"
                  className="input w-full"
                />
              </div>

              {/* Formatierungs-Toolbar - nur im HTML-Modus */}
              {isHtmlMode && (
                <div className="flex items-center gap-1 border-b pb-2">
                  <button
                    onClick={() => insertFormatting('bold')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Fett"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('italic')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Kursiv"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('link')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Link einfügen"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('list')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <div className="border-l mx-2 h-6"></div>
                  <button
                    onClick={() => insertFormatting('heading')}
                    className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => insertFormatting('paragraph')}
                    className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    ¶
                  </button>
                </div>
              )}

              {/* Inhalt - HTML oder Volltext */}
              {isHtmlMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inhalt (HTML)
                  </label>
                  <textarea
                    id="email-content"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    rows={12}
                    placeholder={`<p>Sehr geehrte Damen und Herren,</p>

<p>wir von <strong>JobOn</strong> vermitteln qualifizierte internationale Fachkräfte...</p>

<p>Unsere Vorteile:</p>
<ul>
  <li>Motivierte Mitarbeiter</li>
  <li>Schnelle Vermittlung</li>
</ul>

<p>Besuchen Sie uns: <a href="https://www.jobon.work">www.jobon.work</a></p>

<p>Mit freundlichen Grüßen</p>`}
                    className="input w-full font-mono text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inhalt (Volltext)
                  </label>
                  <textarea
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    rows={12}
                    placeholder={`Sehr geehrte Damen und Herren,

wir von JobOn vermitteln qualifizierte internationale Fachkräfte für Ihr Unternehmen.

Unsere Vorteile:
- Motivierte Mitarbeiter
- Schnelle Vermittlung
- Persönliche Betreuung

Besuchen Sie uns auf www.jobon.work

Mit freundlichen Grüßen
Ihr JobOn Team`}
                    className="input w-full"
                  />
                </div>
              )}

              {/* Vorschau Button */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
              </button>
            </div>
          </div>

          {/* Vorschau */}
          {showPreview && currentContent && (
            <div className="card">
              <h3 className="text-sm font-medium text-gray-700 mb-3">E-Mail Vorschau</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <p className="text-sm">
                    <span className="text-gray-500">Von:</span> business@jobon.work
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Betreff:</span> {subject || '(kein Betreff)'}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Modus:</span> {isHtmlMode ? 'HTML' : 'Volltext'}
                  </p>
                </div>
                {isHtmlMode ? (
                  <div
                    className="p-4 bg-white prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                ) : (
                  <div className="p-4 bg-white whitespace-pre-wrap text-gray-700">
                    {plainText}
                  </div>
                )}
                <div className="bg-gray-50 px-4 py-3 border-t text-center text-xs text-gray-500">
                  IJP International Job Placement UG · Husemannstr. 9, 10435 Berlin · www.jobon.work
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Aktions-Buttons */}
      <div className="card bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Bereit zum Versenden?</h3>
            <p className="text-sm text-gray-600">
              {validRecipients.length} Empfänger · Absender: business@jobon.work
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={sendTestEmail}
              disabled={sendingTest || !subject || !htmlContent}
              className="btn-secondary flex items-center gap-2"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test an mich
            </button>

            <button
              onClick={sendEmails}
              disabled={sending || validRecipients.length === 0 || !subject || !htmlContent}
              className="btn-primary bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {validRecipients.length} E-Mails senden
            </button>
          </div>
        </div>
      </div>

      {/* Ergebnis */}
      {sendResult && (
        <div className={`card ${sendResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className="font-semibold text-gray-900 mb-2">Versand abgeschlossen</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{sendResult.total}</p>
              <p className="text-sm text-gray-600">Gesamt</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{sendResult.sent}</p>
              <p className="text-sm text-gray-600">Gesendet</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{sendResult.failed}</p>
              <p className="text-sm text-gray-600">Fehlgeschlagen</p>
            </div>
          </div>

          {sendResult.errors && sendResult.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-red-700 mb-2">Fehler:</p>
              <ul className="text-sm text-red-600 space-y-1">
                {sendResult.errors.map((err, idx) => (
                  <li key={idx}>{err.email}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminSales;
