import React from 'react';
import {
    IS_PAJK,
    IS_HRX,
    IS_FROM_IFRAME,
    IS_SHOUXIAN,
    IS_HCZ,
    IS_FROM_TAB,
    IS_JSB,
    IS_SHOW_HEADER,
    APP_ENV,
    IS_CBW
} from '../core/env';
import { $ } from '../core/dom';
import * as appsdk from '../core/appsdk';
import { getActivedPage } from '../core/app';
import { transformTFSImageUrl } from '../utils/tfs';
import { createSpmProps } from '../core/log';

var goBack;

if (IS_SHOUXIAN || IS_HCZ || IS_HRX || IS_CBW) {
    var closeWebViewTimer;
    goBack = () => {
        if (closeWebViewTimer) clearTimeout(closeWebViewTimer);
        closeWebViewTimer = setTimeout(() => {
            try {
                getActivedPage().activity.destroy();
            } catch (e) {
                console.error(e);
            }
            appsdk.exitWebView();
        }, 600);
        history.back();
    };
    $(window).on('hashchange popstate unload', () => {
        if (closeWebViewTimer) {
            clearTimeout(closeWebViewTimer);
            closeWebViewTimer = null;
        }
    });
} else {
    goBack = () => history.back();
}

export default function Header({
    title,
    bgColor,
    bgSrc,
    color,
    back,
    buttons,
    backText,
    className,
    children,
    forceShow = false
}) {
    if (typeof back == 'string' && !backText) {
        backText = back;
    } else if (back === undefined && process.env.NODE_ENV != "SNAPSHOT") {
        back = !IS_PAJK && !IS_JSB;
    }

    const backSpm = process.env.NODE_ENV === "SNAPSHOT" ? {} : createSpmProps('return');

    var style = bgColor ? { backgroundColor: bgColor, borderTopColor: bgColor } : {};
    if (color) {
        style.color = color;
    }

    if (bgSrc) {
        style.backgroundImage = `url(${transformTFSImageUrl(bgSrc)})`;
        style.backgroundRepeat = 'no-repeat';
    }

    return (
        (IS_FROM_IFRAME || !IS_SHOW_HEADER) && !forceShow
            ? null
            : (
                <header
                    style={style}
                    className={"header " + (className || '') + (bgColor ? " header_hasbg" : '')}
                >
                    <div className="header_left">
                        {
                            back && !IS_FROM_TAB &&
                            <div
                                className="header_back"
                                onClick={
                                    typeof back == 'function'
                                        ? back
                                        : goBack
                                }
                                app-track="return_click"
                                app-track-params={JSON.stringify({ channel: APP_ENV })}
                                {...backSpm}
                            >
                                <button className="iconfont icon-back fs_22 bg_0000 h_full pl_s pr_s"></button>
                                {backText || ''}
                            </div>
                        }
                    </div>
                    <div className="header_con to_e">
                        {
                            title
                                ? <div className="header_title to_e">{title}</div>
                                : null
                        }
                        {
                            children
                        }
                    </div>
                    <div className="header_right">
                        {buttons}
                    </div>
                </header>
            )
    );
}