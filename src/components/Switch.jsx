import React from 'react';

export default function Switch({ className, disabled, checked, onChange }) {
    return (
        <button
            className={"app-switch dp_ib ps_r" + (checked ? ' app-switch-checked' : '') + (disabled ? ' app-switch-disabled' : '') + (className ? " " + className : '')}
            onClick={() => onChange && onChange(!checked)}
        >
        </button>
    );
}