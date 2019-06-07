import { $ } from '../utils';

var loaderTimer;
var showTimer;
var $dataLoader = document.querySelector('.app-loader');
$dataLoader = $dataLoader ? transEnd($($dataLoader)) : null;

function transEnd($dataLoader) {
    return $dataLoader.on($.fx.transitionEnd, function () {
        if (!$dataLoader.hasClass('show'))
            this.style.display = 'none';
    });
}

var count = 0;

export default {
    showLoader: function () {
        count++;

        if (loaderTimer) {
            clearTimeout(loaderTimer);
            loaderTimer = null;
        }
        if (!showTimer) {
            // 300ms内调用hideLoader则不显示loader
            showTimer = setTimeout(() => {
                if (!$dataLoader) {
                    $dataLoader = transEnd($('<div class="app-loader"></div>').appendTo('body'));
                }
                /* eslint no-unused-expressions:"off" */
                $dataLoader.show()[0].offsetHeight;
                $dataLoader.addClass('show');
                showTimer = null;
            }, 300);
        }
    },
    hideLoader: function (forceHide) {
        if (forceHide) count = 0;
        // 计数器、show和hide必须成对出现
        if (count > 0) {
            count--;
        }
        if (count !== 0) {
            return;
        }
        if (loaderTimer) {
            clearTimeout(loaderTimer);
        }
        if (showTimer) {
            clearTimeout(showTimer);
            showTimer = null;
        }
        loaderTimer = setTimeout(function () {
            $dataLoader && $dataLoader.removeClass('show');
        }, 100);
    }
};