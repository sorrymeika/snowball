import { $ } from "../core/dom";

export default class TextCarousel {

    constructor(container, autoLoop = true) {
        this.container = container;
        this.autoLoop = autoLoop;

        if (autoLoop) {
            this.start();
        }
    }

    setContainer(container) {
        if (this.container != container) {
            this.container = container;
        }
        if (this.container) {
            if (this.autoLoop) {
                this.start();
            } else {
                this.stop();
            }
        } else {
            this.stop();
        }
    }

    container;
    start() {
        if (!this.container) return;

        var lis;
        var index = 0;
        var count;
        var loop;
        var setTop = () => {
            lis = this.container.querySelectorAll('li');
            count = lis.length;

            var firstElement = lis[0];

            if (count > 1) {
                index++;
                this.container.style.top = `${-firstElement.offsetHeight * index}px`;
            } else if (index != 0) {
                this.container.style.top = `0px`;
                index = 0;
            }

            loop();
        };

        loop = () => {
            this.timer = setTimeout(setTop, 2500);
        };
        loop();

        var $container = $(this.container)
            .css({ top: 0 })
            .addClass('t_3')
            .on($.fx.transitionEnd, () => {
                if (index >= count - 1) {
                    index = 0;
                    $container.removeClass('t_3');
                    this.container.style.top = `0px`;
                    void this.container.clientHeight;
                    $container.addClass('t_3');
                }
            });
        void this.container.clientHeight;
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }
}
