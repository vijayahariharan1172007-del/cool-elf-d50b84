const {invokeVercel}=require('../adapter');const handler=require('../../api/public-visual-state');exports.handler=(event)=>invokeVercel(handler,event);
