const {invokeVercel}=require('../adapter');const handler=require('../../api/user-access');exports.handler=(event)=>invokeVercel(handler,event);
