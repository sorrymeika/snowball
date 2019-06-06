import React from 'react';
import SmallText from './SmallText';

export default function SmallTag({ className, text, fontSize = 10 }) {
    return (
        <span className={"flex" + (className ? " " + className : '')} style={{ fontSize: fontSize }}>
            <SmallText fontSize={fontSize} text={text} />
        </span>
    );
}