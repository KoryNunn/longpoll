(function () {

    var callbacks = {},
        lastCalled = {},
        currentItems = {},
        maxiumRequestLength = 300000, // 5mins
        eventThrottle = 2000; // 2secs

    function respond(userId, data){
        if(!userId){
            return console.warn(new Error('UserId not provided to long poll.'));
        }

        if(data){
            if(!Array.isArray(data)){
                data = [data];
            }

            for(var i = 0; i < data.length; i++) {
                if(!data[i].timeStamp){
                    data[i].timeStamp = +new Date();
                }
            }

            currentItems[userId] = currentItems[userId] ? currentItems[userId].concat(data) : data;
        }

        if(!lastCalled[userId] || (+new Date() - lastCalled[userId]) < eventThrottle){
                
            if(!lastCalled[userId]){
                lastCalled[userId] = +new Date();
            }

            setTimeout(                
                function() {
                    respond(userId);
                }, 
                eventThrottle / 2
            );
            return;
        }

        if(callbacks[userId] && callbacks[userId].length && currentItems[userId]){

            var userCallbacks = callbacks[userId];
            delete callbacks[userId];

            lastCalled[userId] = +new Date();

            for (var j = 0; j < userCallbacks.length; j++) {
                userCallbacks[j].callback(currentItems[userId]);
            }

            currentItems[userId] = null;
        }
    }
  
    function create(request, response){
        if(!callbacks[request.cookie.userId]){
            callbacks[request.cookie.userId] = [];
        }

        if(callbacks[request.cookie.userId].length >= 5){
            callbacks[request.cookie.userId].shift().callback([]);
        }
            
        callbacks[request.cookie.userId].push(
            {
                created: new Date(),
                callback: function(data){
                    if(response){
                        response.end(JSON.stringify(data));
                    }
                }
            }
        );
    }

    module.exports = {
        respond: respond,
        create: create
    };

    setInterval(
        function() {
            for(var key in callbacks){
                for(var i = callbacks[key].length - 1; i >= 0; i--) {
                    if((+new Date() - callbacks[key][i].created) > maxiumRequestLength) {
                        callbacks[key].splice(i, 1).pop().callback([]);
                    }
                }
            }
        }, 
        maxiumRequestLength / 2
    );
}());