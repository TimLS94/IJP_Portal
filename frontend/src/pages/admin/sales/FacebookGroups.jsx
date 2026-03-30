import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Facebook, Plus, ExternalLink, Copy, Trash2, Edit2, Save, X,
  Users, Globe, Lock, Star, CheckCircle, Loader2, FileText,
  Sparkles, ClipboardCopy, Eye
} from 'lucide-react';

// Lokaler Storage für Gruppen und Vorlagen
const STORAGE_KEY_GROUPS = 'fb_groups';
const STORAGE_KEY_TEMPLATES = 'fb_templates';

const defaultTemplates = [
  {
    id: 'job-general',
    name: 'Allgemeine Stellenanzeige',
    content: `🔥 JOBCHANCE: {job_title}

📍 Standort: {location}
💼 Typ: {job_type}
💰 Gehalt: {salary}

{description}

✅ Jetzt bewerben: {link}

#Job #Arbeit #Stellenangebot #JobOn`
  },
  {
    id: 'seasonal',
    name: 'Saisonjob / Ferienjob',
    content: `☀️ SAISONJOB VERFÜGBAR!

🏨 {company_name} sucht:
👉 {job_title}

📍 {location}
📅 Zeitraum: {period}
💰 {salary}

Perfekt für Studenten und Saisonarbeiter!

🔗 Mehr Infos: {link}

#Saisonjob #Ferienjob #Studentenjob #Arbeit`
  },
  {
    id: 'fachkraft',
    name: 'Fachkräfte',
    content: `🎯 FACHKRAFT GESUCHT

{company_name} sucht qualifizierte Mitarbeiter:

📌 Position: {job_title}
📍 Ort: {location}
💼 Vollzeit/Teilzeit: {job_type}

Anforderungen:
{requirements}

Wir bieten:
{benefits}

👉 Jetzt bewerben: {link}

#Fachkraft #Karriere #Job #Deutschland`
  }
];

function FacebookGroups() {
  // State
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState(defaultTemplates);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Neuer Gruppen-Form State
  const [newGroup, setNewGroup] = useState({
    name: '',
    url: '',
    type: 'external', // 'own' oder 'external'
    members: '',
    notes: ''
  });

  // Neuer Template-Form State
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: ''
  });

  // Post Generator State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [postVariables, setPostVariables] = useState({});
  const [generatedPost, setGeneratedPost] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Load from localStorage
  useEffect(() => {
    const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
    const savedTemplates = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    }
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  // Gruppen-Funktionen
  const addGroup = () => {
    if (!newGroup.name || !newGroup.url) {
      toast.error('Name und URL sind erforderlich');
      return;
    }

    const group = {
      id: Date.now().toString(),
      ...newGroup,
      members: parseInt(newGroup.members) || 0,
      createdAt: new Date().toISOString()
    };

    setGroups([...groups, group]);
    setNewGroup({ name: '', url: '', type: 'external', members: '', notes: '' });
    setShowAddGroup(false);
    toast.success('Gruppe hinzugefügt');
  };

  const updateGroup = (id, updates) => {
    setGroups(groups.map(g => g.id === id ? { ...g, ...updates } : g));
    setEditingGroup(null);
    toast.success('Gruppe aktualisiert');
  };

  const deleteGroup = (id) => {
    if (window.confirm('Gruppe wirklich löschen?')) {
      setGroups(groups.filter(g => g.id !== id));
      toast.success('Gruppe gelöscht');
    }
  };

  // Template-Funktionen
  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Name und Inhalt sind erforderlich');
      return;
    }

    const template = {
      id: Date.now().toString(),
      ...newTemplate
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: '', content: '' });
    setShowAddTemplate(false);
    toast.success('Vorlage hinzugefügt');
  };

  const updateTemplate = (id, updates) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t));
    setEditingTemplate(null);
    toast.success('Vorlage aktualisiert');
  };

  const deleteTemplate = (id) => {
    if (window.confirm('Vorlage wirklich löschen?')) {
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Vorlage gelöscht');
    }
  };

  // Post-Generator Funktionen
  const extractVariables = (content) => {
    const matches = content.match(/\{([^}]+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    const vars = extractVariables(template.content);
    const initialVars = {};
    vars.forEach(v => initialVars[v] = '');
    setPostVariables(initialVars);
    setGeneratedPost('');
  };

  const generatePost = () => {
    if (!selectedTemplate) return;
    
    let post = selectedTemplate.content;
    Object.entries(postVariables).forEach(([key, value]) => {
      post = post.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `[${key}]`);
    });
    setGeneratedPost(post);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      toast.success('In Zwischenablage kopiert!');
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const openGroupAndCopy = async (group) => {
    await copyToClipboard();
    window.open(group.url, '_blank');
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const ownGroups = groups.filter(g => g.type === 'own');
  const externalGroups = groups.filter(g => g.type === 'external');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Facebook className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facebook Gruppen</h1>
            <p className="text-gray-600">Posts für Facebook Gruppen erstellen und verwalten</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Linke Spalte: Gruppen-Verwaltung */}
        <div className="space-y-6">
          {/* Eigene Gruppen */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Eigene Gruppen ({ownGroups.length})
              </h2>
              <button
                onClick={() => { setShowAddGroup(true); setNewGroup({ ...newGroup, type: 'own' }); }}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </button>
            </div>

            {ownGroups.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Noch keine eigenen Gruppen hinzugefügt
              </p>
            ) : (
              <div className="space-y-2">
                {ownGroups.map(group => (
                  <GroupCard 
                    key={group.id} 
                    group={group} 
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => deleteGroup(group.id)}
                    isSelected={selectedGroups.includes(group.id)}
                    onToggleSelect={() => toggleGroupSelection(group.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Externe Gruppen */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Externe Gruppen ({externalGroups.length})
              </h2>
              <button
                onClick={() => { setShowAddGroup(true); setNewGroup({ ...newGroup, type: 'external' }); }}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </button>
            </div>

            {externalGroups.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Noch keine externen Gruppen hinzugefügt
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {externalGroups.map(group => (
                  <GroupCard 
                    key={group.id} 
                    group={group} 
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => deleteGroup(group.id)}
                    isSelected={selectedGroups.includes(group.id)}
                    onToggleSelect={() => toggleGroupSelection(group.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rechte Spalte: Post Generator */}
        <div className="space-y-6">
          {/* Vorlagen */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Post-Vorlagen
              </h2>
              <button
                onClick={() => setShowAddTemplate(true)}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Neue Vorlage
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{template.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.content.substring(0, 50)}...</p>
                </button>
              ))}
            </div>
          </div>

          {/* Post Generator */}
          {selectedTemplate && (
            <div className="card border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Post Generator</h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Vorlage: <span className="font-medium">{selectedTemplate.name}</span>
                </p>

                {/* Variablen-Eingabe */}
                <div className="space-y-3">
                  {Object.keys(postVariables).map(varName => (
                    <div key={varName}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {varName.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={postVariables[varName]}
                        onChange={(e) => setPostVariables({ ...postVariables, [varName]: e.target.value })}
                        className="input w-full text-sm"
                        placeholder={`${varName} eingeben...`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={generatePost}
                  className="btn-primary w-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Post generieren
                </button>
              </div>
            </div>
          )}

          {/* Generierter Post */}
          {generatedPost && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  Generierter Post
                </h3>
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Kopieren
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700 border">
                {generatedPost}
              </div>

              {/* Schnell-Posten */}
              {selectedGroups.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    In {selectedGroups.length} ausgewählte Gruppen posten:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroups.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      if (!group) return null;
                      return (
                        <button
                          key={group.id}
                          onClick={() => openGroupAndCopy(group)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {group.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      {showAddGroup && (
        <Modal onClose={() => setShowAddGroup(false)} title="Neue Gruppe hinzufügen">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruppenname *</label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="input w-full"
                placeholder="z.B. Jobs in Berlin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL *</label>
              <input
                type="url"
                value={newGroup.url}
                onChange={(e) => setNewGroup({ ...newGroup, url: e.target.value })}
                className="input w-full"
                placeholder="https://www.facebook.com/groups/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select
                value={newGroup.type}
                onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
                className="input w-full"
              >
                <option value="own">Eigene Gruppe</option>
                <option value="external">Externe Gruppe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mitglieder (ca.)</label>
              <input
                type="number"
                value={newGroup.members}
                onChange={(e) => setNewGroup({ ...newGroup, members: e.target.value })}
                className="input w-full"
                placeholder="z.B. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                value={newGroup.notes}
                onChange={(e) => setNewGroup({ ...newGroup, notes: e.target.value })}
                className="input w-full"
                rows={2}
                placeholder="z.B. Posting-Regeln, beste Zeiten..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddGroup(false)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={addGroup} className="btn-primary flex-1">
                Hinzufügen
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <Modal onClose={() => setEditingGroup(null)} title="Gruppe bearbeiten">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gruppenname</label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
              <input
                type="url"
                value={editingGroup.url}
                onChange={(e) => setEditingGroup({ ...editingGroup, url: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select
                value={editingGroup.type}
                onChange={(e) => setEditingGroup({ ...editingGroup, type: e.target.value })}
                className="input w-full"
              >
                <option value="own">Eigene Gruppe</option>
                <option value="external">Externe Gruppe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mitglieder</label>
              <input
                type="number"
                value={editingGroup.members}
                onChange={(e) => setEditingGroup({ ...editingGroup, members: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                value={editingGroup.notes || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, notes: e.target.value })}
                className="input w-full"
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingGroup(null)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button 
                onClick={() => updateGroup(editingGroup.id, editingGroup)} 
                className="btn-primary flex-1"
              >
                Speichern
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Template Modal */}
      {showAddTemplate && (
        <Modal onClose={() => setShowAddTemplate(false)} title="Neue Vorlage erstellen">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorlagenname *</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="input w-full"
                placeholder="z.B. Hoteljob Sommer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inhalt * <span className="text-gray-400 font-normal">(Variablen: {'{variable_name}'})</span>
              </label>
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                className="input w-full font-mono text-sm"
                rows={10}
                placeholder={`🔥 JOBCHANCE: {job_title}

📍 Standort: {location}
💰 Gehalt: {salary}

{description}

✅ Jetzt bewerben: {link}`}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddTemplate(false)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={addTemplate} className="btn-primary flex-1">
                Erstellen
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Group Card Component
function GroupCard({ group, onEdit, onDelete, isSelected, onToggleSelect }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="h-4 w-4 text-blue-600 rounded border-gray-300"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{group.name}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {group.members > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.members.toLocaleString()}
            </span>
          )}
          {group.type === 'own' && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Star className="h-3 w-3" />
              Eigene
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => window.open(group.url, '_blank')}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="Gruppe öffnen"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="Bearbeiten"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Löschen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Modal Component
function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default FacebookGroups;
