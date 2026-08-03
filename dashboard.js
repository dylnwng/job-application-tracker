const React = window.React;
const ReactDOM = window.ReactDOM;
const { DragDropContext, Droppable, Draggable } = window.ReactBeautifulDnd || {};

if (!React || !ReactDOM || !DragDropContext || !Droppable || !Draggable) {
  throw new Error('The dashboard libraries could not be loaded.');
}

(function () {
  const { useCallback, useEffect, useMemo, useState } = React;

  const statuses = [
    { key: 'Applied', className: 'applied' },
    { key: 'Online Assessment', className: 'assessment' },
    { key: 'First Round', className: 'interview' },
    { key: 'Behavioral', className: 'interview' },
    { key: 'Technical', className: 'interview' },
    { key: 'Final Round', className: 'interview' },
    { key: 'Offer', className: 'offer' },
    { key: 'Rejected', className: 'rejected' },
    { key: 'Ghosted', className: 'rejected' }
  ];

  function formatDate(value) {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }

  function getStatusMeta(status) {
    return statuses.find((entry) => entry.key === status) || statuses[0];
  }

  function isStale(application) {
    const updated = new Date(application.updated_at || application.date_applied || 0);
    const now = new Date();
    const days = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
    return application.status === 'Applied' && days > 14;
  }

  function getStoredApplications() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['applications'], (result) => {
        resolve(Array.isArray(result.applications) ? result.applications : []);
      });
    });
  }

  function saveStoredApplications(applications) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ applications }, () => resolve());
    });
  }

  const JobCard = React.memo(function JobCard({ application, index, onSelect, onDelete, isRemoving }) {
    return React.createElement(
      Draggable,
      { draggableId: application.id, index },
      (provided, snapshot) => React.createElement(
        'article',
        {
          ref: provided.innerRef,
          className: `card${isStale(application) ? ' stale' : ''}${isRemoving ? ' is-removing' : ''}${snapshot.isDragging ? ' is-dragging' : ''}`,
          onClick: () => onSelect(application.id),
          ...provided.draggableProps
        },
        React.createElement(
          'div',
          { className: 'card-header' },
          React.createElement(
            'div',
            { className: 'card-grip-wrap' },
            React.createElement(
              'div',
              {
                className: 'card-drag-handle',
                ...provided.dragHandleProps,
                'aria-label': 'Drag application'
              },
              '⋮⋮'
            ),
            React.createElement(
              'div',
              { className: 'card-heading' },
              React.createElement('h3', null, application.company_name || 'Untitled'),
              React.createElement('p', null, application.job_title || 'Unknown role')
            )
          ),
          React.createElement(
            'div',
            { className: 'card-actions' },
            React.createElement(
              'button',
              {
                className: 'card-delete',
                type: 'button',
                'aria-label': 'Delete application',
                onClick: (event) => {
                  event.stopPropagation();
                  onDelete(application.id);
                }
              },
              '×'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'card-meta' },
          React.createElement('span', { className: `status-pill ${getStatusMeta(application.status).className}` }, application.status),
          React.createElement('span', null, formatDate(application.date_applied))
        ),
        React.createElement(
          'div',
          { className: 'card-meta' },
          React.createElement('span', null, application.location || 'Unknown location'),
          React.createElement('span', null, application.salary_range || 'No salary')
        )
      )
    );
  });

  const KanbanColumn = React.memo(function KanbanColumn({ statusEntry, items, onSelect, onDelete, removingIds }) {
    return React.createElement(
      Droppable,
      { droppableId: statusEntry.key },
      (provided, snapshot) => React.createElement(
        'section',
        {
          className: `board-column${snapshot.isDraggingOver ? ' drag-over' : ''}`,
          'data-status': statusEntry.key,
          ref: provided.innerRef,
          ...provided.droppableProps
        },
        React.createElement(
          'div',
          { className: 'board-column-header' },
          React.createElement('h3', null, statusEntry.key),
          React.createElement('span', { className: 'board-column-count' }, items.length)
        ),
        React.createElement(
          'div',
          { className: 'board-column-body' },
          items.length
            ? items.map((application, index) => React.createElement(JobCard, {
                key: application.id,
                application,
                index,
                onSelect,
                onDelete,
                isRemoving: removingIds.includes(application.id)
              }))
            : React.createElement('div', { className: 'empty-state' }, 'No items in this stage'),
          provided.placeholder
        )
      )
    );
  });

  function DashboardApp() {
    const [applications, setApplications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [theme, setTheme] = useState(() => window.localStorage.getItem('job-tracker-theme') === 'light' ? 'light' : 'dark');
    const [removingIds, setRemovingIds] = useState([]);

    const visibleApps = useMemo(() => {
      const lower = searchTerm.toLowerCase();
      return applications.filter((item) => {
        const haystack = `${item.company_name || ''} ${item.job_title || ''}`.toLowerCase();
        return haystack.includes(lower);
      });
    }, [applications, searchTerm]);

    const selectedApplication = useMemo(() => {
      return applications.find((item) => item.id === activeId) || null;
    }, [activeId, applications]);

    useEffect(() => {
      document.body.classList.toggle('theme-light', theme === 'light');
      document.body.classList.toggle('theme-dark', theme !== 'light');
      window.localStorage.setItem('job-tracker-theme', theme);
    }, [theme]);

    const loadApplications = useCallback(async () => {
      const data = await getStoredApplications();
      setApplications(data);
      if (activeId) {
        const exists = data.some((item) => item.id === activeId);
        if (!exists) {
          setActiveId(null);
          setDrawerOpen(false);
        }
      }
    }, [activeId]);

    useEffect(() => {
      const listener = (changes) => {
        if (changes.applications) {
          loadApplications();
        }
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }, [loadApplications]);

    useEffect(() => {
      loadApplications();
    }, [loadApplications]);

    const handleSelect = useCallback((id) => {
      setActiveId(id);
      setDrawerOpen(true);
    }, []);

    const handleDelete = useCallback(async (id) => {
      if (!window.confirm('Delete this application?')) return;
      if (removingIds.includes(id)) return;
      setRemovingIds((prev) => [...prev, id]);
      setTimeout(async () => {
        try {
          const nextApplications = applications.filter((item) => item.id !== id);
          await saveStoredApplications(nextApplications);
          setApplications(nextApplications);
          if (activeId === id) {
            setActiveId(null);
            setDrawerOpen(false);
          }
        } finally {
          setRemovingIds((prev) => prev.filter((entry) => entry !== id));
        }
      }, 220);
    }, [activeId, applications, removingIds]);

    const handleDragEnd = useCallback(async (result) => {
      if (!result.destination) return;
      const sourceStatus = result.source.droppableId;
      const destinationStatus = result.destination.droppableId;
      if (sourceStatus === destinationStatus) return;

      const application = applications.find((item) => item.id === result.draggableId);
      if (!application) return;

      const nextApplications = applications.map((item) => (item.id === application.id ? { ...item, status: destinationStatus } : item));
      setApplications(nextApplications);
      await saveStoredApplications(nextApplications);
    }, [applications]);

    const handleSave = useCallback(async (event, application) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const updates = Object.fromEntries(formData.entries());
      const next = {
        ...application,
        ...updates,
        updated_at: new Date().toISOString()
      };
      const nextApplications = applications.map((item) => (item.id === next.id ? next : item));
      setApplications(nextApplications);
      await saveStoredApplications(nextApplications);
      setActiveId(next.id);
      setDrawerOpen(true);
    }, [applications]);

    const groupedApplications = useMemo(() => {
      return statuses.map((statusEntry) => ({
        ...statusEntry,
        items: visibleApps.filter((item) => item.status === statusEntry.key)
      }));
    }, [visibleApps]);

    return React.createElement(
      'div',
      { className: 'app-shell' },
      React.createElement(
        'header',
        { className: 'topbar' },
        React.createElement(
          'div',
          { className: 'brand-block' },
          React.createElement('div', { className: 'brand-mark' }, 'JT'),
          React.createElement(
            'div',
            null,
            React.createElement('h1', null, 'Job Tracker'),
            React.createElement('p', null, 'Keep applications moving with a calm, focused view.')
          )
        ),
        React.createElement(
          'div',
          { className: 'topbar-actions' },
          React.createElement(
            'label',
            { className: 'search-field' },
            React.createElement('span', { className: 'sr-only' }, 'Search applications'),
            React.createElement('input', {
              type: 'search',
              placeholder: 'Search company or title',
              value: searchTerm,
              onChange: (event) => setSearchTerm(event.target.value)
            })
          ),
          React.createElement(
            'button',
            { className: 'ghost-button', type: 'button', onClick: () => setTheme(theme === 'light' ? 'dark' : 'light') },
            'Toggle theme'
          ),
          React.createElement(
            'button',
            { className: 'primary-button', type: 'button', onClick: () => loadApplications() },
            'Refresh'
          )
        )
      ),
      React.createElement(
        'main',
        { className: 'dashboard-main' },
        React.createElement(
          'section',
          { className: 'board-panel' },
          React.createElement(
            'div',
            { className: 'board-meta' },
            React.createElement(
              'div',
              null,
              React.createElement('p', { className: 'eyebrow' }, 'Pipeline overview'),
              React.createElement('h2', null, 'Drag cards across each stage to reflect your progress.')
            ),
            React.createElement('div', { className: 'legend' }, React.createElement('span', { className: 'legend-pill' }, 'Stale in Applied'))
          ),
          React.createElement(
            DragDropContext,
            { onDragEnd: handleDragEnd },
            React.createElement(
              'div',
              { className: 'board' },
              groupedApplications.map((statusEntry) => React.createElement(KanbanColumn, {
                key: statusEntry.key,
                statusEntry,
                items: statusEntry.items,
                onSelect: handleSelect,
                onDelete: handleDelete,
                removingIds
              }))
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: `drawer-backdrop${drawerOpen ? '' : ' hidden'}` },
        null
      ),
      React.createElement(
        'aside',
        { className: `detail-drawer${drawerOpen && selectedApplication ? ' open' : ''}`, 'aria-live': 'polite' },
        React.createElement(
          'div',
          { className: 'drawer-header' },
          React.createElement(
            'div',
            null,
            React.createElement('p', { className: 'eyebrow' }, 'Application detail'),
            React.createElement('h2', null, selectedApplication ? selectedApplication.company_name || 'Untitled application' : 'Select an application')
          ),
          React.createElement(
            'button',
            { className: 'icon-button', type: 'button', onClick: () => { setDrawerOpen(false); setActiveId(null); } },
            '×'
          )
        ),
        selectedApplication
          ? React.createElement(
              'div',
              { className: 'detail-panel' },
              React.createElement(
                'div',
                { className: 'detail-panel-header' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('h3', null, selectedApplication.company_name || 'Untitled application'),
                  React.createElement('p', { className: 'drawer-subtitle' }, selectedApplication.job_title || 'Unknown role')
                ),
                React.createElement(
                  'button',
                  { className: 'danger-button', type: 'button', onClick: () => handleDelete(selectedApplication.id) },
                  'Delete'
                )
              ),
              React.createElement(
                'form',
                {
                  className: 'detail-form',
                  onSubmit: (event) => handleSave(event, selectedApplication)
                },
                React.createElement(
                  'label',
                  null,
                  'Company',
                  React.createElement('input', { name: 'company_name', defaultValue: selectedApplication.company_name || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'Job title',
                  React.createElement('input', { name: 'job_title', defaultValue: selectedApplication.job_title || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'Location',
                  React.createElement('input', { name: 'location', defaultValue: selectedApplication.location || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'URL',
                  React.createElement('input', { name: 'post_url', defaultValue: selectedApplication.post_url || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'Status',
                  React.createElement(
                    'select',
                    { name: 'status', defaultValue: selectedApplication.status },
                    statuses.map((status) => React.createElement('option', { key: status.key, value: status.key }, status.key))
                  )
                ),
                React.createElement(
                  'label',
                  null,
                  'Salary range',
                  React.createElement('input', { name: 'salary_range', defaultValue: selectedApplication.salary_range || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'Notes',
                  React.createElement('textarea', { name: 'notes', rows: 5, defaultValue: selectedApplication.notes || '' })
                ),
                React.createElement(
                  'label',
                  null,
                  'Date applied',
                  React.createElement('input', { name: 'date_applied', defaultValue: selectedApplication.date_applied || '' })
                ),
                React.createElement(
                  'div',
                  { className: 'actions' },
                  React.createElement('button', { className: 'primary-button', type: 'submit' }, 'Save changes')
                )
              )
            )
          : React.createElement('div', { className: 'detail-panel' }, React.createElement('div', { className: 'empty-state' }, 'Select an application to edit details.'))
      )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('app-root'));
  root.render(React.createElement(DashboardApp));
})();
