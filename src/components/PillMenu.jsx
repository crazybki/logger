import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export const PillMenu = ({ onManual, onMiniMode, onExport, onImportTickets, onClearLogs, onTrash, onResetCountdown, onMissingTime, onReports, onSettings, onReminderInbox, onEndDay, reminderBadge = 0, language = 'en', size = 'normal' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const iconSize = size === 'small' ? 12 : 14;
    const triggerSize = size === 'small' ? 20 : 22;

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const labels = language === 'en'
        ? {
            view: 'View',
            addData: 'Add & data',
            cleanup: 'Cleanup',
            mini: 'Mini',
            reminders: 'Reminders',
            endDay: 'End day',
            missingTime: 'Missing time',
            reports: 'Reports',
            settings: 'Settings',
            manual: 'Manual time',
            import: 'Import',
            export: 'Export',
            resetCountdown: 'Reset countdown',
            clearLog: 'Clear log',
            trash: 'Trash',
        }
        : {
            view: 'Visning',
            addData: 'Legg til & data',
            cleanup: 'Rydding',
            mini: 'Mini',
            reminders: 'Påminnelser',
            endDay: 'Avslutt dag',
            missingTime: 'Manglende tid',
            reports: 'Rapporter',
            settings: 'Innstillinger',
            manual: 'Manuell tid',
            import: 'Importer',
            export: 'Eksport',
            resetCountdown: 'Nullstill nedtelling',
            clearLog: 'Rydd logg',
            trash: 'Papirkurv',
        };

    const groups = [
        {
            label: labels.view,
            items: [
                { icon: 'arrowOut', title: labels.mini, color: '#8b5cff', action: onMiniMode },
                { icon: 'bell', title: labels.reminders, shortcut: 'Alt+R', color: '#f0a22a', action: onReminderInbox, badge: reminderBadge },
                { icon: 'finish', title: labels.endDay, shortcut: 'Alt+E', color: '#43b583', action: onEndDay },
                { icon: 'missingTime', title: labels.missingTime, shortcut: 'Alt+M', color: '#ff7676', action: onMissingTime },
                { icon: 'report', title: labels.reports, color: '#43b583', action: onReports },
                { icon: 'settings', title: labels.settings, color: '#a8b0c8', action: onSettings },
            ],
        },
        {
            label: labels.addData,
            items: [
                { icon: 'plus', title: labels.manual, color: '#a8b0c8', action: onManual },
                { icon: 'import', title: labels.import, color: '#5ea1ff', action: onImportTickets },
                { icon: 'export', title: labels.export, shortcut: 'Alt+X', color: '#a8b0c8', action: onExport },
            ],
        },
        {
            label: labels.cleanup,
            items: [
                { icon: 'clockReset', title: labels.resetCountdown, color: '#5ea1ff', warning: true, action: onResetCountdown },
                { icon: 'resetTimer', title: labels.clearLog, color: '#ff7676', danger: true, action: onClearLogs },
                { icon: 'trashCan', title: labels.trash, color: '#ff7676', danger: true, action: onTrash },
            ],
        },
    ];

    function handleItemClick(action) {
        action?.();
        setOpen(false);
    }

    return (
        <div ref={ref} className={`pill-menu ${size === 'small' ? 'small' : ''}`}>
            <button
                type="button"
                className={`pill-menu-trigger ${open ? 'open' : ''}`}
                onClick={() => setOpen((value) => !value)}
                title="More actions"
                aria-label="More actions"
                aria-expanded={open}
                style={{ width: triggerSize, height: triggerSize }}
            >
                <Icon name="dots" size={iconSize} color="#7f89a8" />
            </button>

            {open && (
                <div className="pill-menu-popover" role="menu">
                    {groups.map((group) => (
                        <div key={group.label} className="pill-menu-group">
                            <div className="pill-menu-group-label">{group.label}</div>

                            {group.items.map((item) => (
                                <button
                                    key={item.title}
                                    type="button"
                                    className={`pill-menu-item ${item.danger ? 'danger' : ''} ${item.warning ? 'warning' : ''}`}
                                    onClick={() => handleItemClick(item.action)}
                                    role="menuitem"
                                    aria-label={item.shortcut ? `${item.title} (${item.shortcut})` : item.title}
                                >
                                    <span className="pill-menu-item-icon" style={{ color: item.color }}>
                                        <Icon name={item.icon} size={14} />
                                    </span>
                                    <span className="pill-menu-item-label">{item.title}</span>
                                    {item.badge > 0 && <span className="pill-menu-badge">{item.badge}</span>}
                                    {item.shortcut && <span className="pill-menu-shortcut">{item.shortcut}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
