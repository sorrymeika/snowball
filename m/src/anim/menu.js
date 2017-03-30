module.exports = {
    openEnterZIndex: 1,
    closeEnterZIndex: 2,
    openExitZIndex: 3,
    closeExitZIndex: 1,

    openEnterAnimationFrom: {
        translate: '-80%,0'
    },
    openEnterAnimationTo: {
        translate: '0,0'
    },
    openExitAnimationFrom: {
        translate: '0,0'
    },
    openExitAnimationTo: {
        translate: '70%,0',
        scale: '.8,.8'
    },
    closeEnterAnimationFrom: {
        translate: '70%,0',
        scale: '.8,.8'
    },
    closeEnterAnimationTo: {
        translate: '0,0',
        scale: '1,1'
    },
    closeExitAnimationFrom: {
        translate: '0,0'
    },
    closeExitAnimationTo: {
        translate: '-80%,0'
    }
};