import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  Mail, Phone, MapPin, Send, Loader2, 
  MessageSquare, User, Building2, CheckCircle
} from 'lucide-react';
import api from '../lib/api';

function Contact() {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSending(true);
    try {
      await api.post('/contact', data);
      toast.success(t('contact.success'));
      setSent(true);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('contact.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('contact.title')}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Kontaktinformationen */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Kontaktkarte */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('contact.contactInfo')}</h2>
                
                <div className="space-y-4">
                  <a 
                    href="mailto:service@internationaljobplacement.com"
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-primary-50 transition-colors group"
                  >
                    <div className="bg-primary-100 p-3 rounded-xl group-hover:bg-primary-200 transition-colors flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">E-Mail</p>
                      <p className="font-medium text-gray-900 group-hover:text-primary-600 break-all text-sm">
                        service@internationaljobplacement.com
                      </p>
                    </div>
                  </a>

                  <div className="flex items-start gap-4 p-3">
                    <div className="bg-gray-100 p-3 rounded-xl">
                      <MapPin className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="font-medium text-gray-900">
                        IJP International Job Placement UG<br />
                        Husemannstr. 9<br />
                        10435 Berlin
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info-Box */}
              <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Schnelle Antwort</h3>
                <p className="text-gray-600 text-sm">
                  Wir bemühen uns, alle Anfragen innerhalb von 24-48 Stunden zu beantworten.
                </p>
              </div>

              {/* Handelsregister Info */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Firmendaten</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="text-gray-500">Handelsregister:</span> HRB 207656 B</p>
                  <p><span className="text-gray-500">Registergericht:</span> AG Berlin-Charlottenburg</p>
                  <p><span className="text-gray-500">USt-IdNr.:</span> DE324792764</p>
                </div>
              </div>
            </div>

            {/* Kontaktformular */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-8">
                {sent ? (
                  <div className="text-center py-12">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('contact.success')}</h2>
                    <p className="text-gray-600 mb-6">
                      {t('contact.successDesc')}
                    </p>
                    <button
                      onClick={() => setSent(false)}
                      className="btn-primary"
                    >
                      {t('contact.send')}
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <MessageSquare className="h-6 w-6 text-primary-600" />
                      {t('contact.formTitle')}
                    </h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div>
                          <label className="label">Name *</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              className={`input-styled pl-10 ${errors.name ? 'border-red-500' : ''}`}
                              placeholder="Ihr Name"
                              {...register('name', { required: 'Name ist erforderlich' })}
                            />
                          </div>
                          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                        </div>

                        {/* E-Mail */}
                        <div>
                          <label className="label">E-Mail *</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="email"
                              className={`input-styled pl-10 ${errors.email ? 'border-red-500' : ''}`}
                              placeholder="ihre@email.de"
                              {...register('email', { 
                                required: 'E-Mail ist erforderlich',
                                pattern: {
                                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                  message: 'Ungültige E-Mail-Adresse'
                                }
                              })}
                            />
                          </div>
                          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                        </div>
                      </div>

                      {/* Firma (optional) */}
                      <div>
                        <label className="label">Firma (optional)</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            className="input-styled pl-10"
                            placeholder="Firmenname"
                            {...register('company')}
                          />
                        </div>
                      </div>

                      {/* Betreff */}
                      <div>
                        <label className="label">Betreff *</label>
                        <select
                          className={`input-styled ${errors.subject ? 'border-red-500' : ''}`}
                          {...register('subject', { required: 'Betreff ist erforderlich' })}
                        >
                          <option value="">Bitte wählen...</option>
                          <option value="Allgemeine Anfrage">Allgemeine Anfrage</option>
                          <option value="Für Bewerber">Für Bewerber</option>
                          <option value="Für Unternehmen">Für Unternehmen</option>
                          <option value="Technischer Support">Technischer Support</option>
                          <option value="Kooperation / Partnerschaft">Kooperation / Partnerschaft</option>
                          <option value="Feedback">Feedback</option>
                          <option value="Sonstiges">Sonstiges</option>
                        </select>
                        {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                      </div>

                      {/* Nachricht */}
                      <div>
                        <label className="label">Nachricht *</label>
                        <textarea
                          rows={6}
                          className={`input-styled resize-none ${errors.message ? 'border-red-500' : ''}`}
                          placeholder="Ihre Nachricht an uns..."
                          {...register('message', { 
                            required: 'Nachricht ist erforderlich',
                            minLength: {
                              value: 10,
                              message: 'Nachricht muss mindestens 10 Zeichen lang sein'
                            }
                          })}
                        />
                        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
                      </div>

                      {/* Datenschutz */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="privacy"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          {...register('privacy', { required: 'Sie müssen der Datenschutzerklärung zustimmen' })}
                        />
                        <label htmlFor="privacy" className="text-sm text-gray-600">
                          Ich habe die{' '}
                          <a href="/datenschutz" target="_blank" className="text-primary-600 hover:underline">
                            Datenschutzerklärung
                          </a>{' '}
                          gelesen und bin mit der Verarbeitung meiner Daten einverstanden. *
                        </label>
                      </div>
                      {errors.privacy && <p className="text-red-500 text-sm">{errors.privacy.message}</p>}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={sending}
                        className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {t('contact.sending')}
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            {t('contact.send')}
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;

