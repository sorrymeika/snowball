define(function (require,exports,module) {
	var $=require('$'),
		$doc=$(document),
        $el,
        timer;

	function dismiss() {
		var cls=$el.attr('hl-cls');
		clearTimeout(timer);
		$el.removeClass(cls).removeAttr('hl-cls');
		$el=null;
		$doc.off('touchend touchmove touchcancel',dismiss);
	}

	$.fn.highlight=function (className,selector) {
		return this.each(function () {
			var $this=$(this);

			$this.css('-webkit-tap-highlight-color','rgba(255,255,255,0)')
                    .off('touchstart.hl');

			className&&$this.on('touchstart.hl',function (e) {
				var match;

				match=selector?(match=$(e.target).closest(selector,
                        this))&&match.length&&match:$this;

				// selctor可能找不到元素。
				if(match&&match.length) {
					$el=match;
					$el.attr('hl-cls',className);
					timer=setTimeout(function () {
						$el&&$el.addClass(className);
					},100);
					$doc.on('touchend touchmove touchcancel',dismiss);
				}
			});
		});
	};
});
