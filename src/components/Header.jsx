import React from 'react';
import { appCtx } from '../app/core/createApplication';

function goBack() {
    appCtx.navigation.back();
};

export default function Header({
    title,
    backgroundColor,
    backgroundImage,
    color,
    back,
    buttons,
    backText,
    className,
    children,
    visible = true
}) {
    if (typeof back == 'string' && !backText) {
        backText = back;
    } else if (back === undefined && process.env.NODE_ENV != "PRELOAD") {
        back = true;
    }

    const style = backgroundColor ? { backgroundColor, borderTopColor: backgroundColor } : {};
    if (color) {
        style.color = color;
    }

    if (backgroundImage) {
        style.backgroundImage = `url(${backgroundImage})`;
        style.backgroundRepeat = 'no-repeat';
    }

    return (
        !visible
            ? null
            : (
                <header
                    style={style}
                    className={"app-header " + (className || '') + (backgroundColor ? " app-header-with-bg" : '') + (back ? ' app-header-has-back' : ' app-header-no-back')}
                >
                    <div className="app-header-left">
                        {
                            back &&
                            <div
                                className="app-header-back flex"
                                onClick={
                                    typeof back == 'function'
                                        ? back
                                        : goBack
                                }
                            >
                                {backText
                                    ? <button className="w_1x h_1x ta_c">{backText}</button>
                                    : <button className="iconfont icon-back bg_0000 h_full pl_s pr_s"></button>}
                            </div>
                        }
                    </div>
                    <div className="app-header-con to_e">
                        {
                            title
                                ? <div className="app-header-title to_e">{title}</div>
                                : null
                        }
                        {
                            children
                        }
                    </div>
                    <div className="app-header-right">
                        {buttons}
                    </div>
                </header>
            )
    );
}