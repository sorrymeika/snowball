import React from 'react';

export default function LoadingStatusBar({ message, children, className, ...props }) {
    return (
        <div className={"app-load-more flex " + (className || '')} {...props}>
            <div className="bd_b fx_1"></div>
            <p>{message}{children}</p>
            <div className="bd_b fx_1"></div>
        </div>
    );
}
