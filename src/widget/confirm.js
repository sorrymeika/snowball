var $ = require('$');
var vm = require('core/model');

var Confirm = vm.ViewModel.extend({
	el: <div class="cp_mask" style="display:none">
		<div class="cp_confirm" style="height:{{height}}px;margin-top:-{{height/2}}px">
			<div class="cp_confirm_bd" sn-html="{{content}}"></div>
			<div class="cp_confirm_ft"><b sn-if="{{!alwaysOpen}}" class="btn" sn-tap="this.cancel()">取消</b><b class="btn js_confirm"  sn-tap="this.confirm()">确定</b></div>
		</div>
	</div>,
	
	cancel: function(e){
		this.hide();
		var fn=this.get('cancel');
		fn&&fn.call(this,e);
	},
	
	confirm: function(e){
		this.hide();
		var fn=this.get('confirm');
		fn&&fn.call(this,e);
	},
	
	initialize: function() {
		this.listenTo(this.$el,$.fx.transitionEnd,this._hide);
	},
	
	show: function(){
		this.$el.show().addClass('show');
		this.set({
			height: this.$('.cp_confirm')[0].offsetHeight
		});
	},
	_hide: function(){
		!this.$el.hasClass('show')&&this.$el.hide();
	},
	hide: function(){
        if (!this.data.alwaysOpen) {
		  this.$el.removeClass('show');
        }
	}
});

module.exports = Confirm;