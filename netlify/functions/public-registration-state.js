const {invokeVercel}=require('../adapter');const handler=require('../../api/public-registration-state');exports.handler=(event)=>invokeVercel(handler,event);
