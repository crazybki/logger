import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export const PillMenu = ({ onManual, onMiniMode, onExport, onImportTickets, onClearLogs, onTrash, onResetCountdown, onMissingTime, onReports, onSettings, size = 'normal' }) => {
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

    const groups = [
        {
            label: 'View',
            items: [
                { icon: 'arrowOut', title: 'Mini Mode', color: '#8b5cff', action: onMiniMode },
                { icon: 'missingTime', title: 'Missing time', shortcut: 'Alt+M', color: '#ff7676', action: onMissingTime },
                { icon: 'report', title: 'Reports', color: '#43b583', action: onReports },
                { icon: 'settings', title: 'Settings', color: '#a8b0c8', action: onSettings },
            ],
        },
        {
            label: 'Add & data',
            items: [
                { icon: 'plus', title: 'Add Manual', color: '#a8b0c8', action: onManual },
                { icon: 'import', title: 'Import tickets', color: '#5ea1ff', action: onImportTickets },
                { icon: 'export', title: 'Export CSV', color: '#a8b0c8', action: onExport },
            ],
        },
        {
            label: 'Cleanup',
            items: [
                { icon: 'clockReset', title: 'Reset countdown', color: '#5ea1ff', warning: true, action: onResetCountdown },
                { icon: 'resetTimer', title: 'Clear logged tickets', color: '#ff7676', danger: true, action: onClearLogs },
                { icon: 'trashCan', title: 'Trash', color: '#ff7676', danger: true, action: onTrash },
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
