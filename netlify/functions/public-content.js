const {invokeVercel}=require('../adapter');const handler=require('../../api/public-content');exports.handler=(event)=>invokeVercel(handler,event);
