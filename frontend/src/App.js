import React, { useState, useEffect } from 'react';
import { User, Vote, FileText, ShoppingBag, MessageCircle, Shield, Settings, Home, Plus, ChevronRight, Crown, Users, Gavel, Clock, CheckCircle, X, AlertCircle, BarChart3, Calendar, Ban, Scale, UserCog, Lock, Bell, Network, Building2, MessageSquare, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
let socket;

const CyberEstadoUP = () => {
  // Estados principais
  const [activeSection, setActiveSection] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  // Estados de dados
  const [proposals, setProposals] = useState([]);
  const [events, setEvents] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Estados de UI
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Estados de formulário
  const [newProposal, setNewProposal] = useState({ 
    title: '', 
    description: '', 
    categoryId: '', 
    assemblyId: '',
    eventDate: '',
    systemChanges: {
      type: '',
      target: '',
      newValue: '',
      roleChanges: []
    }
  });

  const [discussion, setDiscussion] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [tcnupJustification, setTcnupJustification] = useState('');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Conectar WebSocket
  useEffect(() => {
    if (token) {
      socket = io('http://localhost:5000');
      
      socket.on('newProposal', (proposal) => {
        setProposals(prev => [proposal, ...prev]);
        addNotification('Nova proposta criada', 'info');
      });
      
      socket.on('voteUpdate', () => {
        fetchProposals();
      });
      
      socket.on('newEvent', (event) => {
        setEvents(prev => [...prev, event]);
      });

      socket.on('newDiscussionMessage', (message) => {
        if (selectedProposal?.id === message.proposal_id) {
          setDiscussion(prev => [...prev, message]);
        }
      });

      socket.on('tcnupDecision', (data) => {
        addNotification(`Decisão TCNUP: Proposta ${data.decision === 'approved' ? 'aprovada' : 'rejeitada'}`, 
                       data.decision === 'approved' ? 'success' : 'warning');
        fetchProposals();
      });
      
      return () => socket.disconnect();
    }
  }, [token]);

  // Carregar dados iniciais
  useEffect(() => {
    if (token) {
      fetchUserInfo();
      fetchAssemblies();
      fetchNotifications();
    }
  }, [token]);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
      is_read: false
    };
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // Funções de API
  const fetchUserInfo = async () => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: decoded.id,
        name: decoded.username,
        role: decoded.role,
        roleId: decoded.roleId
      });
      
      fetchProposals();
      fetchEvents();
      fetchNetworks();
      
      if (decoded.role === 'admin' || decoded.role === 'triunviro') {
        fetchRoles();
        fetchUsers();
      }
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      handleLogout();
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await fetch(`${API_URL}/assemblies`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setAssemblies(data.filter(a => a.can_access));
      }
    } catch (error) {
      console.error('Erro ao buscar assembleias:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await fetch(`${API_URL}/proposals`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      }
    } catch (error) {
      console.error('Erro ao buscar propostas:', error);
    }
  };

  const fetchCategories = async (assemblyId) => {
    try {
      const response = await fetch(`${API_URL}/assemblies/${assemblyId}/categories`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const fetchNetworks = async () => {
    try {
      const response = await fetch(`${API_URL}/assemblies/network`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setNetworks(data);
      }
    } catch (error) {
      console.error('Erro ao buscar rede UPense:', error);
    }
  };

  const fetchProposalDiscussion = async (proposalId) => {
    try {
      const response = await fetch(`${API_URL}/assemblies/proposals/${proposalId}/discussion`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setDiscussion(data);
        socket.emit('join', `proposal-${proposalId}`);
      }
    } catch (error) {
      console.error('Erro ao buscar discussão:', error);
    }
  };

// Adicione estas funções após as outras funções de fetch (por volta da linha 200)

const fetchEvents = async () => {
  try {
    const response = await fetch(`${API_URL}/events`, { headers: authHeaders });
    if (response.ok) {
      const data = await response.json();
      setEvents(data);
    }
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
  }
};

const fetchRoles = async () => {
  try {
    const response = await fetch(`${API_URL}/roles`, { headers: authHeaders });
    if (response.ok) {
      const data = await response.json();
      setRoles(data);
    }
  } catch (error) {
    console.error('Erro ao buscar roles:', error);
  }
};

const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`, { headers: authHeaders });
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
  }
};

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        alert('Credenciais inválidas');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao conectar com o servidor');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.reload();
  };

  const handleCreateProposal = async () => {
    if (!newProposal.assemblyId) {
      alert('Selecione uma assembleia');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/assemblies/${newProposal.assemblyId}/proposals`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newProposal)
      });

      if (response.ok) {
        setShowProposalForm(false);
        setNewProposal({ 
          title: '', 
          description: '', 
          categoryId: '', 
          assemblyId: '',
          eventDate: '',
          systemChanges: { type: '', target: '', newValue: '', roleChanges: [] }
        });
        fetchProposals();
        addNotification('Proposta criada com sucesso', 'success');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar proposta');
      }
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProposal) return;

    try {
      const response = await fetch(`${API_URL}/assemblies/proposals/${selectedProposal.id}/discussion`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: newMessage })
      });

      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleTcnupDecision = async (proposalId, decision) => {
    if (decision === 'rejected' && !tcnupJustification.trim()) {
      alert('Justificativa obrigatória para rejeição');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/assemblies/tcnup/decision/${proposalId}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ decision, justification: tcnupJustification })
      });

      if (response.ok) {
        setSelectedProposal(null);
        setTcnupJustification('');
        fetchProposals();
      }
    } catch (error) {
      console.error('Erro na decisão TCNUP:', error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: authHeaders
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? {...n, is_read: true} : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  };

  // Componentes UI
  const NotificationBell = () => (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 text-purple-400 hover:text-white transition-colors relative"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-black/90 border border-purple-500/30 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-purple-500/30">
            <h3 className="text-white font-semibold">Notificações</h3>
          </div>
          <div className="divide-y divide-purple-500/20">
            {notifications.length === 0 ? (
              <p className="p-4 text-purple-400 text-center">Sem notificações</p>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-purple-900/20 cursor-pointer ${
                    !notification.is_read ? 'bg-purple-900/10' : ''
                  }`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <p className="text-white text-sm">{notification.message}</p>
                  <p className="text-purple-400 text-xs mt-1">
                    {new Date(notification.timestamp).toLocaleString('pt-PT')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  const AssemblySelector = () => (
    <div className="mb-6">
      <label className="block text-purple-300 text-sm mb-3">Selecione a Assembleia</label>
      <div className="grid grid-cols-3 gap-4">
        {assemblies.map(assembly => (
          <button
            key={assembly.id}
            onClick={() => {
              setNewProposal({...newProposal, assemblyId: assembly.id, categoryId: ''});
              fetchCategories(assembly.id);
            }}
            className={`p-6 rounded-xl border-2 transition-all ${
              newProposal.assemblyId === assembly.id
                ? 'bg-purple-600/30 border-purple-400'
                : 'bg-black/30 border-purple-500/30 hover:border-purple-400/50'
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-purple-600/30 rounded-full flex items-center justify-center">
                {assembly.code === 'CU' && <Gavel className="w-8 h-8 text-purple-400" />}
                {assembly.code === 'CC' && <Users className="w-8 h-8 text-purple-400" />}
                {assembly.code === 'T' && <Crown className="w-8 h-8 text-purple-400" />}
              </div>
              <h4 className="text-white font-semibold">{assembly.name}</h4>
              <p className="text-purple-400 text-xs mt-1">{assembly.code}</p>
            </div>
          </button>
        ))}
      </div>
      {newProposal.assemblyId && (
        <p className="text-purple-300 text-sm mt-4">
          {assemblies.find(a => a.id === newProposal.assemblyId)?.description}
        </p>
      )}
    </div>
  );

  const CategorySelector = () => {
    if (!newProposal.assemblyId) return null;

    return (
      <div>
        <label className="block text-purple-300 text-sm mb-2">Categoria da Proposta</label>
        <select 
          className="w-full px-4 py-2 bg-black/50 border border-purple-500/50 rounded-lg text-white focus:outline-none focus:border-purple-400"
          value={newProposal.categoryId}
          onChange={(e) => setNewProposal({...newProposal, categoryId: parseInt(e.target.value)})}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map(cat => (
            <option 
              key={cat.id} 
              value={cat.id}
              disabled={cat.permission_type === 'grayed'}
              className={cat.permission_type === 'grayed' ? 'text-gray-500' : ''}
            >
              {cat.name} 
              {cat.permission_type === 'grayed' && ' (Sem permissão)'}
              {cat.requires_tcnup && ' (Requer TCNUP)'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const ProposalDiscussion = () => {
    if (!selectedProposal) return null;

    return (
      <div className="bg-black/30 p-6 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-purple-400" />
          Discussão e Comentários
        </h4>
        
        <div className="max-h-96 overflow-y-auto mb-4 space-y-3">
          {discussion.length === 0 ? (
            <p className="text-purple-400 text-center py-8">Seja o primeiro a comentar</p>
          ) : (
            discussion.map(msg => (
              <div key={msg.id} className={`p-3 rounded-lg ${
                msg.is_official ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-black/30'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{msg.display_name}</span>
                    <span className="text-purple-400 text-xs">{msg.role_name}</span>
                    {msg.is_official && (
                      <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">Oficial</span>
                    )}
                  </div>
                  <span className="text-purple-400 text-xs">
                    {new Date(msg.created_at).toLocaleString('pt-PT')}
                  </span>
                </div>
                <p className="text-purple-200">{msg.message}</p>
              </div>
            ))
          )}
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 bg-purple-900/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400"
            placeholder="Escreva sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    );
  };

  const NetworkCard = ({ network }) => {
    const getVisibilityIcon = (visibility) => {
      switch(visibility) {
        case 'public': return <Eye className="w-4 h-4" />;
        case 'private': return <Lock className="w-4 h-4" />;
        case 'secret': return <EyeOff className="w-4 h-4" />;
      }
    };

    const getVisibilityColor = (visibility) => {
      switch(visibility) {
        case 'public': return 'text-green-400';
        case 'private': return 'text-yellow-400';
        case 'secret': return 'text-red-400';
      }
    };

    return (
      <div 
        className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30 hover:bg-purple-900/40 transition-all cursor-pointer"
        onClick={() => setSelectedNetwork(network)}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            {network.icon_url ? (
              <img src={network.icon_url} alt={network.name} className="w-12 h-12 rounded-lg" />
            ) : (
              <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-purple-400" />
              </div>
            )}
            <div>
              <h3 className="text-white font-semibold">{network.name}</h3>
              <p className="text-purple-400 text-sm">{network.code}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 ${getVisibilityColor(network.visibility)}`}>
            {getVisibilityIcon(network.visibility)}
            <span className="text-xs capitalize">{network.visibility}</span>
          </div>
        </div>
        
        <p className="text-purple-300 text-sm mb-4">{network.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-purple-400 text-sm">{network.member_count} membros</span>
          {network.user_role && (
            <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">
              {network.user_role}
            </span>
          )}
        </div>
      </div>
    );
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'congressum', label: 'Congressum UPense', icon: Gavel },
    { id: 'calendario', label: 'Calendário', icon: Calendar },
    { id: 'rede-upense', label: 'Rede UPense', icon: Network },
    { id: 'administracao', label: 'Administração', icon: UserCog, restricted: true },
    { id: 'mercado', label: 'Mercado Interno', icon: ShoppingBag },
    { id: 'social', label: 'Rede Social', icon: MessageCircle },
    { id: 'legislacao', label: 'Legislação', icon: FileText },
    { id: 'ideias', label: 'Ideias Aprovadas', icon: CheckCircle },
    { id: 'fundos', label: 'Fundos e Impostos', icon: BarChart3 },
    { id: 'governo', label: 'Governo Executivo', icon: Settings, restricted: true },
    { id: 'seguranca', label: 'Segurança Interna', icon: Shield, restricted: true }
  ];

  // Renderização das seções
  const renderCongressum = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Congressum UPense</h2>
          <p className="text-purple-400 mt-1">Sistema de Assembleias Legislativas</p>
        </div>
        <button
          onClick={() => setShowProposalForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          disabled={user.role === 'elepos'}
        >
          <Plus className="w-5 h-5" />
          <span>Nova Proposta</span>
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {assemblies.map(assembly => {
          const assemblyProposals = proposals.filter(p => p.assembly_id === assembly.id);
          const activeVoting = assemblyProposals.filter(p => p.status === 'votacao').length;
          
          return (
            <div key={assembly.id} className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/30">
              <div className="flex items-center space-x-3 mb-2">
                {assembly.code === 'CU' && <Gavel className="w-5 h-5 text-purple-400" />}
                {assembly.code === 'CC' && <Users className="w-5 h-5 text-purple-400" />}
                {assembly.code === 'T' && <Crown className="w-5 h-5 text-purple-400" />}
                <h3 className="text-white font-semibold">{assembly.name}</h3>
              </div>
              <p className="text-purple-300 text-sm mb-3">{assembly.description}</p>
              <div className="space-y-1 text-sm">
                <p className="text-purple-400">Propostas totais: {assemblyProposals.length}</p>
                <p className="text-green-400">Em votação: {activeVoting}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-purple-900/20 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Filtrar por Assembleia:</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedAssembly(null)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                !selectedAssembly ? 'bg-purple-600 text-white' : 'bg-black/30 text-purple-400 hover:bg-purple-900/30'
              }`}
            >
              Todas
            </button>
            {assemblies.map(assembly => (
              <button
                key={assembly.id}
                onClick={() => setSelectedAssembly(assembly.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedAssembly === assembly.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-black/30 text-purple-400 hover:bg-purple-900/30'
                }`}
              >
                {assembly.code}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {proposals
          .filter(p => !selectedAssembly || p.assembly_id === selectedAssembly)
          .map(proposal => (
          <div key={proposal.id} className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30 hover:bg-purple-900/40 transition-colors cursor-pointer"
               onClick={() => {
                 setSelectedProposal(proposal);
                 fetchProposalDiscussion(proposal.id);
               }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{proposal.title}</h3>
                  <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">
                    {assemblies.find(a => a.id === proposal.assembly_id)?.code}
                  </span>
                </div>
                <p className="text-purple-300 mb-4">{proposal.description}</p>
                <div className="flex items-center space-x-6 text-sm">
                  <span className="text-purple-400">Autor: {proposal.author_name}</span>
                  <span className="text-purple-400">Data: {new Date(proposal.created_at).toLocaleDateString('pt-PT')}</span>
                  <span className="text-purple-400">{proposal.total_comments || 0} comentários</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    proposal.category_name === 'constituicao' ? 'bg-red-600/30 text-red-400' :
                    proposal.category_name === 'eventos' ? 'bg-purple-600/30 text-purple-400' :
                    'bg-blue-600/30 text-blue-400'
                  }`}>
                    {proposal.category_name}
                  </span>
                </div>
                {proposal.revision_of && (
                  <div className="mt-2 p-2 bg-yellow-900/20 rounded text-sm">
                    <p className="text-yellow-400">
                      <AlertCircle className="inline w-4 h-4 mr-1" />
                      Revisão de: {proposal.revision_of_title}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="ml-6 text-center">
                <div className={`px-3 py-1 rounded-full text-sm mb-3 ${
                  proposal.status === 'votacao' ? 'bg-green-600/30 text-green-400' :
                  proposal.status === 'aprovada' ? 'bg-blue-600/30 text-blue-400' :
                  proposal.status === 'revisao' ? 'bg-yellow-600/30 text-yellow-400' :
                  proposal.status === 'aguardando_tcnup' ? 'bg-orange-600/30 text-orange-400' :
                  'bg-yellow-600/30 text-yellow-400'
                }`}>
                  {proposal.status === 'votacao' ? 'Em Votação' : 
                   proposal.status === 'aprovada' ? 'Aprovada' :
                   proposal.status === 'revisao' ? 'Em Revisão' :
                   proposal.status === 'aguardando_tcnup' ? 'Aguardando TCNUP' :
                   'Em Discussão'}
                </div>
                {proposal.discussion_ends_at && proposal.status === 'discussao' && (
                  <p className="text-purple-400 text-xs">
                    Discussão até: {new Date(proposal.discussion_ends_at).toLocaleString('pt-PT')}
                  </p>
                )}
                {proposal.voting_ends_at && proposal.status === 'votacao' && (
                  <p className="text-purple-400 text-xs">
                    Votação até: {new Date(proposal.voting_ends_at).toLocaleString('pt-PT')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRedeUPense = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Rede UPense</h2>
          <p className="text-purple-400 mt-1">Sucursais e Projetos do Underground Politics</p>
        </div>
        {(user.role === 'admin' || user.role === 'triunviro') && (
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            <span>Nova Sucursal</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {networks.map(network => (
          <NetworkCard key={network.id} network={network} />
        ))}
        
        {(user.role === 'admin' || user.role === 'triunviro') && (
          <div className="bg-purple-900/20 p-6 rounded-xl border-2 border-dashed border-purple-500/30 hover:bg-purple-900/30 transition-all cursor-pointer flex items-center justify-center">
            <div className="text-center">
              <Plus className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <p className="text-purple-400">Criar Nova Sucursal</p>
            </div>
          </div>
        )}
      </div>
      
      {selectedNetwork && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900/90 p-8 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                {selectedNetwork.icon_url ? (
                  <img src={selectedNetwork.icon_url} alt={selectedNetwork.name} className="w-16 h-16 rounded-lg" />
                ) : (
                  <div className="w-16 h-16 bg-purple-600/30 rounded-lg flex items-center justify-center">
                    <Network className="w-8 h-8 text-purple-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedNetwork.name}</h3>
                  <p className="text-purple-400">{selectedNetwork.code} • {selectedNetwork.member_count} membros</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNetwork(null)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-black/30 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Sobre</h4>
              <p className="text-purple-300">{selectedNetwork.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-black/30 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">Membros Recentes</h4>
                <p className="text-purple-400 text-center py-8">Em desenvolvimento</p>
              </div>
              
              <div className="bg-black/30 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">Próximos Eventos</h4>
                <p className="text-purple-400 text-center py-8">Em desenvolvimento</p>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-4">
              {selectedNetwork.user_role ? (
                <button className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                  Acessar Dashboard
                </button>
              ) : (
                <button className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
                  Solicitar Acesso
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAdministracao = () => {
    if (user.role !== 'admin' && user.role !== 'triunviro') {
      return (
        <div className="bg-purple-900/30 p-8 rounded-xl border border-purple-500/30 text-center">
          <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Acesso Restrito</h2>
          <p className="text-purple-300">Você não tem permissão para acessar esta área</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Administração do Sistema</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-purple-400" />
              Gestão de Assembleias
            </h3>
            <div className="space-y-4">
              {assemblies.map(assembly => (
                <div key={assembly.id} className="bg-black/30 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-semibold">{assembly.name} ({assembly.code})</h4>
                    <button className="text-purple-400 hover:text-white">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-purple-300">
                    <p>Equação de voto: {JSON.stringify(assembly.voting_equation)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-purple-900/30 p-6 rounded-xl border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <UserCog className="w-5 h-5 mr-2 text-purple-400" />
              Permissões por Assembleia
            </h3>
            <p className="text-purple-400 text-center py-8">
              Sistema de configuração de permissões em desenvolvimento
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black flex items-center justify-center">
        <div className="bg-black/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-purple-500/30 w-96">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center relative">
              <Crown className="w-12 h-12 text-white" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Underground Politics</h1>
            <p className="text-purple-300">Cyber-Estado dos UPenses</p>
            <p className="text-purple-400 text-xs mt-2">SPQR • XXVII a.c.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-purple-300 text-sm mb-2">Nome de UPense</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-purple-900/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
                placeholder="Digite seu nome UPense"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-purple-300 text-sm mb-2">Senha</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-purple-900/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
                placeholder="Digite sua senha"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Entrar no Cyber-Estado
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-black">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-black/50 backdrop-blur-lg border-r border-purple-500/30">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center relative">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Cyber-Estado UP</h1>
                <p className="text-purple-400 text-xs">SPQR • Portugal</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isRestricted = item.restricted && 
                                   user.role !== 'triunviro' && 
                                   user.role !== 'tcnup' && 
                                   user.role !== 'admin';
                return (
                  <button
                    key={item.id}
                    onClick={() => !isRestricted && setActiveSection(item.id)}
                    disabled={isRestricted}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === item.id 
                        ? 'bg-purple-600/30 text-white' 
                        : isRestricted
                        ? 'text-purple-600 cursor-not-allowed opacity-50'
                        : 'text-purple-300 hover:bg-purple-900/30 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {isRestricted && <Shield className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-purple-400 text-sm capitalize">
                    {user.role === 'tcnup' ? 'TCNUP' : user.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="text-purple-400 hover:text-white transition-colors"
                  title="Sair"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {activeSection === 'congressum' && renderCongressum()}
            {activeSection === 'rede-upense' && renderRedeUPense()}
            {activeSection === 'administracao' && renderAdministracao()}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                <p className="text-purple-400">Bem-vindo ao Cyber-Estado dos UPenses</p>
              </div>
            )}
            {!['dashboard', 'congressum', 'rede-upense', 'administracao'].includes(activeSection) && (
              <div className="bg-purple-900/30 p-8 rounded-xl border border-purple-500/30 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {menuItems.find(item => item.id === activeSection)?.label}
                </h2>
                <p className="text-purple-300">Esta seção está em desenvolvimento</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal Nova Proposta */}
      {showProposalForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900/90 p-8 rounded-2xl border border-purple-500/30 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Criar Nova Proposta</h3>
              <button
                onClick={() => {
                  setShowProposalForm(false);
                  setNewProposal({ title: '', description: '', categoryId: '', assemblyId: '' });
                  setCategories([]);
                }}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <AssemblySelector />
              
              {newProposal.assemblyId && (
                <>
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">Título da Proposta</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-black/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
                      placeholder="Digite um título claro e objetivo"
                      value={newProposal.title}
                      onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">Descrição Detalhada</label>
                    <textarea
                      className="w-full px-4 py-2 bg-black/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:border-purple-400 h-32 resize-none"
                      placeholder="Descreva detalhadamente a proposta e seus objetivos"
                      value={newProposal.description}
                      onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                    />
                  </div>
                  
                  <CategorySelector />
                  
                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={handleCreateProposal}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                      disabled={!newProposal.title || !newProposal.description || !newProposal.categoryId}
                    >
                      Submeter ao {assemblies.find(a => a.id === newProposal.assemblyId)?.name}
                    </button>
                    <button
                      onClick={() => {
                        setShowProposalForm(false);
                        setNewProposal({ title: '', description: '', categoryId: '', assemblyId: '' });
                        setCategories([]);
                      }}
                      className="flex-1 py-3 bg-purple-900/50 hover:bg-purple-900/70 text-white font-semibold rounded-lg transition-colors border border-purple-500/50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Detalhes Proposta */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900/90 p-8 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedProposal.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-purple-400">
                  <span>Autor: {selectedProposal.author_name}</span>
                  <span>•</span>
                  <span>{assemblies.find(a => a.id === selectedProposal.assembly_id)?.name}</span>
                  <span>•</span>
                  <span>{new Date(selectedProposal.created_at).toLocaleDateString('pt-PT')}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProposal(null);
                  setDiscussion([]);
                  socket.emit('leave', `proposal-${selectedProposal.id}`);
                }}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-black/30 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Descrição da Proposta</h4>
              <p className="text-purple-300">{selectedProposal.description}</p>
              
              {selectedProposal.tcnup_justification && (
                <div className="mt-4 p-3 bg-yellow-900/30 rounded border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    <AlertCircle className="inline w-4 h-4 mr-1" />
                    Justificativa TCNUP: {selectedProposal.tcnup_justification}
                  </p>
                </div>
              )}
            </div>
            
            <ProposalDiscussion />
            
            {/* Ações TCNUP */}
            {selectedProposal.status === 'aguardando_tcnup' && user.role === 'tcnup' && (
              <div className="mt-6 space-y-4 border-t border-purple-500/30 pt-6">
                <h4 className="text-lg font-semibold text-white text-center">Decisão do TCNUP</h4>
                
                <div>
                  <label className="block text-purple-300 text-sm mb-2">
                    Justificativa (obrigatória para rejeição)
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-black/50 border border-purple-500/50 rounded-lg text-white placeholder-purple-400"
                    placeholder="Explique a decisão..."
                    value={tcnupJustification}
                    onChange={(e) => setTcnupJustification(e.target.value)}
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button 
                    onClick={() => handleTcnupDecision(selectedProposal.id, 'approved')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Aprovar para Votação
                  </button>
                  <button 
                    onClick={() => handleTcnupDecision(selectedProposal.id, 'rejected')}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Rejeitar (Enviar para Revisão)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberEstadoUP;