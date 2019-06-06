import React from 'react';

export default function SmallText({ className, text, fontSize = 10 }) {
    return (
        <span className={"ps_r" + (className ? " " + className : '')}>
            <em
                style={{
                    fontSize: fontSize
                }}
            >{text}</em>
            <i className="app-smalltext-fix" style={{
                height: fontSize
            }}>&nbsp;</i>
        </span>
    );
}