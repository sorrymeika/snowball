/*
    this.model = new model.ViewModel($('<div><div sn-repeat="item in data"><span>{{item.name}}</span><i sn-repeat="p in children">{{p.name}}</i></div></div>'), {
        data: [{
            name: '1234'
        }],
        children: [{
            name: 'aaa'
        }]
    });
    
    this.model = new model.ViewModel($('<div><div sn-repeat="item in data"><span>{{item.name}}</span><i sn-repeat="p in item.children">{{p.name}}</i></div></div>'), {
        data: [{
            name: '1234',
            children: [{
                name: 'aaa'
            }]
        }]
    });
    this.model.$el.appendTo($('body'));
    
    
    var data = {
        data: []
    }
    
    var data1={
        name:'state',
        data:[]
    }

    for (var i = 0; i < 10; i++) {
        data.data.push({
            id: i,
            name: 'adsf' + i,
            src: "http://" + i
        });
        
        data1.data.push({
            id: i,
            name: 'adsf' + i,
            src: "http://" + i
        });
    }

    this.model = new model.ViewModel($(<div>{{$state.name}}</div>), data);
        
    this.model.setState(data1);

    this.model.$el.appendTo($main.html(''));
    return;
*/