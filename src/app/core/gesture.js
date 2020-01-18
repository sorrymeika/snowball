import { Toucher } from "../../widget";
import { Animation, getTransition } from "../../graphics/animation";

export function bindBackGesture(application) {
    const { rootElement } = application;
    const touch = new Toucher(rootElement, {
        enableVertical: false,
        enableHorizontal: true,
        momentum: false
    });

    touch
        .on('beforestart', function (e) {
            if (application.navigating || touch.triggerGestureEnd || e.touchEvent.touches[0].pageY < 80 || touch.swiper) {
                return false;
            }
            touch.startX = touch.x = 0;
            touch.currentActivity = null;
        })
        .on('start', function (e) {
            var deltaX = touch.deltaX;
            var currentActivity = application.currentActivity;

            if (application.navigating || touch.isDirectionY || !currentActivity) {
                e.preventDefault();
                return;
            }

            if (touch.swiper) {
                return;
            }

            rootElement.classList.add('app-prevent-click');

            touch.width = window.innerWidth;
            touch.minX = touch.width * -1;
            touch.maxX = 0;

            var prevActivity = currentActivity._prev;
            var leftToRight = touch.leftToRight = deltaX < 0;
            var isForward = false;

            if (prevActivity && leftToRight) {
                var anim = getTransition(isForward);

                touch.currentActivity = currentActivity;
                touch.swiper = new Animation([{
                    el: currentActivity.el,
                    start: anim.exitFrom,
                    css: anim.exitTo,
                    ease: 'ease-out'
                }, {
                    el: prevActivity.el,
                    start: anim.enterFrom,
                    css: anim.enterTo,
                    ease: 'ease-out'
                }]);
                const gestureEnd = new Promise((resolve) => {
                    touch.triggerGestureEnd = () => {
                        resolve();
                        touch.triggerGestureEnd = null;
                    };
                });
                application.whenNotNavigating(() => gestureEnd);
            } else {
                touch.swiper = null;
            }
        })
        .on('move', function (e) {
            if (!touch.swiper || application.navigating) return;

            var deltaX = touch.deltaX;

            touch.swiper.progress((touch.leftToRight && deltaX > 0) || (!touch.leftToRight && deltaX < 0)
                ? 0
                : (Math.abs(deltaX) * 100 / touch.width));

            e.preventDefault();
        })
        .on('stop', function () {
            rootElement.classList.remove('app-prevent-click');

            if (!touch.swiper) return;

            var isCancelSwipe = touch.isMoveToLeft === touch.leftToRight || Math.abs(touch.deltaX) <= 10;
            var backUrl = touch.currentActivity && touch.currentActivity._prev && touch.currentActivity._prev.location.url;

            if (isCancelSwipe || !backUrl) {
                touch.swiper.animate(200, 0, touch.triggerGestureEnd);
            } else {
                touch.swiper.animate(300, 100, () => {
                    touch.triggerGestureEnd();
                    application.navigation.back(backUrl, null, false);
                });
            }

            touch.swiper = null;
        });
}