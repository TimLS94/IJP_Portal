"use client";

import { useState, useEffect, useRef } from "react";
import { documentsAPI, applicantAPI } from "@/lib/api";
import { 
  Loader2, FileText, Upload, Trash2, Download, FolderOpen, CheckCircle, 
  File, Shield, FileImage, ChevronDown, Clock, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  original_name?: string;
  file_size: number;
  uploaded_at: string;
  type_label?: string;
  is_verified?: boolean;
}

// Dokumenttypen mit Icons
const documentTypeIcons: Record<string, React.ComponentType<{className?: string}>> = {
  passport: Shield,
  cv: FileText,
  photo: FileImage,
  enrollment_cert: File,
  enrollment_trans: File,
  ba_declaration: File,
  language_cert: File,
  diploma: File,
  school_cert: File,
  work_reference: File,
  other: File
};

export default function ApplicantDocumentsPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [documentStatus, setDocumentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedType, setSelectedType] = useState('other');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypeOptions = [
    { value: 'passport', label: t('documentTypes.passport') },
    { value: 'cv', label: t('documentTypes.cv') },
    { value: 'photo', label: t('documentTypes.photo') },
    { value: 'enrollment_cert', label: t('documentTypes.enrollmentCert') },
    { value: 'enrollment_trans', label: t('documentTypes.enrollmentTrans') },
    { value: 'ba_declaration', label: t('documentTypes.baDeclaration') },
    { value: 'language_cert', label: t('documentTypes.languageCert') },
    { value: 'diploma', label: t('documentTypes.diploma') },
    { value: 'school_cert', label: t('documentTypes.schoolCert') },
    { value: 'work_reference', label: t('documentTypes.workReference') },
    { value: 'other', label: t('documentTypes.other') },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([
        applicantAPI.getProfile().catch(() => ({ data: null })),
        documentsAPI.list()
      ]);
      
      setProfile(profileRes.data);
      setDocuments(docsRes.data || []);
      
      if (profileRes.data?.position_type) {
        const statusRes = await documentsAPI.getStatus();
        setDocumentStatus(statusRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF-Validierung
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error(t('applicantDocuments.onlyPdf'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('applicantDocuments.fileTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      await documentsAPI.upload(file, selectedType, description);
      toast.success(t('applicantDocuments.uploadSuccess'));
      setShowUploadModal(false);
      setDescription('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('applicantDocuments.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('applicantDocuments.deleteConfirm'))) return;
    try {
      await documentsAPI.delete(id);
      toast.success(t('applicantDocuments.deleted'));
      loadData();
    } catch (error) {
      toast.error(t('applicantDocuments.deleteFailed'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('applicantDocuments.title')}</h1>
            <p className="text-gray-600">{t('applicantDocuments.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="h-5 w-5" />
          {t('common.upload')}
        </button>
      </div>

      {/* Status-Übersicht */}
      {documentStatus && (
        <div className={`card mb-6 border-l-4 ${
          documentStatus.complete ? 'border-l-green-500 bg-green-50' : 'border-l-yellow-500 bg-yellow-50'
        }`}>
          <div className="flex items-center gap-4">
            {documentStatus.complete ? (
              <CheckCircle className="h-10 w-10 text-green-600 flex-shrink-0" />
            ) : (
              <Clock className="h-10 w-10 text-yellow-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                {documentStatus.complete 
                  ? t('applicantDocuments.allUploaded') 
                  : t('applicantDocuments.uploadProgress', { uploaded: documentStatus.uploaded_required, total: documentStatus.total_required })
                }
              </h3>
              <p className="text-gray-600">
                {t('applicantDocuments.forPosition')}: {documentStatus.position_label}
              </p>
              {!documentStatus.complete && documentStatus.missing_required?.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-yellow-800">{t('applicantDocuments.missing')}: </span>
                  <span className="text-sm font-medium text-yellow-900">
                    {documentStatus.missing_required.map((d: any) => d.type_label).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hinweis wenn kein Positionstyp */}
      {!profile?.position_type && !profile?.position_types?.length && (
        <div className="card mb-6 border-l-4 border-l-blue-500 bg-blue-50">
          <div className="flex items-center gap-4">
            <AlertCircle className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{t('applicantDocuments.noPositionType')}</h3>
              <p className="text-gray-600 text-sm">
                {t('applicantDocuments.selectPositionType')}
              </p>
            </div>
            <a href="/applicant/profile" className="btn-primary text-sm">
              {t('applicantDocuments.editProfile')}
            </a>
          </div>
        </div>
      )}

      {/* Dokumentenliste */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          {t('applicantDocuments.uploadedDocuments')} ({documents.length})
        </h2>
        
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">{t('applicantDocuments.noDocuments')}</p>
            <p className="text-gray-400 text-sm mb-4">
              {t('applicantDocuments.uploadHint')}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="h-5 w-5" />
              {t('applicantDocuments.uploadFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const Icon = documentTypeIcons[doc.document_type] || File;
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="bg-white p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {doc.type_label || documentTypeOptions.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                        {doc.is_verified && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {t('applicantDocuments.verified')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-600" />
              {t('applicantDocuments.uploadDocument')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">{t('applicantDocuments.documentType')}</label>
                <div className="relative">
                  <select
                    className="appearance-none w-full px-4 py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl 
                              focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none
                              transition-all cursor-pointer text-gray-700 font-medium"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {documentTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="label">{t('applicantDocuments.descriptionOptional')}</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder={t('applicantDocuments.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div>
                <label className="label">{t('applicantDocuments.selectFile')}</label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl
                             file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 
                             file:bg-primary-100 file:text-primary-700 file:font-medium
                             hover:file:bg-primary-200 hover:border-primary-300 
                             transition-all cursor-pointer"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {t('applicantDocuments.pdfOnly')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setDescription('');
                }}
                className="btn-secondary"
                disabled={uploading}
              >
                {t('common.cancel')}
              </button>
              {uploading && (
                <div className="flex items-center gap-2 text-primary-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('applicantDocuments.uploading')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
