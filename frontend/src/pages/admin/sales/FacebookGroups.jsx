import { useState, useEffect } from 'react';
import { adminAPI } from '../../../lib/api';
import toast from 'react-hot-toast';
import {
  Facebook, Plus, ExternalLink, Trash2, Edit2, X,
  Users, Globe, Star, Loader2, FileText,
  Sparkles, ClipboardCopy, Eye, Heart, Clock,
  Save, History, PenLine, BarChart3, Bot, Play, Square,
  RefreshCw, Terminal, Zap, AlertTriangle, MessageSquare
} from 'lucide-react';

function FacebookGroups() {
  // Loading States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data States
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [stats, setStats] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState('compose'); // 'compose', 'saved', 'groups', 'templates'
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Compose States
  const [composeMode, setComposeMode] = useState('freetext'); // 'freetext' oder 'template'
  const [freeText, setFreeText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [postVariables, setPostVariables] = useState({});
  const [generatedPost, setGeneratedPost] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [postTitle, setPostTitle] = useState('');

  // Form States
  const [newGroup, setNewGroup] = useState({
    name: '', url: '', type: 'external', members: 0, notes: ''
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '', content: '', category: ''
  });

  // Bot States
  const [botStatus, setBotStatus] = useState('offline'); // 'offline', 'idle', 'running', 'finished', 'error'
  const [botLogs, setBotLogs] = useState([]);
  const [botConnected, setBotConnected] = useState(false);
  const [botComments, setBotComments] = useState(['']); // Array von Kommentaren
  const [botPost, setBotPost] = useState(''); // Aktueller Post im Bot
  const BOT_URL = 'http://localhost:3847';

  // Load Data
  useEffect(() => {
    loadData();
    checkBotStatus();
    // Bot-Status alle 5 Sekunden prüfen wenn Tab aktiv
    const interval = setInterval(() => {
      if (activeTab === 'bot') checkBotStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ============ Bot Functions ============
  const checkBotStatus = async () => {
    try {
      const res = await fetch(`${BOT_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setBotConnected(true);
        setBotStatus(data.status);
        setBotLogs(data.logs || []);
        if (data.post) setBotPost(data.post);
        if (data.comments && data.comments.length > 0) {
          setBotComments(data.comments);
        }
      } else {
        setBotConnected(false);
        setBotStatus('offline');
      }
    } catch (e) {
      setBotConnected(false);
      setBotStatus('offline');
    }
  };

  const syncGroupsToBot = async () => {
    if (!botConnected) {
      toast.error('Bot-Server nicht erreichbar');
      return;
    }
    try {
      const groupsForBot = groups.map(g => ({
        url: g.url,
        name: g.name,
        type: g.type
      }));
      await fetch(`${BOT_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupsForBot)
      });
      toast.success(`${groups.length} Gruppen an Bot übertragen`);
    } catch (e) {
      toast.error('Fehler beim Sync');
    }
  };

  const sendPostToBot = async (postText = null, comments = null) => {
    const content = postText || (composeMode === 'freetext' ? freeText : generatedPost);
    if (!content) {
      toast.error('Kein Post-Text vorhanden');
      return;
    }
    if (!botConnected) {
      toast.error('Bot-Server nicht erreichbar');
      return;
    }
    try {
      // Kommentare filtern (leere entfernen)
      const filteredComments = (comments || botComments).filter(c => c.trim().length > 0);
      await fetch(`${BOT_URL}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, comments: filteredComments })
      });
      setBotPost(content);
      const commentCount = filteredComments.length;
      toast.success(`Post${commentCount > 0 ? ` + ${commentCount} Kommentar(e)` : ''} an Bot übertragen`);
    } catch (e) {
      toast.error('Fehler beim Senden');
    }
  };

  const addBotComment = () => {
    setBotComments([...botComments, '']);
  };

  const updateBotComment = (index, value) => {
    const updated = [...botComments];
    updated[index] = value;
    setBotComments(updated);
  };

  const removeBotComment = (index) => {
    setBotComments(botComments.filter((_, i) => i !== index));
  };

  const startBot = async (dryRun = false) => {
    if (!botConnected) {
      toast.error('Bot-Server nicht erreichbar');
      return;
    }
    try {
      await fetch(`${BOT_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });
      setBotStatus('running');
      toast.success(dryRun ? 'Bot gestartet (Dry Run)' : 'Bot gestartet');
    } catch (e) {
      toast.error('Fehler beim Starten');
    }
  };

  const stopBot = async () => {
    try {
      await fetch(`${BOT_URL}/stop`, { method: 'POST' });
      setBotStatus('idle');
      toast.success('Bot gestoppt');
    } catch (e) {
      toast.error('Fehler beim Stoppen');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, templatesRes, postsRes, statsRes] = await Promise.all([
        adminAPI.getFacebookGroups(),
        adminAPI.getFacebookTemplates(),
        adminAPI.getFacebookPosts(),
        adminAPI.getFacebookStats()
      ]);
      setGroups(groupsRes.data);
      setTemplates(templatesRes.data);
      setSavedPosts(postsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      // Fallback auf leere Arrays wenn Backend noch nicht bereit
      setGroups([]);
      setTemplates([]);
      setSavedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ============ Groups ============
  const addGroup = async () => {
    if (!newGroup.name || !newGroup.url) {
      toast.error('Name und URL sind erforderlich');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAPI.createFacebookGroup(newGroup);
      setGroups([...groups, res.data]);
      setNewGroup({ name: '', url: '', type: 'external', members: 0, notes: '' });
      setShowAddGroup(false);
      toast.success('Gruppe hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const updateGroup = async () => {
    if (!editingGroup) return;
    setSaving(true);
    try {
      const res = await adminAPI.updateFacebookGroup(editingGroup.id, editingGroup);
      setGroups(groups.map(g => g.id === editingGroup.id ? res.data : g));
      setEditingGroup(null);
      toast.success('Gruppe aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm('Gruppe wirklich löschen?')) return;
    try {
      await adminAPI.deleteFacebookGroup(id);
      setGroups(groups.filter(g => g.id !== id));
      toast.success('Gruppe gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // ============ Templates ============
  const addTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Name und Inhalt sind erforderlich');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAPI.createFacebookTemplate(newTemplate);
      setTemplates([...templates, res.data]);
      setNewTemplate({ name: '', content: '', category: '' });
      setShowAddTemplate(false);
      toast.success('Vorlage erstellt');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const res = await adminAPI.updateFacebookTemplate(editingTemplate.id, editingTemplate);
      setTemplates(templates.map(t => t.id === editingTemplate.id ? res.data : t));
      setEditingTemplate(null);
      toast.success('Vorlage aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Vorlage wirklich löschen?')) return;
    try {
      await adminAPI.deleteFacebookTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Vorlage gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // ============ Posts ============
  const savePost = async () => {
    const content = composeMode === 'freetext' ? freeText : generatedPost;
    if (!content) {
      toast.error('Kein Inhalt zum Speichern');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAPI.createFacebookPost({
        title: postTitle || `Post vom ${new Date().toLocaleDateString('de-DE')}`,
        content,
        template_id: selectedTemplate?.id || null,
        variables: composeMode === 'template' ? postVariables : null,
        is_favorite: false
      });
      setSavedPosts([res.data, ...savedPosts]);
      toast.success('Post gespeichert');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async (post) => {
    try {
      const res = await adminAPI.updateFacebookPost(post.id, { is_favorite: !post.is_favorite });
      setSavedPosts(savedPosts.map(p => p.id === post.id ? res.data : p));
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Post wirklich löschen?')) return;
    try {
      await adminAPI.deleteFacebookPost(id);
      setSavedPosts(savedPosts.filter(p => p.id !== id));
      toast.success('Post gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const loadSavedPost = (post) => {
    setFreeText(post.content);
    setComposeMode('freetext');
    setActiveTab('compose');
    toast.success('Post geladen');
  };

  // ============ Post Generator ============
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
    setComposeMode('template');
  };

  const generatePost = () => {
    if (!selectedTemplate) return;
    let post = selectedTemplate.content;
    Object.entries(postVariables).forEach(([key, value]) => {
      post = post.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `[${key}]`);
    });
    setGeneratedPost(post);
  };

  const copyToClipboard = async (text) => {
    const content = text || (composeMode === 'freetext' ? freeText : generatedPost);
    if (!content) {
      toast.error('Kein Inhalt zum Kopieren');
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success('In Zwischenablage kopiert!');
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const openGroupAndCopy = async (group) => {
    const content = composeMode === 'freetext' ? freeText : generatedPost;
    await copyToClipboard(content);
    
    // Log erstellen
    try {
      await adminAPI.createFacebookLog({
        group_id: group.id,
        group_name: group.name,
        content,
        status: 'manual'
      });
    } catch (e) {
      // Ignorieren
    }
    
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
  const currentContent = composeMode === 'freetext' ? freeText : generatedPost;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
            <p className="text-gray-600">Posts erstellen, speichern und in Gruppen teilen</p>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total_groups}</p>
              <p className="text-gray-500">Gruppen</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.total_posts}</p>
              <p className="text-gray-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.total_posted}</p>
              <p className="text-gray-500">Gepostet</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'compose', label: 'Post erstellen', icon: PenLine },
          { id: 'saved', label: `Gespeicherte Posts (${savedPosts.length})`, icon: Save },
          { id: 'groups', label: `Gruppen (${groups.length})`, icon: Users },
          { id: 'templates', label: `Vorlagen (${templates.length})`, icon: FileText },
          { id: 'bot', label: 'Auto-Poster', icon: Bot, badge: botConnected ? (botStatus === 'running' ? '🟢' : '🔵') : '🔴' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge && <span className="text-xs">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'compose' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Linke Spalte: Post erstellen */}
          <div className="space-y-4">
            {/* Modus-Umschalter */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setComposeMode('freetext')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    composeMode === 'freetext'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Freitext
                </button>
                <button
                  onClick={() => setComposeMode('template')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    composeMode === 'template'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mit Vorlage
                </button>
              </div>

              {composeMode === 'freetext' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titel (optional, zum Speichern)
                    </label>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="input w-full"
                      placeholder="z.B. Hoteljob Bayern Sommer 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Post-Text
                    </label>
                    <textarea
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      rows={12}
                      className="input w-full"
                      placeholder={`🔥 JOBCHANCE: Servicekraft (m/w/d)

📍 Standort: München
💼 Vollzeit
💰 2.500€ brutto

Wir suchen motivierte Mitarbeiter für unser Hotel...

✅ Jetzt bewerben: https://www.jobon.work/jobs/...

#Job #Arbeit #Hotel #München`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Template Auswahl */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vorlage auswählen
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {templates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => selectTemplate(template)}
                          className={`p-2 rounded-lg border text-left text-sm transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <p className="font-medium truncate">{template.name}</p>
                        </button>
                      ))}
                      {templates.length === 0 && (
                        <p className="col-span-2 text-gray-500 text-sm text-center py-4">
                          Noch keine Vorlagen. Erstelle welche im "Vorlagen" Tab.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Variablen */}
                  {selectedTemplate && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium text-gray-700">
                        Variablen für: {selectedTemplate.name}
                      </p>
                      {Object.keys(postVariables).map(varName => (
                        <div key={varName}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {varName.replace(/_/g, ' ')}
                          </label>
                          <input
                            type="text"
                            value={postVariables[varName]}
                            onChange={(e) => setPostVariables({ ...postVariables, [varName]: e.target.value })}
                            className="input w-full text-sm"
                            placeholder={varName}
                          />
                        </div>
                      ))}
                      <button
                        onClick={generatePost}
                        className="btn-primary w-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Post generieren
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Aktionen */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => copyToClipboard()}
                  disabled={!currentContent}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Kopieren
                </button>
                <button
                  onClick={savePost}
                  disabled={!currentContent || saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </button>
              </div>
            </div>
          </div>

          {/* Rechte Spalte: Vorschau & Gruppen */}
          <div className="space-y-4">
            {/* Vorschau */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Vorschau</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap text-sm text-gray-700 border">
                {currentContent || <span className="text-gray-400 italic">Noch kein Inhalt...</span>}
              </div>
            </div>

            {/* Gruppen zum Posten */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">In Gruppen posten</h3>
                <span className="text-sm text-gray-500">{selectedGroups.length} ausgewählt</span>
              </div>

              {groups.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Noch keine Gruppen. Füge welche im "Gruppen" Tab hinzu.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {groups.map(group => (
                    <div
                      key={group.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedGroups.includes(group.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleGroupSelection(group.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {group.type === 'own' && <Star className="h-3 w-3 text-yellow-500" />}
                          {group.members > 0 && <span>{group.members.toLocaleString()} Mitglieder</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openGroupAndCopy(group); }}
                        disabled={!currentContent}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                        title="Kopieren & Öffnen"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedGroups.length > 0 && currentContent && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-2">Schnell-Posten:</p>
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
          </div>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Gespeicherte Posts</h2>
          </div>

          {savedPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Noch keine Posts gespeichert. Erstelle einen im "Post erstellen" Tab.
            </p>
          ) : (
            <div className="space-y-3">
              {savedPosts.map(post => (
                <div key={post.id} className="border rounded-lg p-4 hover:border-gray-300 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{post.title || 'Unbenannter Post'}</h3>
                        {post.is_favorite && <Heart className="h-4 w-4 text-red-500 fill-red-500" />}
                        {post.times_used > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {post.times_used}x verwendet
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                        {post.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(post.created_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(post)}
                        className={`p-2 rounded hover:bg-gray-100 ${post.is_favorite ? 'text-red-500' : 'text-gray-400'}`}
                        title="Favorit"
                      >
                        <Heart className={`h-4 w-4 ${post.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(post.content)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Kopieren"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => loadSavedPost(post)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Laden & Bearbeiten"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="grid lg:grid-cols-2 gap-6">
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
                Noch keine eigenen Gruppen
              </p>
            ) : (
              <div className="space-y-2">
                {ownGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => deleteGroup(group.id)}
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
                Noch keine externen Gruppen
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {externalGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => deleteGroup(group.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Post-Vorlagen</h2>
            <button
              onClick={() => setShowAddTemplate(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Neue Vorlage
            </button>
          </div>

          {templates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Noch keine Vorlagen. Erstelle deine erste Vorlage!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div key={template.id} className="border rounded-lg p-4 hover:border-purple-300 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {template.category && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {template.category}
                    </span>
                  )}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-4 whitespace-pre-wrap">
                    {template.content}
                  </p>
                  <button
                    onClick={() => { selectTemplate(template); setActiveTab('compose'); }}
                    className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Vorlage verwenden →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bot Tab */}
      {activeTab === 'bot' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Linke Spalte: Bot-Steuerung */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className={`card border-2 ${
              botConnected 
                ? botStatus === 'running' ? 'border-green-400 bg-green-50' : 'border-blue-400 bg-blue-50'
                : 'border-red-400 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    botConnected ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Bot className={`h-8 w-8 ${botConnected ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Auto-Poster Bot</h2>
                    <p className={`text-sm ${botConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {botConnected ? `Status: ${botStatus}` : 'Server nicht erreichbar'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkBotStatus}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>

              {!botConnected && (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Bot-Server starten</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Öffne ein Terminal und führe aus:
                      </p>
                      <code className="block bg-gray-100 text-sm p-2 rounded mt-2 font-mono">
                        cd tools/facebook-bot && npm run server
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {botConnected && (
                <div className="space-y-3">
                  {/* Aktionen */}
                  <div className="flex gap-2">
                    <button
                      onClick={syncGroupsToBot}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Gruppen sync ({groups.length})
                    </button>
                    <button
                      onClick={sendPostToBot}
                      disabled={!currentContent}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      Post übertragen
                    </button>
                  </div>

                  {/* Start/Stop */}
                  <div className="flex gap-2">
                    {botStatus !== 'running' ? (
                      <>
                        <button
                          onClick={() => startBot(true)}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Test (Dry Run)
                        </button>
                        <button
                          onClick={() => startBot(false)}
                          className="btn-primary flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Posten starten
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={stopBot}
                        className="btn-primary flex-1 bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stoppen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Kommentare */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Kommentare unter dem Post
                </h3>
                <button
                  onClick={addBotComment}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Kommentar
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Diese Kommentare werden automatisch unter deinen Post geschrieben (für mehr Sichtbarkeit).
              </p>
              <div className="space-y-2">
                {botComments.map((comment, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={comment}
                      onChange={(e) => updateBotComment(index, e.target.value)}
                      className="input flex-1 text-sm"
                      rows={2}
                      placeholder={`Kommentar ${index + 1}, z.B. "👉 Mehr Infos: https://jobon.work"`}
                    />
                    {botComments.length > 1 && (
                      <button
                        onClick={() => removeBotComment(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {botComments.filter(c => c.trim()).length > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {botComments.filter(c => c.trim()).length} Kommentar(e) werden gepostet
                </p>
              )}
            </div>

            {/* Aktuelle Bot-Konfiguration */}
            {botPost && (
              <div className="card bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Aktuell im Bot:</h3>
                <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{botPost}</p>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Logs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-gray-400" />
                Bot-Logs
              </h3>
              {botStatus === 'running' && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <span className="animate-pulse">●</span> Läuft
                </span>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
              {botLogs.length === 0 ? (
                <p className="text-gray-500">Keine Logs vorhanden...</p>
              ) : (
                botLogs.map((log, i) => (
                  <div key={i} className={`py-0.5 ${
                    log.includes('ERROR') ? 'text-red-400' :
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('⏳') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
                onChange={(e) => setNewGroup({ ...newGroup, members: parseInt(e.target.value) || 0 })}
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
              <button onClick={addGroup} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Hinzufügen'}
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
              <button onClick={updateGroup} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Speichern'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <input
                type="text"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className="input w-full"
                placeholder="z.B. Hotel, Gastronomie, Pflege"
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
              <button onClick={addTemplate} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Erstellen'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <Modal onClose={() => setEditingTemplate(null)} title="Vorlage bearbeiten">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorlagenname</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <input
                type="text"
                value={editingTemplate.category || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt</label>
              <textarea
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                className="input w-full font-mono text-sm"
                rows={10}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingTemplate(null)} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={updateTemplate} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Group Card Component
function GroupCard({ group, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
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
