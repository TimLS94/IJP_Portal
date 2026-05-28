"use client";

import { useState, useEffect } from "react";
import { 
  Users, Plus, ExternalLink, Trash2, Edit2, Check, X, 
  Loader2, Filter, Tag, Clock, Copy, ChevronDown, Search, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import toast from "react-hot-toast";

interface FacebookGroup {
  id: number;
  name: string;
  url: string;
  cluster?: string;
  members: number;
  notes?: string;
  last_posted_at?: string;
  is_active: boolean;
  created_at: string;
}

interface NewGroup {
  name: string;
  url: string;
  cluster: string;
  members: string;
  notes: string;
}

export default function FacebookGroupsPage() {
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FacebookGroup | null>(null);
  const [newGroup, setNewGroup] = useState<NewGroup>({
    name: "",
    url: "",
    cluster: "",
    members: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [newCluster, setNewCluster] = useState("");

  useEffect(() => {
    loadData();
  }, [selectedCluster]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, clustersRes] = await Promise.all([
        adminAPI.getFacebookGroups(selectedCluster || undefined),
        adminAPI.getFacebookGroupClusters()
      ]);
      setGroups(groupsRes.data || []);
      setClusters(clustersRes.data || []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      toast.error("Fehler beim Laden der Gruppen");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!newGroup.name || !newGroup.url) {
      toast.error("Name und URL sind erforderlich");
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        name: newGroup.name,
        url: newGroup.url,
        cluster: newCluster || newGroup.cluster || null,
        members: newGroup.members ? parseInt(newGroup.members) : 0,
        notes: newGroup.notes || null
      };

      if (editingGroup) {
        await adminAPI.updateFacebookGroup(editingGroup.id, data);
        toast.success("Gruppe aktualisiert");
      } else {
        await adminAPI.createFacebookGroup(data);
        toast.success("Gruppe hinzugefügt");
      }
      
      setShowAddModal(false);
      setEditingGroup(null);
      setNewGroup({ name: "", url: "", cluster: "", members: "", notes: "" });
      setNewCluster("");
      loadData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Gruppe wirklich löschen?")) return;
    try {
      await adminAPI.deleteFacebookGroup(id);
      toast.success("Gruppe gelöscht");
      loadData();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const openEditModal = (group: FacebookGroup) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      url: group.url,
      cluster: group.cluster || "",
      members: group.members?.toString() || "",
      notes: group.notes || ""
    });
    setShowAddModal(true);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL kopiert");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Nie";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.url.toLowerCase().includes(search.toLowerCase()) ||
    g.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByCluster = filteredGroups.reduce((acc, group) => {
    const cluster = group.cluster || "Ohne Kategorie";
    if (!acc[cluster]) acc[cluster] = [];
    acc[cluster].push(group);
    return acc;
  }, {} as Record<string, FacebookGroup[]>);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Zurück-Link */}
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Vertrieb
      </Link>

      {/* Header - Mobile optimiert */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facebook Gruppen</h1>
            <p className="text-sm text-gray-500">{groups.length} Gruppen</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingGroup(null);
            setNewGroup({ name: "", url: "", cluster: "", members: "", notes: "" });
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          <span>Gruppe hinzufügen</span>
        </button>
      </div>

      {/* Filter & Suche - Mobile optimiert */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Suche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Cluster Filter */}
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Alle Kategorien</option>
            {clusters.map((cluster) => (
              <option key={cluster} value={cluster}>{cluster}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Cluster Tags */}
      {clusters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCluster("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !selectedCluster 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Alle
          </button>
          {clusters.map((cluster) => (
            <button
              key={cluster}
              onClick={() => setSelectedCluster(cluster)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedCluster === cluster 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Tag className="h-3 w-3" />
              {cluster}
            </button>
          ))}
        </div>
      )}

      {/* Gruppen Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Keine Gruppen gefunden</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-blue-600 hover:underline"
          >
            Erste Gruppe hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCluster).map(([cluster, clusterGroups]) => (
            <div key={cluster}>
              {/* Cluster Header */}
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <h2 className="font-semibold text-gray-700">{cluster}</h2>
                <span className="text-sm text-gray-400">({clusterGroups.length})</span>
              </div>
              
              {/* Gruppen Cards */}
              <div className="space-y-3">
                {clusterGroups.map((group) => (
                  <div 
                    key={group.id}
                    className="card p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                        <a 
                          href={group.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {group.url}
                        </a>
                        {group.notes && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{group.notes}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          {group.members > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {group.members.toLocaleString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(group.last_posted_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyUrl(group.url)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="URL kopieren"
                        >
                          <Copy className="h-5 w-5" />
                        </button>
                        <a
                          href={group.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Öffnen"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => openEditModal(group)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingGroup ? "Gruppe bearbeiten" : "Neue Gruppe"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGroup(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. Arbeiten in Deutschland"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook URL *
                </label>
                <input
                  type="url"
                  value={newGroup.url}
                  onChange={(e) => setNewGroup({ ...newGroup, url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://facebook.com/groups/..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <div className="flex gap-2">
                  <select
                    value={newGroup.cluster}
                    onChange={(e) => {
                      setNewGroup({ ...newGroup, cluster: e.target.value });
                      setNewCluster("");
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Kategorie wählen...</option>
                    {clusters.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={newCluster}
                  onChange={(e) => {
                    setNewCluster(e.target.value);
                    setNewGroup({ ...newGroup, cluster: "" });
                  }}
                  className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Oder neue Kategorie eingeben..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mitglieder (ca.)
                </label>
                <input
                  type="number"
                  value={newGroup.members}
                  onChange={(e) => setNewGroup({ ...newGroup, members: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. 50000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  value={newGroup.notes}
                  onChange={(e) => setNewGroup({ ...newGroup, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                  placeholder="z.B. Posting-Regeln, beste Zeiten..."
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGroup(null);
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {editingGroup ? "Speichern" : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
