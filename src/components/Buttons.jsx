import { useState } from 'react';
import { Icon } from './Icons';

export const Btn = ({ icon, label, shortcut, color = 'dark', onClick, style = {}, disabled = false }) => {
    const palette = {
        green: ['#188443', '#20a552'],
        blue: ['#263ed7', '#3157ff'],
        blueMid: ['#172d66', '#23429a'],
        purple: ['#4c22b5', '#6636e7'],
        dark: ['#141923', '#1b2230'],
        red: ['#74232a', '#e64b4b'],
    };

    const [bg, bgH] = palette[color] || palette.dark;
    const [hov, setHov] = useState(false);

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                position: 'relative',
                background: disabled ? 'rgba(0,0,0,0.2)' : hov ? bgH : bg,
                color: disabled ? '#666' : '#fff',
                border: 'none',
                borderRadius: 7,
                height: 36,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.13s',
                whiteSpace: 'nowrap',
                lineHeight: 1,
                ...style,
            }}
        >
            {icon && <Icon name={icon} size={13} />}
            {label}
            {shortcut && <span className="btn-shortcut-key">{shortcut}</span>}
        </button>
    );
};

export const MiniBtn = ({ icon, label, color = 'dark', onClick }) => {
    const palette = {
        green: ['#188443', '#20a552'],
        blueMid: ['#172d66', '#23429a'],
        dark: ['#141923', '#1b2230'],
    };

    const [bg, bgH] = palette[color] || palette.dark;
    const [hov, setHov] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: hov ? bgH : bg,
                color: '#ccc',
                border: 'none',
                borderRadius: 7,
                height: 36,
                padding: '0 4px',
                fontSize: 9.5,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.13s',
                lineHeight: 1,
            }}
        >
            <Icon name={icon} size={12} />
            <span>{label}</span>
        </button>
    );
};

export const IconBtn = ({ icon, title, color = 'dark', onClick }) => {
    const palette = {
        green: ['#188443', '#20a552'],
        blue: ['#263ed7', '#3157ff'],
        purple: ['#4c22b5', '#6636e7'],
        dark: ['#141923', '#1b2230'],
        red: ['#74232a', '#e64b4b'],
    };

    const [bg, bgH] = palette[color] || palette.dark;
    const [hov, setHov] = useState(false);

    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: hov ? bgH : bg,
                color: '#ccc',
                border: 'none',
                borderRadius: 7,
                width: 36,
                height: 36,
                cursor: 'pointer',
                transition: 'background 0.13s',
                flexShrink: 0,
            }}
        >
            <Icon name={icon} size={15} />
        </button>
    );
};

export const TopIconBtn = ({ icon, title, color, onClick }) => {
    const colorMap = {
        purple: '#8b5cff',
        red: '#ef4b4b',
        default: '#7f89a8',
    };

    const c = colorMap[color] || colorMap.default;
    const [hov, setHov] = useState(false);

    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: hov ? 'rgba(255,255,255,0.07)' : 'none',
                border: 'none',
                borderRadius: 5,
                width: 22,
                height: 22,
                cursor: 'pointer',
                transition: 'background 0.13s',
                color: hov ? '#fff' : c,
                padding: 0,
            }}
        >
            <Icon name={icon} size={14} color={hov ? '#fff' : c} />
        </button>
    );
};
