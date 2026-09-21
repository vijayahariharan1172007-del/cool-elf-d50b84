const {invokeVercel}=require('../adapter');const handler=require('../../api/public-text-overrides');exports.handler=(event)=>invokeVercel(handler,event);
