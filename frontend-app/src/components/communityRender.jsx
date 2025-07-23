import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, UserMinus, ArrowRight, Hand, ZoomIn, ZoomOut, Crosshair, Trash2, Users } from 'lucide-react';
import toast from "react-hot-toast";

const COMMUNITY_SERVICE_URL = import.meta.env.VITE_COMMUNITY_SERVICE;
const FRONTEND_URL = import.meta.env.VITE_FRONTEND;

const BASE_NODE_RADIUS = 30;
const BASE_LEADER_RADIUS = 45;
const CHAR_WIDTH = 10; // Approximate width per character for sizing
const MIN_NODE_RADIUS = 30;
const MIN_LEADER_RADIUS = 45;

export default function CommunityRender({ leaderNode, communityName, currentUsername }) {
  const [nodes, setNodes] = useState([]); // {id, x, y, label, username, isLeader, isYou}
  const [activeTool, setActiveTool] = useState(null); // 'hand' | 'arrow' | null
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [arrows, setArrows] = useState([]); // {from, to}
  const [arrowDraft, setArrowDraft] = useState(null); // {fromNode, toX, toY}
  const [arrowConfirm, setArrowConfirm] = useState(null); // {from, to}
  const [creatingRelation, setCreatingRelation] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [profileModal, setProfileModal] = useState({ open: false, loading: false, error: null, data: null });
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, node: null });
  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState({ open: false, node: null });
  const [showMembers, setShowMembers] = useState(false);
  const [membersData, setMembersData] = useState({ loading: false, error: null, leader: null, members: [] });
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState({ open: false, member: null });

  // Render full tree from backend data
  useEffect(() => {
    if (leaderNode && leaderNode.nodes && leaderNode.relationships) {
      // Build a tree structure from relationships
      const nodeMap = {};
      leaderNode.nodes.forEach(n => {
        nodeMap[n.username] = { ...n, children: [] };
      });
      // Build parent-child links
      leaderNode.relationships.forEach(rel => {
        if (nodeMap[rel.from] && nodeMap[rel.to]) {
          nodeMap[rel.to].parent = rel.from;
          nodeMap[rel.from].children.push(nodeMap[rel.to]);
        }
      });
      // Find the root (leader)
      const root = nodeMap[leaderNode.leader.username];
      // Recursively assign positions
      const minLevelDist = 250;
      const minSiblingDist = 250;
      let nextX = 0;
      function assignPositions(node, depth) {
        node.y = 100 + depth * minLevelDist;
        if (node.children.length === 0) {
          node.x = nextX;
          nextX += minSiblingDist;
        } else {
          node.children.forEach(child => assignPositions(child, depth + 1));
          // Center parent above its children
          const first = node.children[0];
          const last = node.children[node.children.length - 1];
          node.x = (first.x + last.x) / 2;
        }
      }
      assignPositions(root, 0);
      // Center the tree horizontally
      const allNodes = Object.values(nodeMap);
      const minX = Math.min(...allNodes.map(n => n.x));
      const maxX = Math.max(...allNodes.map(n => n.x));
      const centerX = 600; // SVG center
      const offsetX = centerX - (minX + maxX) / 2;
      allNodes.forEach(n => { n.x += offsetX; });
      // Prepare nodes array for rendering
      const nodesArr = allNodes.map(n => {
        const isLeader = n.username === leaderNode.leader.username;
        const isYou = n.username === currentUsername && !isLeader;
        return {
          id: n.username,
          x: n.x,
          y: n.y,
          label: isYou ? 'you' : (n.name || n.username),
          username: n.username,
          isLeader,
          isYou,
        };
      });
      setNodes(nodesArr);
      setArrows(leaderNode.relationships.map(r => ({ from: r.from, to: r.to })));
    } else {
      setNodes([]);
      setArrows([]);
    }
  }, [leaderNode, communityName, currentUsername]);

  // Add a node labeled 'you' at a default position
  const handleAddNode = () => {
    if (hasUserNode) {
      toast.error("You already have a node in the tree.");
      return;
    }
    setNodes([
      ...nodes,
      { id: currentUsername, x: 200, y: 350, label: 'you', username: currentUsername, isYou: true }
    ]);
  };

  // Remove the 'you' node
  const handleRemoveNode = () => {
    setShowRemoveConfirm(true);
  };

  // Toggle hand tool
  const handleHandTool = () => {
    setActiveTool(activeTool === 'hand' ? null : 'hand');
    setArrowDraft(null);
  };

  // Arrow tool
  const handleArrowTool = () => {
    setActiveTool(activeTool === 'arrow' ? null : 'arrow');
    setArrowDraft(null);
  };

  // Zoom in/out
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));

  // Recenter view handler
  const handleRecenter = () => {
    if (nodes.length === 0) return;
    // Calculate bounding box of all nodes
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // SVG center
    const svgCenterX = 600;
    const svgCenterY = 400;
    setPan({ x: svgCenterX - centerX, y: svgCenterY - centerY });
  };

  // Mouse/touch events for panning
  const handlePointerDown = (e) => {
    if (activeTool === 'hand') {
      setDragging(true);
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStart.current = { x: clientX, y: clientY };
      panStart.current = { ...pan };
    }
  };

  const handlePointerMove = (e) => {
    if (activeTool === 'hand' && dragging) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    }
    if (activeTool === 'arrow' && arrowDraft) {
      const svg = e.target.ownerSVGElement || e.target;
      const pt = svg.createSVGPoint();
      pt.x = e.touches ? e.touches[0].clientX : e.clientX;
      pt.y = e.touches ? e.touches[0].clientY : e.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transformed = pt.matrixTransform(ctm.inverse());
        setArrowDraft({ ...arrowDraft, toX: transformed.x - pan.x, toY: transformed.y - pan.y });
      }
    }
  };

  const handlePointerUp = () => {
    if (activeTool === 'hand') {
      setDragging(false);
    }
    if (activeTool === 'arrow') {
      setArrowDraft(null);
    }
  };

  // Calculate adaptive radius for a node based on label length
  const getNodeRadius = (node) => {
    const base = node.isLeader ? BASE_LEADER_RADIUS : BASE_NODE_RADIUS;
    const min = node.isLeader ? MIN_LEADER_RADIUS : MIN_NODE_RADIUS;
    // Estimate: 1 char = CHAR_WIDTH px, add padding
    const est = Math.max(min, base, node.label.length * CHAR_WIDTH * 0.6);
    return est;
  };

  // Arrow tool logic
  const handleNodePointerDown = (node, e) => {
    if (activeTool !== 'arrow') return;
    // Only allow starting from 'you' or connecting to 'you'
    if (node.label !== 'you' && !nodes.some(n => n.label === 'you')) return;
    setArrowDraft({ fromNode: node, toX: node.x, toY: node.y });
    e.stopPropagation();
  };

  const handleNodePointerUp = (node, e) => {
    if (activeTool !== 'arrow' || !arrowDraft) return;
    const from = arrowDraft.fromNode;
    const to = node;
    // Only allow if one of the nodes is 'you' and not the same node
    if (
      (from.label === 'you' || to.label === 'you') &&
      from.id !== to.id
    ) {
      setArrowDraft(null);
      setArrowConfirm({ from, to });
    } else {
      setArrowDraft(null);
    }
    e.stopPropagation();
  };

  // Create CHILD_OF relationship in backend
  const confirmArrow = async () => {
    setCreatingRelation(true);
    try {
      const fromUsername = arrowConfirm.from.username;
      const toUsername = arrowConfirm.to.username;
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/create-child-of`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community: communityName,
          from: fromUsername,
          to: toUsername
        })
      });
      if (res.ok) {
        setArrows([...arrows, { from: arrowConfirm.from.id, to: arrowConfirm.to.id }]);
      } else {
        // Optionally show error
      }
    } catch {
      // Optionally show error
    }
    setArrowConfirm(null);
    setCreatingRelation(false);
  };
  const cancelArrow = () => setArrowConfirm(null);

  // Confirm remove node
  const confirmRemoveNode = async () => {
    // Query backend to delete CHILD_OF relationships from or to this node
    try {
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/delete-user-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community: communityName,
          username: currentUsername
        })
      });
      if (res.ok) {
        toast.success("Your node and its relationships have been deleted.");
        // Remove node and related arrows from local state
        setNodes(nodes.filter(node => node.username !== currentUsername));
        setArrows(arrows.filter(a => a.from !== currentUsername && a.to !== currentUsername));
      } else {
        toast.error("Failed to delete your node.");
      }
    } catch {
      toast.error("Failed to delete your node.");
    }
    setShowRemoveConfirm(false);
  };

  const cancelRemoveNode = () => setShowRemoveConfirm(false);

  // Handler to open profile modal
  const handleNodeClick = async (node) => {
    setProfileModal({ open: true, loading: true, error: null, data: null });
    try {
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/get-user-details?username=${encodeURIComponent(node.username)}`);
      if (res.ok) {
        const data = await res.json();
        setProfileModal({ open: true, loading: false, error: null, data });
      } else {
        setProfileModal({ open: true, loading: false, error: 'Failed to load profile', data: null });
      }
    } catch {
      setProfileModal({ open: true, loading: false, error: 'Failed to load profile', data: null });
    }
  };
  const closeProfileModal = () => setProfileModal({ open: false, loading: false, error: null, data: null });

  // Handler for right-click on node (leader only, not on self)
  const handleNodeContextMenu = (node, e) => {
    if (isLeader && node.username !== leaderNode.leader.username) {
      e.preventDefault();
      setContextMenu({ open: true, x: e.clientX, y: e.clientY, node });
    }
  };
  const closeContextMenu = () => setContextMenu({ open: false, x: 0, y: 0, node: null });

  // Handler for delete node from context menu
  const handleDeleteNodeOption = () => {
    setDeleteNodeConfirm({ open: true, node: contextMenu.node });
    closeContextMenu();
  };
  const closeDeleteNodeConfirm = () => setDeleteNodeConfirm({ open: false, node: null });

  // Confirm delete node (leader action)
  const confirmDeleteNode = async () => {
    const node = deleteNodeConfirm.node;
    if (!node) return;
    try {
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/delete-user-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community: communityName,
          username: node.username
        }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success("Node and its relationships deleted.");
        setNodes(nodes.filter(n => n.username !== node.username));
        setArrows(arrows.filter(a => a.from !== node.username && a.to !== node.username));
      } else {
        toast.error("Failed to delete node.");
      }
    } catch {
      toast.error("Failed to delete node.");
    }
    closeDeleteNodeConfirm();
  };

  // Show Members handler
  const handleShowMembers = async () => {
    setShowMembers(true);
    setMembersData({ loading: true, error: null, leader: null, members: [] });
    try {
      const res = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/members?community=${encodeURIComponent(communityName)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMembersData({ loading: false, error: null, leader: data.leader, members: data.members });
      } else {
        setMembersData({ loading: false, error: 'Failed to load members', leader: null, members: [] });
      }
    } catch {
      setMembersData({ loading: false, error: 'Failed to load members', leader: null, members: [] });
    }
  };
  const closeShowMembers = () => setShowMembers(false);

  // Remove member logic (leader only)
  const handleRemoveMember = (member) => setRemoveMemberConfirm({ open: true, member });
  const closeRemoveMemberConfirm = () => setRemoveMemberConfirm({ open: false, member: null });
  const confirmRemoveMember = async () => {
    const member = removeMemberConfirm.member;
    if (!member) return;
    try {
      // Remove MEMBER_OF relationship
      const res1 = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community: communityName, username: member.username }),
        credentials: "include"
      });
      // Remove CHILD_OF relationships from or to this node in the tree
      const res2 = await fetch(`${COMMUNITY_SERVICE_URL}/api/community/delete-user-node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community: communityName, username: member.username }),
        credentials: "include"
      });
      if (res1.ok && res2.ok) {
        toast.success("Member removed from community and tree.");
        setMembersData(m => ({ ...m, members: m.members.filter(u => u.username !== member.username) }));
        setNodes(nodes => nodes.filter(n => n.username !== member.username));
        setArrows(arrows => arrows.filter(a => a.from !== member.username && a.to !== member.username));
      } else {
        toast.error("Failed to remove member.");
      }
    } catch {
      toast.error("Failed to remove member.");
    }
    closeRemoveMemberConfirm();
  };

  // Cursor style for arrow tool
  const svgCursor = activeTool === 'arrow' ? 'crosshair' : (activeTool === 'hand' ? (dragging ? 'grabbing' : 'grab') : 'default');

  // Check if current user is the leader
  const isLeader = leaderNode && leaderNode.leader && currentUsername && leaderNode.leader.username === currentUsername;
  // Check if current user already has a node in the tree
  const hasUserNode = nodes.some(node => node.username === currentUsername);

  return (
    <div className="w-full h-full flex flex-col items-center min-h-[60vh] h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 md:gap-4 p-2 md:p-4 bg-white/80 rounded-xl shadow-lg border border-gray-200 mt-2 mb-2 md:mb-4 sticky top-0 z-10 animate-fade-in-toolbar">
        {/* Add your node button: always visible, always enabled, but shows error if user already has a node */}
        <button
          className={`transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent ${activeTool === null ? 'bg-blue-500 text-white' : 'bg-white text-blue-700'}`}
          onClick={handleAddNode}
        >
          <UserPlus className="w-5 h-5" /> Add your node
        </button>
        {/* Remove your node button: hidden for leader, visible for others */}
        {!isLeader && (
          <button
            className={`transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-red-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 ${activeTool === null ? 'bg-red-500 text-white' : 'bg-white text-red-700'}`}
            onClick={handleRemoveNode}
          >
            <UserMinus className="w-5 h-5" /> Remove your node
          </button>
        )}
        <button
          className={`transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-violet-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 ${activeTool === 'arrow' ? 'bg-violet-500 text-white ring-2 ring-violet-400' : 'bg-white text-violet-700'}`}
          onClick={handleArrowTool}
          title="Arrow tool (create relationship)"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          className={`transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-gray-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400 ${activeTool === 'hand' ? 'bg-gray-800 text-white ring-2 ring-gray-400' : 'bg-white text-gray-700'}`}
          onClick={handleHandTool}
          title="Hand tool (move view)"
        >
          <Hand className="w-5 h-5" />
        </button>
        <button
          className="transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-green-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-green-700"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          className="transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-yellow-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-yellow-700"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          className={`transition-all flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm md:text-base shadow-sm border border-transparent hover:bg-cyan-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white text-cyan-700`}
          onClick={handleRecenter}
          title="Recenter view"
        >
          <Crosshair className="w-5 h-5" /> Recenter View
        </button>
      </div>
      {/* Drawing area */}
      <div
        className="flex-1 w-full flex justify-center items-start"
        style={{ minHeight: '0', height: '100%', width: '100%' }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 1200 800`}
          className="border border-gray-300 rounded-2xl shadow-2xl transition-all duration-300"
          style={{ marginTop: '0', width: '100%', height: '60vh', touchAction: 'none', cursor: svgCursor }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {/* Dotted background pattern */}
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#d1d5db" />
            </pattern>
            {/* Leader node gradient */}
            <radialGradient id="leaderGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff6b6b" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
          </defs>
          <rect width="1200" height="800" fill="url(#dots)" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Render nodes first */}
            {nodes.map(node => {
              const radius = getNodeRadius(node);
              return (
                <g
                  key={node.id}
                  className="animate-fade-in-node"
                  onMouseDown={e => handleNodePointerDown(node, e)}
                  onMouseUp={e => handleNodePointerUp(node, e)}
                  onTouchStart={e => handleNodePointerDown(node, e)}
                  onTouchEnd={e => handleNodePointerUp(node, e)}
                  style={{ cursor: activeTool === 'arrow' ? 'pointer' : 'default' }}
                  onClick={e => { if (e.button === 0) handleNodeClick(node); }}
                  onContextMenu={e => handleNodeContextMenu(node, e)}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={node.isLeader ? 'url(#leaderGradient)' : (node.isYou ? '#0ea5e9' : '#4F46E5')}
                    stroke="#1E293B"
                    strokeWidth="2"
                    className="transition-all duration-300 shadow-xl hover:stroke-blue-400"
                  />
                  <text
                    x={node.x}
                    y={node.y + 8}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={node.isLeader ? '20' : '18'}
                    fontWeight={node.isLeader ? 'bold' : 'normal'}
                    fontFamily="Inter, Arial, sans-serif"
                    className="pointer-events-none select-none drop-shadow-md"
                    style={{
                      textShadow: node.isLeader ? '0 2px 8px rgba(0,0,0,0.18)' : undefined,
                      letterSpacing: node.isLeader ? '0.5px' : undefined,
                      filter: node.isLeader ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))' : undefined,
                      paintOrder: 'stroke fill',
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
            {/* Render arrows on top of nodes */}
            {arrows.map((arrow, idx) => {
              const fromNode = nodes.find(n => n.id === arrow.from);
              const toNode = nodes.find(n => n.id === arrow.to);
              if (!fromNode || !toNode) return null;
              const fromR = getNodeRadius(fromNode);
              const toR = getNodeRadius(toNode);
              // Calculate direction
              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const len = Math.sqrt(dx*dx + dy*dy);
              const ux = dx / len;
              const uy = dy / len;
              // Arrow start/end at edge of circles, with minimum arrow length
              const minArrowLength = 30;
              let startX = fromNode.x + ux * fromR;
              let startY = fromNode.y + uy * fromR;
              let endX = toNode.x - ux * toR;
              let endY = toNode.y - uy * toR;
              if (len < fromR + toR + minArrowLength) {
                const extra = (fromR + toR + minArrowLength - len) / 2;
                startX = fromNode.x + ux * (fromR - extra);
                startY = fromNode.y + uy * (fromR - extra);
                endX = toNode.x - ux * (toR - extra);
                endY = toNode.y - uy * (toR - extra);
              }
              // Arrowhead
              const arrowHeadSize = 12;
              const angle = Math.atan2(dy, dx);
              const arrowHead1 = [
                endX - arrowHeadSize * Math.cos(angle - Math.PI / 7),
                endY - arrowHeadSize * Math.sin(angle - Math.PI / 7)
              ];
              const arrowHead2 = [
                endX - arrowHeadSize * Math.cos(angle + Math.PI / 7),
                endY - arrowHeadSize * Math.sin(angle + Math.PI / 7)
              ];
              return (
                <g key={idx}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#111" strokeWidth="3.5" markerEnd="url(#arrowhead)" />
                  <polygon points={`${endX},${endY} ${arrowHead1[0]},${arrowHead1[1]} ${arrowHead2[0]},${arrowHead2[1]}`} fill="#111" />
                </g>
              );
            })}
            {/* Arrow draft (while dragging) */}
            {arrowDraft && (
              <line
                x1={arrowDraft.fromNode.x}
                y1={arrowDraft.fromNode.y}
                x2={arrowDraft.toX}
                y2={arrowDraft.toY}
                stroke="#111"
                strokeWidth="3.5"
                strokeDasharray="6 4"
              />
            )}
            {/* Arrowhead marker definition */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="#111" />
            </marker>
          </g>
        </svg>
        {/* Arrow confirmation popup */}
        {arrowConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-fade-in-toolbar">
              <div className="text-lg font-semibold text-gray-800 mb-2">Establish this connection?</div>
              <div className="flex gap-4">
                <button
                  className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-600 transition"
                  onClick={confirmArrow}
                  disabled={creatingRelation}
                >
                  Yes
                </button>
                <button
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow hover:bg-gray-400 transition"
                  onClick={cancelArrow}
                  disabled={creatingRelation}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Arrow tool instruction */}
      {activeTool === 'arrow' && (
        <div className="fixed left-0 right-0 bottom-4 flex justify-center z-40 pointer-events-none select-none">
          <div className="flex items-center gap-2 bg-white/90 border border-gray-200 rounded-full px-5 py-2 shadow-lg animate-fade-in-toolbar">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
            <span className="text-base md:text-lg font-medium text-gray-800">Tap a node and drag to another node to create a relationship</span>
          </div>
        </div>
      )}
      {/* Remove node confirmation popup */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="text-lg font-semibold text-gray-800 mb-2">Are you sure you want to delete your node?</div>
            <div className="flex gap-4">
              <button
                className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-600 transition"
                onClick={confirmRemoveNode}
              >
                Yes
              </button>
              <button
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow hover:bg-gray-400 transition"
                onClick={cancelRemoveNode}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Profile modal */}
      {profileModal.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[90vw] flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="w-full flex justify-between items-center mb-2">
              <div className="text-lg font-bold text-violet-700">User Profile</div>
              <button className="text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={closeProfileModal}>&times;</button>
            </div>
            {profileModal.loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : profileModal.error ? (
              <div className="text-red-500">{profileModal.error}</div>
            ) : profileModal.data ? (
              <div className="w-full flex flex-col gap-2">
                <div><span className="font-semibold">Name:</span> {profileModal.data.name || 'N/A'}</div>
                <div><span className="font-semibold">Email:</span> {profileModal.data.public_email || 'N/A'}</div>
                <div><span className="font-semibold">DOB:</span> {profileModal.data.dob || 'N/A'}</div>
                <div><span className="font-semibold">Age:</span> {profileModal.data.age || 'N/A'}</div>
                <div><span className="font-semibold">Phone:</span> {profileModal.data.phone || 'N/A'}</div>
                <div><span className="font-semibold">Gender:</span> {profileModal.data.gender || 'N/A'}</div>
                <div><span className="font-semibold">Location:</span> {profileModal.data.location || 'N/A'}</div>
                <div><span className="font-semibold">Bio:</span> {profileModal.data.bio || 'N/A'}</div>
                <div><span className="font-semibold">LinkedIn:</span> {profileModal.data.linkedin || 'N/A'}</div>
                <div><span className="font-semibold">GitHub:</span> {profileModal.data.github || 'N/A'}</div>
                <div><span className="font-semibold">Twitter:</span> {profileModal.data.twitter || 'N/A'}</div>
                <div><span className="font-semibold">Website:</span> {profileModal.data.website || 'N/A'}</div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Context menu for leader node deletion */}
      {contextMenu.open && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-2 px-4 text-sm font-medium text-gray-800"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={closeContextMenu}
        >
          <button
            className="w-full text-left py-1 px-2 hover:bg-red-100 text-red-600 font-semibold rounded"
            onClick={handleDeleteNodeOption}
          >
            Delete node
          </button>
        </div>
      )}
      {/* Delete node confirmation popup (leader) */}
      {deleteNodeConfirm.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="text-lg font-semibold text-gray-800 mb-2">Are you sure you want to remove this person from the tree?</div>
            <div className="flex gap-4">
              <button
                className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-600 transition"
                onClick={confirmDeleteNode}
              >
                Yes
              </button>
              <button
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow hover:bg-gray-400 transition"
                onClick={closeDeleteNodeConfirm}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Show Members button at bottom left */}
      <div className="absolute left-6 bottom-6 z-20">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold shadow hover:bg-violet-700 transition"
          onClick={handleShowMembers}
        >
          <Users className="w-5 h-5" /> Show Members
        </button>
      </div>
      {/* Members modal */}
      {showMembers && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[90vw] flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="w-full flex justify-between items-center mb-2">
              <div className="text-lg font-bold text-violet-700">Community Members</div>
              <button className="text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={closeShowMembers}>&times;</button>
            </div>
            {membersData.loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : membersData.error ? (
              <div className="text-red-500">{membersData.error}</div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <div className="font-semibold text-base mb-2">Leader</div>
                <div className="flex items-center gap-2 p-2 rounded bg-violet-100 font-bold text-violet-800">
                  <span>{membersData.leader?.name || membersData.leader?.username || 'Unknown'}</span>
                  <span className="text-xs text-violet-500 bg-violet-200 px-2 py-0.5 rounded-full">Leader</span>
                </div>
                <div className="font-semibold text-base mt-4 mb-2">Members</div>
                {membersData.members.length === 0 ? (
                  <div className="text-gray-400 italic">No members</div>
                ) : membersData.members.map(member => (
                  <div key={member.username} className="flex items-center gap-2 p-2 rounded bg-gray-100">
                    <span>{member.name || member.username}</span>
                    {isLeader && member.username !== membersData.leader?.username && (
                      <button
                        className="ml-auto text-red-500 hover:text-red-700 p-1 rounded-full"
                        title="Remove from community"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Remove member confirmation popup */}
      {removeMemberConfirm.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 animate-fade-in-toolbar">
            <div className="text-lg font-semibold text-gray-800 mb-2">Are you sure you want to remove this person from the community?</div>
            <div className="flex gap-4">
              <button
                className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-600 transition"
                onClick={confirmRemoveMember}
              >
                Yes
              </button>
              <button
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold shadow hover:bg-gray-400 transition"
                onClick={closeRemoveMemberConfirm}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .flex-1.w-full.flex.justify-center.items-start > svg {
            height: 40vh !important;
          }
        }
        .animate-fade-in-toolbar {
          animation: fade-in-toolbar 0.5s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fade-in-toolbar {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-node {
          animation: fade-in-node 0.4s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fade-in-node {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
} 