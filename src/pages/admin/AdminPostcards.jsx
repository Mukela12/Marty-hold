import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  CheckCircle,
  AlertTriangle,
  Truck,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Package,
  MapPin,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  User,
  Building2,
  Eye,
  MoreHorizontal,
  ArrowRight,
  Printer,
  Send,
  CheckCheck,
  AlertOctagon,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../../components/admin/MetricCard';
import { adminPostcardService } from '../../supabase/api/adminPostcardService';
import './AdminPostcards.css';

const AdminPostcards = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [problematicPostcards, setProblematicPostcards] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [eventFilter, setEventFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 24h, 7d, 30d, all

  useEffect(() => {
    loadData();

    const subscription = adminPostcardService.subscribeToPostcardEvents((event) => {
      toast.success(`New postcard event: ${event.event_type}`, {
        icon: getStatusIcon(event.event_type),
      });
      loadData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsResult, eventsResult, issuesResult] = await Promise.all([
        adminPostcardService.getDeliveryStats(),
        adminPostcardService.getPostcardEvents({ limit: 100 }),
        adminPostcardService.getProblematicPostcards({ limit: 50 }),
      ]);

      if (statsResult.success) setStats(statsResult.stats);
      if (eventsResult.success) setEvents(eventsResult.events);
      if (issuesResult.success) setProblematicPostcards(issuesResult.postcards);
    } catch (error) {
      toast.error('Failed to load postcard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const iconProps = { className: 'status-icon', size: 18 };
    switch (status) {
      case 'created':
        return <Package {...iconProps} />;
      case 'ready':
        return <CheckCircle {...iconProps} />;
      case 'printing':
        return <Printer {...iconProps} />;
      case 'processed_for_delivery':
        return <Send {...iconProps} />;
      case 'in_transit':
        return <Truck {...iconProps} />;
      case 'delivered':
        return <CheckCheck {...iconProps} />;
      case 'returned':
        return <AlertTriangle {...iconProps} />;
      case 'cancelled':
        return <XCircle {...iconProps} />;
      default:
        return <Mail {...iconProps} />;
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      created: { color: 'blue', label: 'Created', bg: '#EBF5FF', text: '#1E40AF' },
      ready: { color: 'cyan', label: 'Ready', bg: '#E0F7FA', text: '#0E7490' },
      printing: { color: 'yellow', label: 'Printing', bg: '#FEF3C7', text: '#92400E' },
      processed_for_delivery: { color: 'indigo', label: 'Processed', bg: '#E0E7FF', text: '#3730A3' },
      in_transit: { color: 'purple', label: 'In Transit', bg: '#EDE9FE', text: '#6D28D9' },
      delivered: { color: 'green', label: 'Delivered', bg: '#D1FAE5', text: '#065F46' },
      returned: { color: 'orange', label: 'Returned', bg: '#FFEDD5', text: '#C2410C' },
      cancelled: { color: 'red', label: 'Cancelled', bg: '#FEE2E2', text: '#991B1B' },
    };
    return configs[status] || { color: 'gray', label: status, bg: '#F3F4F6', text: '#374151' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventFilter !== 'all' && event.event_type !== eventFilter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          event.postgrid_postcard_id?.toLowerCase().includes(searchLower) ||
          event.campaigns?.campaign_name?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [events, eventFilter, searchTerm]);

  // Calculate pipeline percentages
  const pipelineData = useMemo(() => {
    if (!stats) return [];
    const total = stats.total || 1;
    return [
      { stage: 'Created', count: stats.created || 0, percent: ((stats.created || 0) / total * 100).toFixed(0), color: '#3B82F6' },
      { stage: 'Printing', count: stats.printing || 0, percent: ((stats.printing || 0) / total * 100).toFixed(0), color: '#F59E0B' },
      { stage: 'In Transit', count: stats.in_transit || 0, percent: ((stats.in_transit || 0) / total * 100).toFixed(0), color: '#8B5CF6' },
      { stage: 'Delivered', count: stats.delivered || 0, percent: ((stats.delivered || 0) / total * 100).toFixed(0), color: '#10B981' },
    ];
  }, [stats]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'events', label: 'Event Log', icon: Activity },
    { id: 'issues', label: 'Issues', icon: AlertOctagon, badge: problematicPostcards.length },
  ];

  return (
    <div className="admin-postcards-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-title">
            <Mail className="page-header-icon" size={28} />
            <div>
              <h1>Postcard Tracking</h1>
              <p>Monitor delivery status and manage issues in real-time</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="refresh-btn"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <MetricCard
          title="Total Sent"
          value={stats?.total || 0}
          icon={Send}
          color="primary"
          loading={loading}
        />
        <MetricCard
          title="Delivered"
          value={stats?.delivered || 0}
          icon={CheckCheck}
          color="success"
          loading={loading}
          subtitle={stats ? `${stats.deliveryRate}% delivery rate` : null}
        />
        <MetricCard
          title="In Transit"
          value={stats?.inTransitCount || 0}
          icon={Truck}
          color="info"
          loading={loading}
        />
        <MetricCard
          title="Needs Attention"
          value={(stats?.returned || 0) + (stats?.cancelled || 0)}
          icon={AlertTriangle}
          color="warning"
          loading={loading}
          subtitle={stats ? `${stats.returnRate}% return rate` : null}
        />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`tab-btn ${selectedTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="tab-badge">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tab-content"
          >
            <div className="overview-grid">
              {/* Delivery Pipeline */}
              <div className="card pipeline-card">
                <div className="card-header">
                  <h3>Delivery Pipeline</h3>
                  <span className="card-subtitle">Current postcard distribution</span>
                </div>
                <div className="pipeline-visual">
                  {pipelineData.map((stage, index) => (
                    <React.Fragment key={stage.stage}>
                      <div className="pipeline-stage">
                        <div
                          className="pipeline-circle"
                          style={{ backgroundColor: stage.color }}
                        >
                          <span className="pipeline-count">{stage.count}</span>
                        </div>
                        <span className="pipeline-label">{stage.stage}</span>
                        <span className="pipeline-percent">{stage.percent}%</span>
                      </div>
                      {index < pipelineData.length - 1 && (
                        <div className="pipeline-connector">
                          <ArrowRight size={20} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="pipeline-bar">
                  {pipelineData.map((stage, index) => (
                    <div
                      key={stage.stage}
                      className="pipeline-bar-segment"
                      style={{
                        width: `${stage.percent}%`,
                        backgroundColor: stage.color,
                        minWidth: stage.count > 0 ? '20px' : '0'
                      }}
                      title={`${stage.stage}: ${stage.count}`}
                    />
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card activity-card">
                <div className="card-header">
                  <h3>Recent Activity</h3>
                  <button
                    className="see-all-btn"
                    onClick={() => setSelectedTab('events')}
                  >
                    See all <ChevronRight size={16} />
                  </button>
                </div>
                <div className="activity-list">
                  {events.slice(0, 8).map((event) => {
                    const config = getStatusConfig(event.event_type);
                    return (
                      <div key={event.id} className="activity-item">
                        <div
                          className="activity-icon"
                          style={{ backgroundColor: config.bg, color: config.text }}
                        >
                          {getStatusIcon(event.event_type)}
                        </div>
                        <div className="activity-content">
                          <p className="activity-title">
                            Postcard <span className="activity-status">{config.label}</span>
                          </p>
                          <p className="activity-subtitle">
                            {event.campaigns?.campaign_name || 'Unknown Campaign'}
                          </p>
                        </div>
                        <span className="activity-time">{formatDate(event.created_at)}</span>
                      </div>
                    );
                  })}
                  {events.length === 0 && !loading && (
                    <div className="empty-state">
                      <Activity size={32} />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="card stats-breakdown-card">
                <div className="card-header">
                  <h3>Status Breakdown</h3>
                </div>
                <div className="status-breakdown">
                  {[
                    { label: 'Created', value: stats?.created || 0, color: '#3B82F6' },
                    { label: 'Ready', value: stats?.ready || 0, color: '#06B6D4' },
                    { label: 'Printing', value: stats?.printing || 0, color: '#F59E0B' },
                    { label: 'In Transit', value: stats?.in_transit || 0, color: '#8B5CF6' },
                    { label: 'Delivered', value: stats?.delivered || 0, color: '#10B981' },
                    { label: 'Returned', value: stats?.returned || 0, color: '#F97316' },
                    { label: 'Cancelled', value: stats?.cancelled || 0, color: '#EF4444' },
                  ].map((item) => (
                    <div key={item.label} className="status-row">
                      <div className="status-row-left">
                        <span
                          className="status-dot"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="status-label">{item.label}</span>
                      </div>
                      <span className="status-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'events' && (
          <motion.div
            key="events"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tab-content"
          >
            <div className="card events-card">
              {/* Filters */}
              <div className="events-filters">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by postcard ID or campaign..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <Filter size={16} />
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                  >
                    <option value="all">All Events</option>
                    <option value="created">Created</option>
                    <option value="printing">Printing</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Events List */}
              <div className="events-list">
                {filteredEvents.map((event) => {
                  const config = getStatusConfig(event.event_type);
                  const isExpanded = expandedEvent === event.id;

                  return (
                    <div
                      key={event.id}
                      className={`event-item ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div
                        className="event-row"
                        onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      >
                        <div
                          className="event-status-icon"
                          style={{ backgroundColor: config.bg, color: config.text }}
                        >
                          {getStatusIcon(event.event_type)}
                        </div>
                        <div className="event-main">
                          <div className="event-header">
                            <code className="event-id">{event.postgrid_postcard_id}</code>
                            <span
                              className="event-badge"
                              style={{ backgroundColor: config.bg, color: config.text }}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="event-campaign">
                            {event.campaigns?.campaign_name || 'Unknown Campaign'}
                          </p>
                        </div>
                        <span className="event-time">{formatFullDate(event.created_at)}</span>
                        <ChevronDown
                          className={`event-chevron ${isExpanded ? 'rotated' : ''}`}
                          size={18}
                        />
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="event-details"
                          >
                            <div className="event-details-grid">
                              <div className="event-detail">
                                <span className="detail-label">Campaign ID</span>
                                <span className="detail-value">{event.campaign_id || 'N/A'}</span>
                              </div>
                              <div className="event-detail">
                                <span className="detail-label">New Mover ID</span>
                                <span className="detail-value">{event.new_mover_id || 'N/A'}</span>
                              </div>
                              {event.event_data?.carrierTracking && (
                                <div className="event-detail">
                                  <span className="detail-label">Tracking Number</span>
                                  <span className="detail-value tracking">
                                    {event.event_data.carrierTracking}
                                  </span>
                                </div>
                              )}
                              {event.event_data?.sendDate && (
                                <div className="event-detail">
                                  <span className="detail-label">Send Date</span>
                                  <span className="detail-value">
                                    {formatFullDate(event.event_data.sendDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {event.campaign_id && (
                              <button
                                className="view-campaign-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/campaigns/${event.campaign_id}`);
                                }}
                              >
                                <Eye size={16} />
                                View Campaign
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {filteredEvents.length === 0 && !loading && (
                  <div className="empty-state large">
                    <Mail size={48} />
                    <h4>No events found</h4>
                    <p>No postcard events match your search criteria</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'issues' && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tab-content"
          >
            {problematicPostcards.length > 0 && (
              <div className="issues-alert">
                <AlertTriangle size={20} />
                <span>
                  <strong>{problematicPostcards.length}</strong> postcards need your attention
                </span>
              </div>
            )}

            <div className="card issues-card">
              <div className="issues-list">
                {problematicPostcards.map((postcard) => {
                  const config = getStatusConfig(postcard.event_type);

                  return (
                    <div key={postcard.id} className="issue-item">
                      <div className="issue-header">
                        <div
                          className="issue-status-icon"
                          style={{ backgroundColor: config.bg, color: config.text }}
                        >
                          {getStatusIcon(postcard.event_type)}
                        </div>
                        <div className="issue-main">
                          <div className="issue-title-row">
                            <code className="issue-id">{postcard.postgrid_postcard_id}</code>
                            <span
                              className="issue-badge"
                              style={{ backgroundColor: config.bg, color: config.text }}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="issue-campaign">
                            <Building2 size={14} />
                            {postcard.campaigns?.campaign_name || 'Unknown Campaign'}
                          </p>
                          {postcard.user && (
                            <p className="issue-user">
                              <User size={14} />
                              {postcard.user.full_name} ({postcard.user.email})
                            </p>
                          )}
                          <p className="issue-time">
                            <Clock size={14} />
                            {formatFullDate(postcard.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="issue-actions">
                        <button className="issue-action-btn primary">
                          <Eye size={16} />
                          Review
                        </button>
                        <button className="issue-action-btn secondary">
                          <Mail size={16} />
                          Contact User
                        </button>
                        <button className="issue-action-btn secondary">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {problematicPostcards.length === 0 && !loading && (
                  <div className="empty-state success large">
                    <CheckCircle size={56} />
                    <h4>All Clear!</h4>
                    <p>No postcard issues to report. All deliveries are on track.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPostcards;
