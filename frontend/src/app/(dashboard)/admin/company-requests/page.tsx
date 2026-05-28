"use client";

import { useState, useEffect } from "react";
import { Building2, CheckCircle, XCircle, Eye } from "lucide-react";
import { companyRequestsAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface CompanyRequest {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

export default function AdminCompanyRequestsPage() {
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await companyRequestsAPI.adminGetAll({});
      setRequests(response.data || []);
    } catch (error) {
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await companyRequestsAPI.adminUpdateStatus(id, { status: "approved" });
      toast.success("Anfrage genehmigt!");
      loadRequests();
    } catch (error) {
      toast.error("Fehler beim Genehmigen");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Anfrage wirklich ablehnen?")) return;
    try {
      await companyRequestsAPI.adminUpdateStatus(id, { status: "rejected" });
      toast.success("Anfrage abgelehnt");
      loadRequests();
    } catch (error) {
      toast.error("Fehler beim Ablehnen");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE");
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Ausstehend",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firmen-Anfragen</h1>
          <p className="text-gray-600">{requests.filter(r => r.status === "pending").length} ausstehend</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontakt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{request.company_name}</td>
                  <td className="px-6 py-4 text-gray-600">{request.contact_name}</td>
                  <td className="px-6 py-4 text-gray-600">{request.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status] || "bg-gray-100"}`}>
                      {statusLabels[request.status] || request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(request.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    {request.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleApprove(request.id)} className="p-2 text-green-500 hover:text-green-700">
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleReject(request.id)} className="p-2 text-red-500 hover:text-red-700">
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <div className="text-center py-12 text-gray-500">Keine Anfragen vorhanden</div>
          )}
        </div>
      )}
    </div>
  );
}
