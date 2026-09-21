const {invokeVercel}=require('../adapter'); const handler=require('../../api/setup-health'); exports.handler=(event)=>invokeVercel(handler,event);
