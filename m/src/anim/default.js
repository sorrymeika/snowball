define('anim/def', function () {
    return {
        openEnterZIndex: 2,
        closeEnterZIndex: 1,
        openExitZIndex: 1,
        closeExitZIndex: 3,
        openEnterAnimationFrom: {
            translate: '99%,0%'
        },
        openEnterAnimationTo: {
            translate: '0%,0%'
        },
        openExitAnimationFrom: {
            translate: '0%,0%'
        },
        openExitAnimationTo: {
            translate: '-50%,0%'
        },
        closeEnterAnimationTo: {
            translate: '0%,0%'
        },
        closeEnterAnimationFrom: {
            translate: '-50%,0%'
        },
        closeExitAnimationFrom: {
            translate: '0%,0%'
        },
        closeExitAnimationTo: {
            translate: '100%,0%'
        }
    };
});

define('anim/dialog', function () {
    return {
        openEnterZIndex: 2,
        closeEnterZIndex: 1,
        openExitZIndex: 1,
        closeExitZIndex: 3,
        openEnterAnimationFrom: {
            scale: '.3,.3',
            opacity: 0
        },
        openEnterAnimationTo: {
            scale: '1,1',
            opacity: 1
        },
        openExitAnimationFrom: {
        },
        openExitAnimationTo: {
        },
        closeEnterAnimationFrom: {
            scale: '1,1',
            translate: '0,0'
        },
        closeEnterAnimationTo: {
        },
        closeExitAnimationFrom: {
            scale: '1,1',
            opacity: 1
        },
        closeExitAnimationTo: {
            scale: '.3,.3',
            opacity: 0
        }
    };
});

define('anim/fade', function () {
    return {
        openEnterZIndex: 2,
        closeEnterZIndex: 1,
        openExitZIndex: 1,
        closeExitZIndex: 3,
        openEnterAnimationFrom: {
            opacity: 0
        },
        openEnterAnimationTo: {
            opacity: 1
        },
        openExitAnimationFrom: {
        },
        openExitAnimationTo: {
        },
        closeEnterAnimationFrom: {
            translate: '0,0'
        },
        closeEnterAnimationTo: {
        },
        closeExitAnimationFrom: {
            opacity: 1
        },
        closeExitAnimationTo: {
            opacity: 0
        }
    };
});

define('anim/up', function () {
    return {
        openEnterZIndex: 2,
        closeEnterZIndex: 1,
        openExitZIndex: 1,
        closeExitZIndex: 3,
        openEnterAnimationFrom: {
            translate: '0%,99%'
        },
        openEnterAnimationTo: {
            translate: '0%,0%'
        },
        openExitAnimationFrom: {
            translate: '0%,0%'
        },
        openExitAnimationTo: {
            translate: '0%,0%'
        },
        closeEnterAnimationTo: {
            translate: '0%,0%'
        },
        closeEnterAnimationFrom: {
            translate: '0%,0%'
        },
        closeExitAnimationFrom: {
            translate: '0%,0%'
        },
        closeExitAnimationTo: {
            translate: '0%,100%'
        }
    };
});
