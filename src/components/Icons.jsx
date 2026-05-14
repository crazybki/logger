export const Icon = ({ name, size = 13, color }) => {
    const s = {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        color: color || 'inherit',
    };

    const icons = {
        play: (
            <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.8l8 5.2-8 5.2V2.8z" />
            </svg>
        ),
        pause: (
            <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2.5" width="3" height="11" rx="1" />
                <rect x="10" y="2.5" width="3" height="11" rx="1" />
            </svg>
        ),
        square: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            >
                <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
        ),
        arrowOut: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4 12L12 4M7 4h5v5" />
            </svg>
        ),
        edit: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 11.7V13h1.3l7.4-7.4-1.3-1.3L3 11.7z" />
                <path d="M9.7 3.6l1-1c.4-.4 1-.4 1.4 0l1.3 1.3c.4.4.4 1 0 1.4l-1 1" />
            </svg>
        ),
        switch: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 5h9.5" />
                <path d="M10.5 3L13 5l-2.5 2" />
                <path d="M13 11H3.5" />
                <path d="M5.5 9L3 11l2.5 2" />
            </svg>
        ),
        plus: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
            >
                <path d="M8 2v12M2 8h12" />
            </svg>
        ),
        todo: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M5.5 3.5h7" />
                <path d="M5.5 8h7" />
                <path d="M5.5 12.5h7" />
                <path d="M2.5 3.5l.8.8 1.4-1.6" />
                <path d="M2.5 8l.8.8 1.4-1.6" />
                <path d="M2.5 12.5l.8.8 1.4-1.6" />
            </svg>
        ),
        export: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M8 2v9" />
                <path d="M5 8l3 3 3-3" />
                <path d="M2 13h12" />
            </svg>
        ),
        import: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M8 2v8" />
                <path d="M5 5l3-3 3 3" />
                <path d="M2 13h12" />
            </svg>
        ),
        trash: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M2.5 4.5h11M6 4.5V3h4v1.5M5 4.5l.8 8h4.4l.8-8" />
            </svg>
        ),
        trashCan: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M2.5 4.5h11" />
                <path d="M6 4.5V3.2c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.3" />
                <path d="M4.4 4.5l.6 8.1c.1.7.6 1.2 1.3 1.2h3.4c.7 0 1.2-.5 1.3-1.2l.6-8.1" />
                <path d="M6.9 7v4.1" />
                <path d="M9.1 7v4.1" />
            </svg>
        ),
        restore: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4.5 5.2H2.2V2.9" />
                <path d="M3 5.2A5.7 5.7 0 1 1 2.6 11" />
            </svg>
        ),
        merge: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 4h2.2c1.6 0 2.6.8 3.5 2.1l.6.8" />
                <path d="M3 12h2.2c1.6 0 2.6-.8 3.5-2.1l.6-.8" />
                <path d="M10.5 4H13l-1.5-1.5" />
                <path d="M13 4l-1.5 1.5" />
                <path d="M10.5 12H13l-1.5-1.5" />
                <path d="M13 12l-1.5 1.5" />
            </svg>
        ),
        resetTimer: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4.3 4.8H2.4V2.9" />
                <path d="M3.1 4.8A5.2 5.2 0 1 1 2.9 10" />
                <path d="M8 5.1v3.1l2.2 1.3" />
            </svg>
        ),
        clockReset: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="8" cy="8" r="5" />
                <path d="M8 4.8v3.4l2.2 1.2" />
                <path d="M3.8 4.1H2.2V2.5" />
                <path d="M2.7 4.1A6 6 0 0 1 8 2" />
            </svg>
        ),
        missingTime: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="8" cy="8" r="5.2" />
                <path d="M8 4.8v3.4l2.1 1.3" />
                <path d="M4.8 12.2l-1.4 1.4" />
            </svg>
        ),
        bell: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M4.2 7.2a3.8 3.8 0 1 1 7.6 0c0 2 .7 3 .7 3H3.5s.7-1 .7-3z" />
                <path d="M6.7 12.4a1.5 1.5 0 0 0 2.6 0" />
            </svg>
        ),
        warning: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M8 2.6l6 10.4H2L8 2.6z" />
                <path d="M8 6.2v3.2" />
                <path d="M8 11.8h.01" />
            </svg>
        ),
        settings: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="8" cy="8" r="2.2" />
                <path d="M8 2.2v1.4M8 12.4v1.4M3.9 3.9l1 1M11.1 11.1l1 1M2.2 8h1.4M12.4 8h1.4M3.9 12.1l1-1M11.1 4.9l1-1" />
            </svg>
        ),
        report: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M3 13V3" />
                <path d="M3 13h10" />
                <path d="M5.5 10V7" />
                <path d="M8 10V4.8" />
                <path d="M10.5 10V6" />
            </svg>
        ),
        search: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            >
                <circle cx="6.5" cy="6.5" r="4" />
                <path d="M10.5 10.5l3 3" />
            </svg>
        ),
        monitor: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="#8888aa"
                strokeWidth="1.5"
                strokeLinecap="round"
            >
                <rect x="1.5" y="2" width="13" height="9" rx="1.5" />
                <path d="M5.5 14h5M8 11v3" />
            </svg>
        ),
        star: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="#f5a623"
                stroke="#f5a623"
                strokeWidth="0.5"
            >
                <path d="M8 1.5l1.6 4H14l-3.5 2.6 1.3 4L8 9.7l-3.8 2.4 1.3-4L2 5.5h4.4z" />
            </svg>
        ),
        starOutline: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            >
                <path d="M8 1.8l1.6 3.7H14l-3.5 2.6 1.3 4L8 9.8l-3.8 2.3 1.3-4L2 5.5h4.4z" />
            </svg>
        ),
        dots: (
            <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
            </svg>
        ),
        check: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="#4a9eff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M2.5 8l4 4 7-7" />
            </svg>
        ),
        finish: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="8" cy="8" r="5.5" />
                <path d="M5.5 8l2 2 3-3" />
            </svg>
        ),
        close: (
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
            >
                <path d="M3 3l10 10M13 3L3 13" />
            </svg>
        ),
    };

    return <span style={s}>{icons[name] || null}</span>;
};
