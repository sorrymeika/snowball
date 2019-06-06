import React from 'react';

export default function LoadingStatusBar({ message }) {
    return (
        <div className="app-load-more flex">
            <div className="bd_b fx_1"></div>
            <p>{message}</p>
            <div className="bd_b fx_1"></div>
        </div>
    );
}
