import React, { useEffect, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { util, $ } from '../snowball';


export default function Modal({ visible, children, animate = 'scale', onCancel }) {
    const maskRef = useRef();
    const wrapperRef = useRef();

    useLayoutEffect(() => {
        if (visible) {
            maskRef.current.style.display = 'block';
            util.reflow(maskRef.current).classList.add('show');

            wrapperRef.current.style.display = 'block';
            util.reflow(wrapperRef.current).classList.add('show');
        } else {
            maskRef.current.classList.remove('show');
            wrapperRef.current.classList.remove('show');
        }
    }, [visible]);

    useEffect(() => {
        const mask = maskRef.current;
        const maskTransitionEnd = () => {
            if (!mask.classList.contains('show')) {
                mask.style.display = 'none';
                mask.classList.remove('did_show');
            } else {
                mask.classList.add('did_show');
            }
        };
        mask.addEventListener($.fx.transitionEnd, maskTransitionEnd, false);

        const wrapper = wrapperRef.current;
        const wrapperTransitionEnd = () => {
            if (!wrapper.classList.contains('show')) {
                wrapper.style.display = 'none';
            }
        };
        wrapper.addEventListener($.fx.transitionEnd, wrapperTransitionEnd, false);

        return () => {
            mask.removeEventListener($.fx.transitionEnd, maskTransitionEnd, false);
            wrapper.removeEventListener($.fx.transitionEnd, wrapperTransitionEnd, false);
        };
    }, []);

    return ReactDOM.createPortal(
        <>
            <div ref={wrapperRef} className={`app-modal app-popup-container app-popup-style-${animate}`}>
                <div className={`app-popup-container-${animate}`}>
                    {children}
                </div>
            </div>
            <div ref={maskRef} className="app-popup-mask" onClick={onCancel}></div>
        </>,
        document.body
    );
}